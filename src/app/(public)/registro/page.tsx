'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkRegistrationDni, registerUser } from '@/actions/user-auth';
import { AlertTriangle, IdCard, Loader2, Lock, Mail, Phone, User, X } from 'lucide-react';
import Link from 'next/link';

export default function RegistroPage() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [dniChecking, setDniChecking] = useState(false);
    const [duplicateDni, setDuplicateDni] = useState('');
    const [duplicateDniOpen, setDuplicateDniOpen] = useState(false);
    const router = useRouter();

    async function handleDniBlur(e: React.FocusEvent<HTMLInputElement>) {
        const value = e.currentTarget.value.trim();
        if (!value) return;

        setDniChecking(true);
        const result = await checkRegistrationDni(value);
        setDniChecking(false);

        if (!result.success) {
            setError(result.error || 'No se pudo verificar el DNI.');
            return;
        }

        if (result.exists) {
            setDuplicateDni(value.replace(/\D/g, '') || value);
            setDuplicateDniOpen(true);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const result = await registerUser(formData);

        if (result.success) {
            router.push('/');
            return;
        }

        if ('code' in result && result.code === 'DNI_EXISTS') {
            const value = String(formData.get('dni') || '').trim();
            setDuplicateDni(value.replace(/\D/g, '') || value);
            setDuplicateDniOpen(true);
        } else {
            setError(result.error || 'Error al registrar.');
        }

        setLoading(false);
    }

    const inputClass =
        'w-full p-3 bg-muted/50 text-foreground placeholder:text-muted-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors';

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-card text-card-foreground rounded-3xl shadow-xl border border-border p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black text-foreground">Únete a la Comunidad</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-2">Crea tu cuenta para llevar tu historial</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl text-sm font-bold text-center">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">Nombre</label>
                            <input type="text" name="name" required className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">Apellido</label>
                            <input type="text" name="lastName" required className={inputClass} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="registration-dni" className="text-xs font-bold text-foreground flex items-center gap-2">
                            <IdCard className="w-4 h-4 text-muted-foreground" /> DNI
                        </label>
                        <div className="relative">
                            <input
                                id="registration-dni"
                                type="text"
                                name="dni"
                                inputMode="numeric"
                                required
                                placeholder="Sin puntos ni espacios"
                                onBlur={handleDniBlur}
                                className={`${inputClass} pr-10`}
                            />
                            {dniChecking && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Al salir del campo verificaremos si el DNI ya está registrado.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono
                        </label>
                        <input type="tel" name="phone" required placeholder="Ej: 341..." className={inputClass} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" /> Email <span className="text-muted-foreground font-normal">(Opcional)</span>
                        </label>
                        <input type="email" name="email" className={inputClass} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-2">
                            <span className="text-amber-500">🏆</span> Categoría de Juego <span className="text-destructive">*</span>
                        </label>
                        <select
                            name="category"
                            required
                            defaultValue=""
                            className={`${inputClass} font-bold`}
                        >
                            <option value="" disabled>Selecciona tu categoría oficial...</option>
                            <option value="8va">8va (Iniciación / Principiante)</option>
                            <option value="7ma">7ma (Intermedio Inicial)</option>
                            <option value="6ta">6ta (Intermedio)</option>
                            <option value="5ta">5ta (Intermedio Alto)</option>
                            <option value="4ta">4ta (Avanzado)</option>
                            <option value="3ra">3ra (Competitivo)</option>
                            <option value="2da">2da (Semi-Profesional)</option>
                            <option value="1ra">1ra (Profesional / Elite)</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground">La categoría es obligatoria para tu perfil y participación en torneos oficiales.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Lock className="w-4 h-4 text-muted-foreground" /> Contraseña
                        </label>
                        <input type="password" name="password" required placeholder="Crea una contraseña" className={inputClass} />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || dniChecking}
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl transition-all hover:opacity-90 active:scale-95 flex items-center justify-center mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registrando...</> : 'Registrarme'}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login-usuario" className="text-primary font-bold hover:underline">
                                Iniciar Sesión
                            </Link>
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            <Link href="/" className="font-medium hover:underline">
                                Volver al Inicio
                            </Link>
                        </p>
                    </div>
                </form>
            </div>

            {duplicateDniOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="duplicate-dni-title"
                    onMouseDown={() => setDuplicateDniOpen(false)}
                >
                    <div
                        className="relative w-full max-w-sm rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-2xl"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setDuplicateDniOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Cerrar aviso"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <h2 id="duplicate-dni-title" className="text-xl font-black text-foreground">
                            Este DNI ya está registrado
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {duplicateDni ? <>El DNI <strong className="text-foreground">{duplicateDni}</strong> ya existe en OnlyPadel. </> : null}
                            Ingresá con tu cuenta o recuperá tu contraseña para continuar.
                        </p>

                        <div className="mt-6 space-y-3">
                            <Link
                                href="/login-usuario"
                                className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-all hover:opacity-90"
                            >
                                Ingresar
                            </Link>
                            <Link
                                href="/recuperar-clave"
                                className="flex w-full items-center justify-center rounded-xl border border-border bg-muted/50 px-4 py-3 font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                Recuperar contraseña
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDuplicateDniOpen(false)}
                                className="w-full py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Usar otro DNI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
