"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { server } from "@passwordless-id/webauthn";
import type {
    AuthenticationJSON,
    ExtendedAuthenticatorTransport,
    NamedAlgo,
    RegistrationJSON,
} from "@passwordless-id/webauthn";
import { platformPrisma } from "@/lib/prisma-core";
import { requireTenantFeature } from "@/lib/features";
import { normalizeHostname, resolveTenantContext } from "@/lib/tenant-context";
import { createUserSession, readUserSessionId } from "@/lib/user-session";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const ALLOWED_TRANSPORTS = new Set([
    "ble",
    "hybrid",
    "internal",
    "nfc",
    "smart-card",
    "usb",
] as const);

function parseTransports(value: unknown): ExtendedAuthenticatorTransport[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (item): item is ExtendedAuthenticatorTransport =>
            typeof item === "string" &&
            ALLOWED_TRANSPORTS.has(item as ExtendedAuthenticatorTransport)
    );
}

async function getWebAuthnContext() {
    const tenant = await resolveTenantContext();
    const headerStore = await headers();

    const rawHost = (
        headerStore.get("x-forwarded-host")?.split(",")[0] ||
        headerStore.get("host") ||
        tenant.hostname
    ).trim();

    const rpId = normalizeHostname(rawHost);
    if (!rpId) throw new Error("PASSKEY_HOST_NOT_AVAILABLE");

    const originHeader = headerStore.get("origin");
    if (originHeader) {
        try {
            const parsedOrigin = new URL(originHeader);
            if (normalizeHostname(parsedOrigin.host) === rpId) {
                return {
                    tenant,
                    rpId,
                    origin: `${parsedOrigin.protocol}//${parsedOrigin.host}`,
                };
            }
        } catch {
            // Fall through to proxy-derived origin.
        }
    }

    const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");

    return {
        tenant,
        rpId,
        origin: `${protocol}://${rawHost}`,
    };
}

async function clearExpiredChallenges(tenantId: string) {
    await platformPrisma.passkeyChallenge.deleteMany({
        where: {
            tenantId,
            expiresAt: { lte: new Date() },
        },
    });
}

async function consumeChallenge(
    challengeId: string,
    tenantId: string,
    kind: "REGISTRATION" | "AUTHENTICATION"
) {
    const challenge = await platformPrisma.passkeyChallenge.findFirst({
        where: {
            id: challengeId,
            tenantId,
            kind,
        },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
        if (challenge) {
            await platformPrisma.passkeyChallenge.deleteMany({
                where: { id: challenge.id, tenantId },
            });
        }
        return null;
    }

    // One-time challenge: consume before verification to prevent replay.
    await platformPrisma.passkeyChallenge.deleteMany({
        where: { id: challenge.id, tenantId },
    });

    return challenge;
}

export async function getUserPasskeys() {
    await requireTenantFeature("users");

    const userId = await readUserSessionId();
    if (!userId) return [];

    const tenant = await resolveTenantContext();
    const passkeys = await platformPrisma.userPasskey.findMany({
        where: { tenantId: tenant.id, userId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            authenticatorName: true,
            createdAt: true,
            lastUsedAt: true,
        },
    });

    return passkeys.map((passkey) => ({
        id: passkey.id,
        authenticatorName: passkey.authenticatorName || "Passkey",
        createdAt: passkey.createdAt.toISOString(),
        lastUsedAt: passkey.lastUsedAt?.toISOString() || null,
    }));
}

export async function beginPasskeyRegistration() {
    try {
        await requireTenantFeature("users");

        const userId = await readUserSessionId();
        if (!userId) {
            return { success: false as const, error: "Iniciá sesión para activar el ingreso biométrico." };
        }

        const { tenant, rpId, origin } = await getWebAuthnContext();
        const user = await platformPrisma.user.findFirst({
            where: { id: userId, tenantId: tenant.id, isActive: true },
            select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                dni: true,
                phone: true,
            },
        });

        if (!user) {
            return { success: false as const, error: "No se encontró una cuenta activa." };
        }

        await clearExpiredChallenges(tenant.id);
        const challenge = server.randomChallenge();
        const record = await platformPrisma.passkeyChallenge.create({
            data: {
                tenantId: tenant.id,
                userId: user.id,
                kind: "REGISTRATION",
                challenge,
                origin,
                rpId,
                expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
            },
        });

        const displayName = [user.name, user.lastName].filter(Boolean).join(" ").trim() || "Jugador OnlyPadel";
        const accountName = user.email || user.dni || user.phone || user.id;

        return {
            success: true as const,
            challengeId: record.id,
            challenge,
            rpId,
            user: {
                id: user.id,
                name: accountName,
                displayName,
            },
        };
    } catch (error) {
        console.error("Passkey registration start error:", error);
        return { success: false as const, error: "No se pudo iniciar la activación biométrica." };
    }
}

export async function finishPasskeyRegistration(
    challengeId: string,
    registration: RegistrationJSON
) {
    try {
        await requireTenantFeature("users");

        const userId = await readUserSessionId();
        if (!userId) {
            return { success: false as const, error: "Tu sesión venció. Iniciá sesión nuevamente." };
        }

        const { tenant } = await getWebAuthnContext();
        const challenge = await consumeChallenge(challengeId, tenant.id, "REGISTRATION");

        if (!challenge || challenge.userId !== userId) {
            return { success: false as const, error: "La solicitud venció. Intentá nuevamente." };
        }

        if (registration.user?.id !== userId) {
            return { success: false as const, error: "La credencial no corresponde a tu cuenta." };
        }

        const verified = await server.verifyRegistration(registration, {
            challenge: challenge.challenge,
            origin: challenge.origin,
            domain: challenge.rpId,
            userVerified: true,
        });

        if (verified.user.id !== userId || !verified.userVerified) {
            return { success: false as const, error: "No se pudo verificar la identidad del dispositivo." };
        }

        const existing = await platformPrisma.userPasskey.findFirst({
            where: {
                tenantId: tenant.id,
                credentialId: verified.credential.id,
            },
            select: { id: true, userId: true },
        });

        if (existing && existing.userId !== userId) {
            return { success: false as const, error: "Esta passkey ya pertenece a otra cuenta." };
        }

        const data = {
            publicKey: verified.credential.publicKey,
            algorithm: verified.credential.algorithm,
            transports: verified.credential.transports,
            counter: BigInt(verified.authenticator.counter || 0),
            authenticatorName: verified.authenticator.name || "Passkey",
        };

        if (existing) {
            await platformPrisma.userPasskey.update({
                where: { id: existing.id },
                data,
            });
        } else {
            await platformPrisma.userPasskey.create({
                data: {
                    tenantId: tenant.id,
                    userId,
                    credentialId: verified.credential.id,
                    ...data,
                },
            });
        }

        revalidatePath("/perfil");
        return { success: true as const };
    } catch (error) {
        console.error("Passkey registration finish error:", error);
        return { success: false as const, error: "No se pudo registrar la passkey. Intentá nuevamente." };
    }
}

export async function removePasskey(passkeyId: string) {
    try {
        await requireTenantFeature("users");

        const userId = await readUserSessionId();
        if (!userId) {
            return { success: false as const, error: "Tu sesión venció." };
        }

        const tenant = await resolveTenantContext();
        const result = await platformPrisma.userPasskey.deleteMany({
            where: {
                id: passkeyId,
                tenantId: tenant.id,
                userId,
            },
        });

        if (!result.count) {
            return { success: false as const, error: "No se encontró esa passkey." };
        }

        revalidatePath("/perfil");
        return { success: true as const };
    } catch (error) {
        console.error("Passkey remove error:", error);
        return { success: false as const, error: "No se pudo eliminar la passkey." };
    }
}

export async function beginPasskeyAuthentication() {
    try {
        await requireTenantFeature("users");

        const { tenant, rpId, origin } = await getWebAuthnContext();
        const passkeyCount = await platformPrisma.userPasskey.count({
            where: { tenantId: tenant.id },
        });

        if (!passkeyCount) {
            return {
                success: false as const,
                error: "Todavía no hay accesos biométricos configurados en este club.",
            };
        }

        await clearExpiredChallenges(tenant.id);
        const challenge = server.randomChallenge();
        const record = await platformPrisma.passkeyChallenge.create({
            data: {
                tenantId: tenant.id,
                kind: "AUTHENTICATION",
                challenge,
                origin,
                rpId,
                expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
            },
        });

        return {
            success: true as const,
            challengeId: record.id,
            challenge,
            rpId,
        };
    } catch (error) {
        console.error("Passkey authentication start error:", error);
        return { success: false as const, error: "No se pudo iniciar el ingreso biométrico." };
    }
}

export async function finishPasskeyAuthentication(
    challengeId: string,
    authentication: AuthenticationJSON
) {
    try {
        await requireTenantFeature("users");

        const { tenant } = await getWebAuthnContext();
        const challenge = await consumeChallenge(challengeId, tenant.id, "AUTHENTICATION");

        if (!challenge) {
            return { success: false as const, error: "La solicitud venció. Intentá nuevamente." };
        }

        const passkey = await platformPrisma.userPasskey.findFirst({
            where: {
                tenantId: tenant.id,
                credentialId: authentication.id,
            },
            include: { user: true },
        });

        if (!passkey || !passkey.user.isActive) {
            return { success: false as const, error: "No se encontró una passkey válida para esta cuenta." };
        }

        const verified = await server.verifyAuthentication(
            authentication,
            {
                id: passkey.credentialId,
                publicKey: passkey.publicKey,
                algorithm: passkey.algorithm as NamedAlgo,
                transports: parseTransports(passkey.transports),
            },
            {
                challenge: challenge.challenge,
                origin: challenge.origin,
                domain: challenge.rpId,
                userVerified: true,
                counter: Number(passkey.counter),
            }
        );

        await platformPrisma.userPasskey.update({
            where: { id: passkey.id },
            data: {
                counter: BigInt(verified.counter || 0),
                lastUsedAt: new Date(),
            },
        });

        await createUserSession(passkey.userId);
        revalidatePath("/");

        return { success: true as const };
    } catch (error) {
        console.error("Passkey authentication finish error:", error);
        return { success: false as const, error: "No se pudo validar el acceso biométrico." };
    }
}
