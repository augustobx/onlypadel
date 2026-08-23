import { prisma } from "@/lib/prisma";
import UsuariosClient from "./UsuariosClient";

export default async function AdminUsuariosPage() {
    const rawUsers = await prisma.user.findMany({
        where: { 
            role: "PLAYER",
        },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { bookings: true }
            }
        }
    });

    const users = rawUsers.map(u => ({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        dni: u.dni,
        phone: u.phone,
        email: u.email,
        category: u.category,
        isActive: u.isActive,
        createdAt: u.createdAt,
        hasPassword: Boolean(u.password),
        _count: u._count
    }));

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Padrón de Jugadores</h1>
                <p className="text-gray-500 dark:text-slate-400">Gestión de jugadores y usuarios de la comunidad T-Padel.</p>
            </div>

            <UsuariosClient initialUsers={users} />
        </div>
    );
}
