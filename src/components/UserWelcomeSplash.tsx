'use client';

import { skipRegistration } from "@/actions/user-auth";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type UserWelcomeSplashProps = {
    registrationRequired?: boolean;
};

export default function UserWelcomeSplash({ registrationRequired = false }: UserWelcomeSplashProps) {
    const [skipping, setSkipping] = useState(false);

    const handleSkip = async () => {
        if (registrationRequired) return;
        setSkipping(true);
        await skipRegistration();
    };

    return (
        <div className="min-h-screen bg-background flex flex-col md:items-center md:py-8">
            <div className="w-full max-w-md bg-card text-card-foreground min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:border md:border-border relative overflow-hidden flex flex-col items-center justify-center px-7 py-10 text-center">
                <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                <div className="relative w-20 h-20 bg-primary/10 border border-primary/15 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
                    <Users className="w-10 h-10 text-primary" />
                </div>

                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-primary mb-3">
                        <Clock3 className="w-3.5 h-3.5" />
                        Registro rápido
                    </span>

                    <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">
                        Comunidad OnlyPadel
                    </h1>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        Creá tu cuenta para reservar más fácil, guardar tu historial y participar de la comunidad.
                    </p>
                </div>

                <div className="relative mt-7 w-full rounded-2xl border border-border bg-muted/45 p-4 text-left space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/10 p-2 rounded-xl">
                            <CalendarDays className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Historial de turnos</p>
                            <p className="text-[11px] text-muted-foreground">Tus reservas siempre a mano.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500/10 p-2 rounded-xl">
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Torneos y actividad</p>
                            <p className="text-[11px] text-muted-foreground">Conservá tu recorrido como jugador.</p>
                        </div>
                    </div>
                </div>

                <div className="relative mt-5 w-full flex items-start gap-2.5 rounded-2xl bg-primary/8 border border-primary/15 px-4 py-3 text-left">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        <strong className="text-foreground">Te lleva menos de un minuto.</strong>{" "}
                        Solo necesitamos tus datos básicos para crear tu cuenta.
                    </p>
                </div>

                {registrationRequired && (
                    <div className="relative mt-3 w-full flex items-center justify-center gap-2 text-[11px] font-semibold text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        El club requiere una cuenta para realizar reservas.
                    </div>
                )}

                <div className="relative w-full space-y-3 mt-7">
                    <Link
                        href="/registro"
                        className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        Registrarme ahora <ArrowRight className="w-5 h-5" />
                    </Link>

                    {!registrationRequired && (
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={skipping}
                            className="w-full bg-muted text-foreground font-bold py-4 rounded-2xl transition-all hover:opacity-80 active:scale-[0.98] disabled:opacity-60"
                        >
                            {skipping ? 'Cargando...' : 'Saltar y sacar turno'}
                        </button>
                    )}
                </div>

                <div className="relative mt-7">
                    <Link href="/login-usuario" className="text-sm text-primary font-black hover:underline">
                        Ya tengo una cuenta. Iniciar sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
