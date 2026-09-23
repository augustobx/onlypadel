import { getOpenMatches } from "@/actions/community-matches";
import { getUserSession } from "@/actions/user-auth";
import OpenMatchesClient from "@/components/community/OpenMatchesClient";

export const metadata = {
  title: "Turnos Armados — Comunidad OnlyPadel",
  description: "Búsqueda y convocatoria de compañeros para turnos ya reservados.",
};

export default async function TurnosArmadosPage() {
  const [session, { matches }] = await Promise.all([
    getUserSession(),
    getOpenMatches(),
  ]);

  return (
    <OpenMatchesClient
      initialMatches={matches}
      currentUserId={session?.id || null}
    />
  );
}
