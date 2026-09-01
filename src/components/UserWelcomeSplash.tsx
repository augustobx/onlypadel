'use client';

import { skipRegistration } from "@/actions/user-auth";
import { Users, ArrowRight, CalendarDays, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function UserWelcomeSplash() {
    const [skipping, setSkipping] = useState(false);

    const handleSkip = async () => {
        setSkipping(true);
        await skipRegistration();
        // The page will revalidate and reload automatically
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:items-center md:py-8">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-blue-500" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    Comunidad OnlyPadel
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
                    Únete para llevar tu historial y acceder a beneficios exclusivos.
                </p>

                <div className="space-y-4 mb-10 w-full text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                            <CalendarDays className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Historial de Turnos</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Registro de Torneos Jugados</p>
                    </div>
                </div>

                <div className="w-full space-y-4">
                    <Link href="/registro" className="block">
                        <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
                            Registrarme ahora <ArrowRight className="w-5 h-5" />
                        </button>
                    </Link>
                    
                    <button 
                        onClick={handleSkip} 
                        disabled={skipping}
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                    >
                        {skipping ? 'Cargando...' : 'Saltar y sacar turno'}
                    </button>
                </div>

                <div className="mt-8">
                    <Link href="/login-usuario" className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline">
                        Ya tengo una cuenta. Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
