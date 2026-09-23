import { searchPlayers } from "@/actions/community-profile";
import { prisma } from "@/lib/prisma";
import PlayerSearchClient from "@/components/community/PlayerSearchClient";

export const metadata = {
  title: "Comunidad — Buscar Jugadores",
  description: "Encontrá compañeros para jugar en tu club",
};

export default async function JugadoresPage() {
  // Load initial data: players + category levels for filters
  const [initialResult, categoryLevels] = await Promise.all([
    searchPlayers({ limit: 20 }),
    prisma.playerCategoryLevel.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <PlayerSearchClient
      initialPlayers={initialResult.players}
      initialCursor={initialResult.nextCursor}
      categoryLevels={categoryLevels}
    />
  );
}
