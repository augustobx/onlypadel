'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PushConfig from "@/components/PushConfig";
import { updateSystemSettings } from "@/actions/settings";
import { Settings, Palette, Zap, CreditCard, Smartphone, Users } from 'lucide-react';
import type { SystemSetting } from '@prisma/client';

export default function SettingsForm({ settings }: { settings: SystemSetting }) {
    const [initialSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setSaved(false);
        
        const formData = new FormData(e.currentTarget);
        
        try {
            await updateSystemSettings(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000); // Reset success state after 3s
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Ocurrió un error al guardar los cambios.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
        { id: 'design', label: 'Apariencia y Layout', icon: <Palette className="w-4 h-4" /> },
        { id: 'modules', label: 'Módulos y Permisos', icon: <Zap className="w-4 h-4" /> },
        { id: 'payments', label: 'Pagos y Alertas', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'users', label: 'Seguridad y Usuarios', icon: <Users className="w-4 h-4" /> },
        { id: 'pwa', label: 'PWA y Splash', icon: <Smartphone className="w-4 h-4" /> },
    ];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
            
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 shrink-0 space-y-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                            activeTab === tab.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
                
                {/* GENERAL */}
                <div className={activeTab === 'general' ? 'block' : 'hidden'}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Información General</CardTitle>
                            <CardDescription>Datos básicos y teléfonos de contacto.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clubName">Nombre (Meta/Correos)</Label>
                                    <Input id="clubName" name="clubName" defaultValue={initialSettings.clubName} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="topbarName">Nombre (Barra Superior)</Label>
                                    <Input id="topbarName" name="topbarName" defaultValue={initialSettings.topbarName || ''} placeholder="Ej: T-Padel" />
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <Label htmlFor="contactPhone">Teléfono Público (Contacto general)</Label>
                                <Input id="contactPhone" name="contactPhone" defaultValue={initialSettings.contactPhone} placeholder="Ej: 549..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="courtPhone">Nº Cancha (Recibe Alertas)</Label>
                                    <Input id="courtPhone" name="courtPhone" defaultValue={initialSettings.courtPhone || ''} placeholder="Ej: 549..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apiPhone">Nº API (Botón WhatsApp)</Label>
                                    <Input id="apiPhone" name="apiPhone" defaultValue={initialSettings.apiPhone || ''} placeholder="Ej: 549..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* DISEÑO */}
                <div className={activeTab === 'design' ? 'block space-y-6' : 'hidden'}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Apariencia y Layout</CardTitle>
                            <CardDescription>Colores y estructura de la plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sportEmoji">Emoji del Deporte</Label>
                                    <Input id="sportEmoji" name="sportEmoji" defaultValue={initialSettings.sportEmoji} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="theme">Tema (Modo Oscuro/Claro)</Label>
                                    <select id="theme" name="theme" defaultValue={initialSettings.theme} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                                        <option value="light">Claro</option>
                                        <option value="dark">Oscuro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <Label htmlFor="appLayout">Estructura del Sistema (Layout)</Label>
                                <select id="appLayout" name="appLayout" defaultValue={initialSettings.appLayout || 'classic'} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                                    <option value="classic">Clásico (Original)</option>
                                    <option value="chat">Asistente Virtual (Chat Bot)</option>
                                </select>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <Label htmlFor="heroImage">Fondo Asistente Virtual (Hero Image)</Label>
                                <Input id="heroImage" name="heroImage" defaultValue={initialSettings.heroImage || ''} placeholder="https://ejemplo.com/mifondo.jpg" />
                                <p className="text-xs text-gray-500">Deja en blanco para fondo liso.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryColor">Color Primario</Label>
                                    <div className="flex gap-2">
                                        <Input id="primaryColor" name="primaryColor" type="color" defaultValue={initialSettings.primaryColor || '#10b981'} className="w-12 p-1 h-10" />
                                        <Input defaultValue={initialSettings.primaryColor || '#10b981'} disabled className="h-10 text-xs font-mono" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                                    <div className="flex gap-2">
                                        <Input id="secondaryColor" name="secondaryColor" type="color" defaultValue={initialSettings.secondaryColor || '#0ea5e9'} className="w-12 p-1 h-10" />
                                        <Input defaultValue={initialSettings.secondaryColor || '#0ea5e9'} disabled className="h-10 text-xs font-mono" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Burbuja Flotante</CardTitle>
                            <CardDescription>Aviso promocional.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label htmlFor="bubbleActive">Activar Burbuja</Label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="bubbleActive" name="bubbleActive" defaultChecked={initialSettings.bubbleActive} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bubbleText">Mensaje a mostrar</Label>
                                <Input id="bubbleText" name="bubbleText" defaultValue={initialSettings.bubbleText} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bubbleColor">Color del Fondo</Label>
                                    <Input id="bubbleColor" name="bubbleColor" type="color" defaultValue={initialSettings.bubbleColor} className="w-12 p-1 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bubbleDuration">Duración (ms)</Label>
                                    <Input id="bubbleDuration" name="bubbleDuration" type="number" defaultValue={initialSettings.bubbleDuration} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MODULOS */}
                <div className={activeTab === 'modules' ? 'block' : 'hidden'}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Módulos Activos</CardTitle>
                            <CardDescription>Enciende y apaga funciones globales.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="reservationsEnabled" className="text-base">Reservas Automáticas</Label>
                                    <p className="text-xs text-gray-500">Si lo apagas, detiene las reservas por sistema.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="reservationsEnabled" name="reservationsEnabled" defaultChecked={initialSettings.reservationsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="whatsappReservations" className="text-base">Reservas Manuales (WhatsApp)</Label>
                                    <p className="text-xs text-gray-500">Muestra el botón de charlar con administración.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="whatsappReservations" name="whatsappReservations" defaultChecked={initialSettings.whatsappReservations} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="tournamentsEnabled" className="text-base">Módulo de Torneos</Label>
                                    <p className="text-xs text-gray-500">Muestra información de competiciones activas.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="tournamentsEnabled" name="tournamentsEnabled" defaultChecked={initialSettings.tournamentsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="rankingsEnabled" className="text-base">Módulo de Rankings</Label>
                                    <p className="text-xs text-gray-500">Publica las tablas por categoría para visitantes y usuarios.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="rankingsEnabled" name="rankingsEnabled" defaultChecked={initialSettings.rankingsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="clientCancellations" className="text-base">Cancelaciones de Clientes (Bot)</Label>
                                    <p className="text-xs text-gray-500">Permite a los usuarios cancelar sus turnos desde &quot;Ver mis reservas&quot;.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="clientCancellations" name="clientCancellations" defaultChecked={initialSettings.clientCancellations} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* PAGOS */}
                <div className={activeTab === 'payments' ? 'block space-y-6' : 'hidden'}>
                    <PushConfig />
                    <Card>
                        <CardHeader>
                            <CardTitle>MercadoPago & Notificaciones</CardTitle>
                            <CardDescription>Credenciales de API.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reservationFee">Costo Seña ($)</Label>
                                    <Input id="reservationFee" name="reservationFee" type="number" defaultValue={initialSettings.reservationFee} required />
                                </div>
                                <div className="space-y-2 pt-8">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="requireDeposit" name="requireDeposit" defaultChecked={initialSettings.requireDeposit} className="w-4 h-4 rounded border-gray-300" />
                                        <span className="text-sm font-medium">Requerir Seña Activa</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mpAccessToken">MercadoPago Access Token</Label>
                                <Input id="mpAccessToken" name="mpAccessToken" type="password" defaultValue={initialSettings.mpAccessToken} />
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50/50 mt-4">
                                <div>
                                    <Label htmlFor="autoWhatsapp" className="text-base">Envío Auto a API Meta</Label>
                                    <p className="text-xs text-gray-500">Desactiva si tienes problemas con tu token de Meta.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="autoWhatsapp" name="autoWhatsapp" defaultChecked={initialSettings.autoWhatsapp} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50/50 mt-2">
                                <div>
                                    <Label htmlFor="notifyAdmin" className="text-base">Notificar al Celular del Club</Label>
                                    <p className="text-xs text-gray-500">Enviar aviso por cada nueva reserva.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="notifyAdmin" name="notifyAdmin" defaultChecked={initialSettings.notifyAdmin} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* USUARIOS Y SEGURIDAD */}
                <div className={activeTab === 'users' ? 'block space-y-6' : 'hidden'}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Seguridad Panel Admin</CardTitle>
                            <CardDescription>Tus accesos para esta página.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adminUser">Usuario</Label>
                                    <Input id="adminUser" name="adminUser" defaultValue={initialSettings.adminUser} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminPass">Contraseña</Label>
                                    <Input id="adminPass" name="adminPass" type="password" autoComplete="new-password" placeholder="Dejar vacío para mantener la actual" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Módulo de Usuarios Web</CardTitle>
                            <CardDescription>Cuentas de jugadores en el club.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="usersModuleEnabled" className="text-base">Activar Cuentas de Cliente</Label>
                                    <p className="text-xs text-gray-500">Inicia sesión y ver historial.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="usersModuleEnabled" name="usersModuleEnabled" defaultChecked={initialSettings.usersModuleEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl">
                                <div>
                                    <Label htmlFor="requireDepositForRegistered" className="text-base">Exigir seña a Usuarios Registrados</Label>
                                    <p className="text-xs text-gray-500">Premia a los registrados no pidiendo seña (OFF).</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="requireDepositForRegistered" name="requireDepositForRegistered" defaultChecked={initialSettings.requireDepositForRegistered} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* PWA */}
                <div className={activeTab === 'pwa' ? 'block' : 'hidden'}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Aplicación PWA</CardTitle>
                            <CardDescription>Icono y pantalla de carga del celular.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50/50">
                                <div>
                                    <Label htmlFor="pwaEnabled" className="text-base">Instalación PWA</Label>
                                    <p className="text-xs text-gray-500">Permitir instalar como App en celular.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="pwaEnabled" name="pwaEnabled" defaultChecked={initialSettings.pwaEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="splashName">Nombre en Pantalla</Label>
                                    <Input id="splashName" name="splashName" defaultValue={initialSettings.splashName || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="splashLogo">Logo URL</Label>
                                    <Input id="splashLogo" name="splashLogo" defaultValue={initialSettings.splashLogo || ''} placeholder="/logo.png" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="splashDuration">Duración (ms)</Label>
                                    <Input id="splashDuration" name="splashDuration" type="number" defaultValue={initialSettings.splashDuration} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-6 flex justify-end sticky bottom-4">
                    <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isSaving} 
                        className={`w-full md:w-auto shadow-lg shadow-blue-500/30 transition-all ${saved ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30' : ''}`}
                    >
                        {isSaving ? 'Guardando...' : saved ? '¡Guardado con éxito! ✓' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
