'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PushConfig from "@/components/PushConfig";
import { updateSystemSettings } from "@/actions/settings";
import { 
  Building2, Palette, Zap, CreditCard, Smartphone, MessageSquare, 
  Sparkles, CheckCircle2, Shield, Eye, Image as ImageIcon, Check,
  Flame, Moon, Sun, Snowflake, Laptop, Megaphone
} from 'lucide-react';
import type { SystemSetting } from '@prisma/client';
import ClubAnnouncementBoard from '@/components/ClubAnnouncementBoard';

export type ExtendedSettings = SystemSetting & {
  clubLogo?: string;
  splashMode?: 'logo' | 'full_image';
  splashFullImage?: string;
  announcementActive?: boolean;
  announcementBadge?: string;
  announcementTitle?: string;
  announcementText?: string;
  announcementLink?: string;
  announcementLinkText?: string;
  announcementVariant?: string;
};

const THEMES = [
  {
    id: 'cyber-padel',
    name: 'Cyber Padel',
    subtitle: 'Emerald Neon / Dark Onyx',
    icon: Sparkles,
    bgClass: 'bg-[#06090e] border-emerald-500/50 text-white',
    accentColor: '#10b981',
    dotColor: 'bg-emerald-400',
  },
  {
    id: 'sunset-clay',
    name: 'Sunset Clay',
    subtitle: 'Roland Padel / Terracota Cálido',
    icon: Flame,
    bgClass: 'bg-[#140e0c] border-orange-500/50 text-white',
    accentColor: '#ea580c',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'ocean-frost',
    name: 'Ocean Frost',
    subtitle: 'Nordic Midnight / Cyan Glacial',
    icon: Snowflake,
    bgClass: 'bg-[#050d18] border-cyan-500/50 text-white',
    accentColor: '#0284c7',
    dotColor: 'bg-cyan-400',
  },
  {
    id: 'dark',
    name: 'Oscuro Slate',
    subtitle: 'Modo oscuro clásico y sobrio',
    icon: Moon,
    bgClass: 'bg-slate-900 border-slate-700 text-white',
    accentColor: '#10b981',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'light',
    name: 'Claro Minimal',
    subtitle: 'Fondo blanco limpio y nítido',
    icon: Sun,
    bgClass: 'bg-white border-slate-300 text-slate-900',
    accentColor: '#10b981',
    dotColor: 'bg-emerald-500',
  },
];

export default function SettingsForm({ settings }: { settings: ExtendedSettings }) {
    const [initialSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState('identity');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Live preview states
    const [selectedTheme, setSelectedTheme] = useState(initialSettings.theme || 'light');
    const [selectedSplashMode, setSelectedSplashMode] = useState<'logo' | 'full_image'>(
      initialSettings.splashMode || (initialSettings.heroImage ? 'full_image' : 'logo')
    );
    const [logoPreview, setLogoPreview] = useState(initialSettings.clubLogo || initialSettings.splashLogo || '');
    const [splashImagePreview, setSplashImagePreview] = useState(initialSettings.splashFullImage || initialSettings.heroImage || '');
    const [clubNamePreview, setClubNamePreview] = useState(initialSettings.clubName || 'OnlyPadel');
    const [sportEmojiPreview, setSportEmojiPreview] = useState(initialSettings.sportEmoji || '🎾');
    const [primaryColorVal, setPrimaryColorVal] = useState(initialSettings.primaryColor || '#10b981');
    const [secondaryColorVal, setSecondaryColorVal] = useState(initialSettings.secondaryColor || '#0ea5e9');

    // Announcement Board states
    const [announcementActive, setAnnouncementActive] = useState<boolean>(
      initialSettings.announcementActive ?? initialSettings.bubbleActive ?? false
    );
    const [announcementBadge, setAnnouncementBadge] = useState<string>(
      initialSettings.announcementBadge || 'COMUNICADO'
    );
    const [announcementTitle, setAnnouncementTitle] = useState<string>(
      initialSettings.announcementTitle || ''
    );
    const [announcementText, setAnnouncementText] = useState<string>(
      initialSettings.announcementText || initialSettings.bubbleText || ''
    );
    const [announcementLink, setAnnouncementLink] = useState<string>(
      initialSettings.announcementLink || ''
    );
    const [announcementLinkText, setAnnouncementLinkText] = useState<string>(
      initialSettings.announcementLinkText || 'Ver más'
    );
    const [announcementVariant, setAnnouncementVariant] = useState<string>(
      initialSettings.announcementVariant || 'theme'
    );

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setSaved(false);
        
        const formData = new FormData(e.currentTarget);
        
        try {
            const res = await updateSystemSettings(formData);
            if (res?.success !== false) {
              setSaved(true);
              setTimeout(() => setSaved(false), 3000);
            } else {
              alert(res?.error || 'Error al guardar cambios.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Ocurrió un error al guardar los cambios.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'identity', label: 'Identidad del Club', icon: <Building2 className="w-4 h-4" /> },
        { id: 'appearance', label: 'Temas & Apariencia', icon: <Palette className="w-4 h-4" /> },
        { id: 'splash', label: 'Logo & Splash Screen', icon: <Smartphone className="w-4 h-4" /> },
        { id: 'announcement', label: 'Tablón de Anuncios', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'modules', label: 'Módulos & Permisos', icon: <Zap className="w-4 h-4" /> },
        { id: 'payments', label: 'Pagos & Señas', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'whatsapp', label: 'WhatsApp & Mensajes', icon: <MessageSquare className="w-4 h-4" /> },
    ];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
            
            {/* Nav Tabs Lateral */}
            <div className="w-full lg:w-64 shrink-0 space-y-1.5">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                  {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs md:text-sm font-bold rounded-xl transition-all ${
                              isActive 
                              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md shadow-[var(--color-primary)]/20' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                          {tab.icon}
                          <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Previsualización Rápida en Sidebar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hidden lg:block space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Vista Previa Marca
                  </p>
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    {logoPreview && /^(https?:\/\/|\/|data:image\/)/i.test(logoPreview) ? (
                      <Image src={logoPreview} alt="Logo" width={36} height={36} unoptimized className="w-9 h-9 object-contain rounded-lg bg-white p-0.5" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] flex items-center justify-center text-lg font-black">
                        {sportEmojiPreview}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{clubNamePreview}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate capitalize">{selectedTheme}</p>
                    </div>
                  </div>
                </div>
            </div>

            {/* Area de Contenido */}
            <div className="flex-1 space-y-6">
                
                {/* 1. IDENTIDAD DEL CLUB */}
                <div className={activeTab === 'identity' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <Building2 className="w-5 h-5 text-[var(--color-primary)]" /> Información Institucional
                            </CardTitle>
                            <CardDescription>Nombre comercial del club y datos de contacto de administración.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="clubName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Nombre Completo del Club
                                    </Label>
                                    <Input 
                                      id="clubName" 
                                      name="clubName" 
                                      defaultValue={initialSettings.clubName} 
                                      onChange={(e) => setClubNamePreview(e.target.value)}
                                      required 
                                      className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="topbarName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Nombre en Barra Superior / Navbar
                                    </Label>
                                    <Input 
                                      id="topbarName" 
                                      name="topbarName" 
                                      defaultValue={initialSettings.topbarName || ''} 
                                      placeholder="Ej: Pescadores Pádel" 
                                      className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sportEmoji" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Emoji del Deporte
                                    </Label>
                                    <Input 
                                      id="sportEmoji" 
                                      name="sportEmoji" 
                                      defaultValue={initialSettings.sportEmoji} 
                                      onChange={(e) => setSportEmojiPreview(e.target.value)}
                                      className="rounded-xl text-center text-lg"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="contactPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Teléfono Público de Contacto
                                    </Label>
                                    <Input 
                                      id="contactPhone" 
                                      name="contactPhone" 
                                      defaultValue={initialSettings.contactPhone} 
                                      placeholder="Ej: 5491122334455" 
                                      className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1.5">
                                    <Label htmlFor="courtPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Nº Celular para Alertas de Cancha
                                    </Label>
                                    <Input 
                                      id="courtPhone" 
                                      name="courtPhone" 
                                      defaultValue={initialSettings.courtPhone || ''} 
                                      placeholder="Ej: 549..." 
                                      className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="apiPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Nº WhatsApp para Enlace Directo
                                    </Label>
                                    <Input 
                                      id="apiPhone" 
                                      name="apiPhone" 
                                      defaultValue={initialSettings.apiPhone || ''} 
                                      placeholder="Ej: 549..." 
                                      className="rounded-xl"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. TEMAS & APARIENCIA */}
                <div className={activeTab === 'appearance' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <Palette className="w-5 h-5 text-[var(--color-primary)]" /> Selector de Temas Épicos
                            </CardTitle>
                            <CardDescription>
                              Elige una identidad visual predefinida diseñada con contrastes y acentos modernos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Input oculto para el formulario */}
                            <input type="hidden" name="theme" value={selectedTheme} />

                            {/* Tarjetas de Selección de Temas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                              {THEMES.map((th) => {
                                const isCurrent = selectedTheme === th.id;
                                return (
                                  <div
                                    key={th.id}
                                    onClick={() => setSelectedTheme(th.id)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${th.bgClass} ${
                                      isCurrent
                                        ? 'ring-2 ring-[var(--color-primary)] shadow-lg scale-[1.02]'
                                        : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <th.icon className="w-4 h-4" />
                                        <p className="font-black text-sm">{th.name}</p>
                                      </div>
                                      {isCurrent ? (
                                        <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] flex items-center justify-center">
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </span>
                                      ) : (
                                        <span className={`w-3 h-3 rounded-full ${th.dotColor}`}></span>
                                      )}
                                    </div>
                                    <p className="text-[11px] opacity-75 font-medium leading-tight">
                                      {th.subtitle}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Paleta de Colores Personalizada */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Ajuste Fino de Colores (CSS Variables)
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="primaryColor" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Color Primario (Acentos, Botones)
                                      </Label>
                                      <div className="flex gap-2">
                                          <Input 
                                            id="primaryColor" 
                                            name="primaryColor" 
                                            type="color" 
                                            value={primaryColorVal}
                                            onChange={(e) => setPrimaryColorVal(e.target.value)}
                                            className="w-12 p-1 h-10 rounded-xl cursor-pointer" 
                                          />
                                          <Input 
                                            value={primaryColorVal} 
                                            onChange={(e) => setPrimaryColorVal(e.target.value)}
                                            className="h-10 text-xs font-mono rounded-xl" 
                                          />
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="secondaryColor" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Color Secundario (Detalles, Badges)
                                      </Label>
                                      <div className="flex gap-2">
                                          <Input 
                                            id="secondaryColor" 
                                            name="secondaryColor" 
                                            type="color" 
                                            value={secondaryColorVal}
                                            onChange={(e) => setSecondaryColorVal(e.target.value)}
                                            className="w-12 p-1 h-10 rounded-xl cursor-pointer" 
                                          />
                                          <Input 
                                            value={secondaryColorVal} 
                                            onChange={(e) => setSecondaryColorVal(e.target.value)}
                                            className="h-10 text-xs font-mono rounded-xl" 
                                          />
                                      </div>
                                  </div>
                              </div>
                            </div>

                            {/* Layout del Sistema */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <Label htmlFor="appLayout" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Estructura Visual Pública
                                </Label>
                                <select 
                                  id="appLayout" 
                                  name="appLayout" 
                                  defaultValue={initialSettings.appLayout || 'classic'} 
                                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                >
                                    <option value="classic">Clásico (Parrilla moderna de canchas y turnos)</option>
                                    <option value="chat">Asistente Virtual (Flujo conversacional)</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. LOGO & PANTALLA SPLASH */}
                <div className={activeTab === 'splash' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <Smartphone className="w-5 h-5 text-[var(--color-primary)]" /> Logo Institucional & Splash Screen
                            </CardTitle>
                            <CardDescription>
                              Configura el logo oficial y la pantalla de inicio al cargar la app en celulares y computadoras.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* LOGO DEL CLUB */}
                            <div className="space-y-2">
                                <Label htmlFor="clubLogo" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Logo Oficial del Club (URL o ruta de imagen)
                                </Label>
                                <div className="flex gap-2">
                                  <Input 
                                    id="clubLogo" 
                                    name="clubLogo" 
                                    value={logoPreview} 
                                    onChange={(e) => setLogoPreview(e.target.value)}
                                    placeholder="https://ejemplo.com/logo.png o /logo.png" 
                                    className="rounded-xl flex-1"
                                  />
                                  {logoPreview && (
                                    <>
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border flex items-center justify-center shrink-0">
                                        <Image src={logoPreview} alt="Preview" width={32} height={32} unoptimized className="max-w-full max-h-full object-contain" />
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => setLogoPreview('')}
                                        className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-500/20"
                                      >
                                        Quitar
                                      </button>
                                    </>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Se mostrará en la barra superior pública, en el sidebar admin y en la pantalla splash (si está vacío, se usará el emoji {sportEmojiPreview}).
                                </p>
                            </div>

                            {/* MODO DE SPLASH */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Modo de Pantalla Splash
                                </Label>
                                <input type="hidden" name="splashMode" value={selectedSplashMode} />
                                <input type="hidden" name="splashFullImage" value={selectedSplashMode === 'full_image' ? splashImagePreview : ''} />
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Opción 1: Logo Centrado */}
                                  <div 
                                    onClick={() => setSelectedSplashMode('logo')}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                      selectedSplashMode === 'logo'
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-bold text-sm text-slate-900 dark:text-white">Logo & Texto Animado</span>
                                      {selectedSplashMode === 'logo' && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Muestra el logo centrado (o ícono del deporte), nombre del club y saludo sobre fondo oscuro estilizado según el tema.
                                    </p>
                                  </div>

                                  {/* Opción 2: Imagen Completa */}
                                  <div 
                                    onClick={() => setSelectedSplashMode('full_image')}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                      selectedSplashMode === 'full_image'
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-bold text-sm text-slate-900 dark:text-white">Imagen Completa de Portada</span>
                                      {selectedSplashMode === 'full_image' && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Foto en pantalla completa (flyer, foto de las canchas) con degradado oscuro inferior de impacto.
                                    </p>
                                  </div>
                                </div>
                            </div>

                            {/* Campo de Imagen Completa (Solo en Modo Full Image) */}
                            {selectedSplashMode === 'full_image' && (
                              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                                  <Label htmlFor="splashFullImageInput" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    URL de la Imagen Completa de Splash (Full Cover)
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      id="splashFullImageInput" 
                                      value={splashImagePreview} 
                                      onChange={(e) => setSplashImagePreview(e.target.value)}
                                      placeholder="https://ejemplo.com/flyer-padel.jpg" 
                                      className="rounded-xl flex-1"
                                    />
                                    {splashImagePreview && (
                                      <button 
                                        type="button" 
                                        onClick={() => setSplashImagePreview('')}
                                        className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-500/20"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                  {splashImagePreview && (
                                    <div className="h-36 w-full rounded-xl overflow-hidden relative border mt-2">
                                      <Image src={splashImagePreview} alt="Splash Preview" fill unoptimized className="object-cover" />
                                    </div>
                                  )}
                              </div>
                            )}

                            {/* Simulador Visual de Splash */}
                            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                              <span className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Vista Previa del Splash: {selectedSplashMode === 'full_image' ? 'Portada Completa' : 'Logo / Ícono Animado'}
                              </span>
                              {selectedSplashMode === 'full_image' && splashImagePreview ? (
                                <div className="absolute inset-0">
                                  <Image src={splashImagePreview} alt="Preview" fill unoptimized className="object-cover opacity-60" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
                                  <div className="absolute bottom-3 inset-x-0 text-center">
                                    <p className="text-xs font-black text-white">{clubNamePreview}</p>
                                    <p className="text-[10px] text-emerald-400 font-bold">Cargando OnlyPadel...</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center pt-4">
                                  {logoPreview ? (
                                    <Image src={logoPreview} alt="Logo" width={48} height={48} unoptimized className="w-12 h-12 object-contain mb-2 rounded-xl bg-white/10 p-1" />
                                  ) : (
                                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl mb-2 font-bold text-slate-950">
                                      {sportEmojiPreview}
                                    </div>
                                  )}
                                  <p className="text-sm font-black text-white">{clubNamePreview}</p>
                                  <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">¡Bienvenidos al Club!</p>
                                </div>
                              )}
                            </div>

                            {/* Parámetros del Splash */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1.5">
                                    <Label htmlFor="splashName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Título en Pantalla Splash
                                    </Label>
                                    <Input 
                                      id="splashName" 
                                      name="splashName" 
                                      defaultValue={initialSettings.splashName || ''} 
                                      className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="splashDuration" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Duración del Splash (milisegundos)
                                    </Label>
                                    <Input 
                                      id="splashDuration" 
                                      name="splashDuration" 
                                      type="number" 
                                      defaultValue={initialSettings.splashDuration || 1800} 
                                      className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* PWA TOGGLE */}
                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-850">
                                <div>
                                    <Label htmlFor="pwaEnabled" className="text-sm font-bold text-slate-900 dark:text-white">
                                      Habilitar Instalación PWA (App Celular)
                                    </Label>
                                    <p className="text-xs text-slate-500">Permite a los usuarios guardar la app en su pantalla de inicio.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="pwaEnabled" name="pwaEnabled" defaultChecked={initialSettings.pwaEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TABLÓN DE ANUNCIOS & NOVEDADES DEL CLUB */}
                <div className={activeTab === 'announcement' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                                      <Megaphone className="w-5 h-5 text-[var(--color-primary)]" /> Tablón de Anuncios & Novedades
                                    </CardTitle>
                                    <CardDescription>
                                      Publica comunicados, promociones, torneos o avisos importantes para todos los jugadores en la PWA.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
                                    <input 
                                      type="checkbox" 
                                      id="announcementActive" 
                                      name="announcementActive" 
                                      checked={announcementActive} 
                                      onChange={(e) => setAnnouncementActive(e.target.checked)} 
                                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    />
                                    <Label htmlFor="announcementActive" className="text-xs font-bold cursor-pointer text-slate-800 dark:text-slate-200">
                                      Activar Tablón en la App
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            {!announcementActive && (
                              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
                                <span>💡 El tablón se encuentra desactivado. Marca la casilla &quot;Activar Tablón en la App&quot; para mostrar anuncios a los socios en la pantalla de turnos.</span>
                              </div>
                            )}

                            {/* Categoría / Badge */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Categoría o Etiqueta
                                </Label>
                                <input type="hidden" name="announcementBadge" value={announcementBadge} />
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { id: 'COMUNICADO', label: '📢 Comunicado' },
                                    { id: 'TORNEO', label: '🎾 Torneo' },
                                    { id: 'PROMOCIÓN', label: '🔥 Promoción' },
                                    { id: 'AVISO IMPORTANTE', label: '⚠️ Aviso Importante' },
                                    { id: 'BIENVENIDA', label: '👋 Bienvenida' },
                                    { id: 'NOVEDAD', label: '⭐ Novedad' },
                                  ].map(cat => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => setAnnouncementBadge(cat.id)}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                        announcementBadge === cat.id
                                          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md shadow-[var(--color-primary)]/20'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {cat.label}
                                    </button>
                                  ))}
                                </div>
                            </div>

                            {/* Título del Anuncio */}
                            <div className="space-y-1.5">
                                <Label htmlFor="announcementTitle" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Título Destacado
                                </Label>
                                <Input 
                                  id="announcementTitle" 
                                  name="announcementTitle" 
                                  value={announcementTitle} 
                                  onChange={(e) => setAnnouncementTitle(e.target.value)} 
                                  placeholder="Ej: ¡Inscripciones abiertas Torneo de Primavera!" 
                                  className="rounded-xl font-bold" 
                                />
                            </div>

                            {/* Cuerpo / Mensaje */}
                            <div className="space-y-1.5">
                                <Label htmlFor="announcementText" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Mensaje / Descripción del Anuncio
                                </Label>
                                <textarea 
                                  id="announcementText" 
                                  name="announcementText" 
                                  rows={3}
                                  value={announcementText} 
                                  onChange={(e) => setAnnouncementText(e.target.value)} 
                                  placeholder="Escribe aquí las novedades, detalles del torneo, promociones u horarios especiales..." 
                                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs md:text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                                />
                            </div>

                            {/* Estilo Visual / Variante */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Estilo Visual del Anuncio
                                </Label>
                                <input type="hidden" name="announcementVariant" value={announcementVariant} />
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                  {[
                                    { id: 'theme', label: '🎨 Tema Activo', desc: 'Combina con el tema de la PWA' },
                                    { id: 'amber', label: '🔥 Ámbar Cálido', desc: 'Alerta o atención' },
                                    { id: 'emerald', label: '✨ Verde Neón', desc: 'Fresco e impactante' },
                                    { id: 'blue', label: '🌊 Azul Glaciar', desc: 'Institucional' },
                                    { id: 'purple', label: '💜 Violeta Neón', desc: 'Especial y nocturno' },
                                  ].map(variantItem => (
                                    <button
                                      key={variantItem.id}
                                      type="button"
                                      onClick={() => setAnnouncementVariant(variantItem.id)}
                                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                        announcementVariant === variantItem.id
                                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)] shadow-sm'
                                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">{variantItem.label}</span>
                                      <span className="text-[10px] text-slate-400 mt-1">{variantItem.desc}</span>
                                    </button>
                                  ))}
                                </div>
                            </div>

                            {/* Enlace y Botón de Acción Opcional */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1.5">
                                    <Label htmlFor="announcementLink" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Enlace de Acción (opcional)
                                    </Label>
                                    <Input 
                                      id="announcementLink" 
                                      name="announcementLink" 
                                      value={announcementLink} 
                                      onChange={(e) => setAnnouncementLink(e.target.value)} 
                                      placeholder="https://wa.me/... o /torneos" 
                                      className="rounded-xl" 
                                    />
                                    <p className="text-[10px] text-slate-400">Puede ser un link a un torneo, enlace de WhatsApp o web externa.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="announcementLinkText" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Texto del Botón
                                    </Label>
                                    <Input 
                                      id="announcementLinkText" 
                                      name="announcementLinkText" 
                                      value={announcementLinkText} 
                                      onChange={(e) => setAnnouncementLinkText(e.target.value)} 
                                      placeholder="Ej: Ver Torneo, Inscribirme, Más info" 
                                      className="rounded-xl" 
                                    />
                                </div>
                            </div>

                            {/* Simulador Interactivo en Vivo */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Vista Previa en Vivo del Tablón (como se ve en la app)
                                </Label>
                                <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800">
                                  <ClubAnnouncementBoard
                                    active={true}
                                    badge={announcementBadge}
                                    title={announcementTitle || '¡Bienvenidos al Club!'}
                                    text={announcementText || 'Escribe un mensaje para previsualizarlo aquí.'}
                                    link={announcementLink}
                                    linkText={announcementLinkText}
                                    variant={announcementVariant}
                                    isSimulator={true}
                                  />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 5. MODULOS & PERMISOS */}
                <div className={activeTab === 'modules' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <Zap className="w-5 h-5 text-[var(--color-primary)]" /> Módulos y Funcionalidades
                            </CardTitle>
                            <CardDescription>Activa o desactiva funciones globales del club según tu plan y operativa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="reservationsEnabled" className="text-sm font-bold text-slate-900 dark:text-white">Reservas Automáticas Online</Label>
                                    <p className="text-xs text-slate-500">Permite a los jugadores ver horarios libres y reservar en tiempo real.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="reservationsEnabled" name="reservationsEnabled" defaultChecked={initialSettings.reservationsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="whatsappReservations" className="text-sm font-bold text-slate-900 dark:text-white">Reservas por WhatsApp Directo</Label>
                                    <p className="text-xs text-slate-500">Muestra el botón flotante para coordinar turnos con administración.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="whatsappReservations" name="whatsappReservations" defaultChecked={initialSettings.whatsappReservations} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="tournamentsEnabled" className="text-sm font-bold text-slate-900 dark:text-white">Módulo de Torneos</Label>
                                    <p className="text-xs text-slate-500">Habilita la sección de cuadros, llaves, zonas y fixture de torneos.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="tournamentsEnabled" name="tournamentsEnabled" defaultChecked={initialSettings.tournamentsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="rankingsEnabled" className="text-sm font-bold text-slate-900 dark:text-white">Módulo de Rankings</Label>
                                    <p className="text-xs text-slate-500">Publica tablas de posiciones por categoría para jugadores.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="rankingsEnabled" name="rankingsEnabled" defaultChecked={initialSettings.rankingsEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="clientCancellations" className="text-sm font-bold text-slate-900 dark:text-white">Cancelaciones Autónomas por Cliente</Label>
                                    <p className="text-xs text-slate-500">Permite a los usuarios cancelar sus turnos desde la sección &quot;Mis Reservas&quot;.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="clientCancellations" name="clientCancellations" defaultChecked={initialSettings.clientCancellations} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <div>
                                    <Label htmlFor="usersModuleEnabled" className="text-sm font-bold text-slate-900 dark:text-white">Cuentas de Usuarios Registrados</Label>
                                    <p className="text-xs text-slate-500">Permite a los socios iniciar sesión y guardar historial de juego.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="usersModuleEnabled" name="usersModuleEnabled" defaultChecked={initialSettings.usersModuleEnabled} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 5. PAGOS & SEÑAS */}
                <div className={activeTab === 'payments' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <CreditCard className="w-5 h-5 text-[var(--color-primary)]" /> MercadoPago & Políticas de Seña
                            </CardTitle>
                            <CardDescription>Cobro automático de señas online para confirmar turnos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="reservationFee" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      Monto de Seña Requerida ($)
                                    </Label>
                                    <Input 
                                      id="reservationFee" 
                                      name="reservationFee" 
                                      type="number" 
                                      defaultValue={initialSettings.reservationFee} 
                                      required 
                                      className="rounded-xl"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3.5 border rounded-2xl bg-slate-50 dark:bg-slate-850">
                                    <div>
                                      <Label htmlFor="requireDeposit" className="text-xs font-bold">Exigir Seña Obligatoria</Label>
                                      <p className="text-[10px] text-slate-400">Si está inactivo, el turno se reserva sin pago previo.</p>
                                    </div>
                                    <input 
                                      type="checkbox" 
                                      id="requireDeposit" 
                                      name="requireDeposit" 
                                      defaultChecked={initialSettings.requireDeposit} 
                                      className="w-5 h-5 rounded text-[var(--color-primary)]" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <Label htmlFor="mpAccessToken" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  MercadoPago Access Token (Producción)
                                </Label>
                                <Input 
                                  id="mpAccessToken" 
                                  name="mpAccessToken" 
                                  type="password" 
                                  autoComplete="new-password" 
                                  placeholder="Dejar vacío para conservar el token actual" 
                                  className="rounded-xl font-mono text-xs"
                                />
                                <p className="text-[11px] text-slate-400">
                                  Obtén tus credenciales desde el panel de desarrolladores de Mercado Pago.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 6. WHATSAPP & MENSAJES */}
                <div className={activeTab === 'whatsapp' ? 'block space-y-6' : 'hidden'}>
                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                              <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" /> Meta Cloud API & Notificaciones
                            </CardTitle>
                            <CardDescription>Envío automatizado de confirmaciones por WhatsApp.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label htmlFor="whatsappPhoneId" className="text-xs font-bold">WhatsApp Phone ID</Label>
                                  <Input id="whatsappPhoneId" name="whatsappPhoneId" autoComplete="off" placeholder="Dejar vacío para conservar" className="rounded-xl font-mono text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="whatsappVerifyToken" className="text-xs font-bold">WhatsApp Verify Token</Label>
                                  <Input id="whatsappVerifyToken" name="whatsappVerifyToken" type="password" autoComplete="new-password" placeholder="Dejar vacío para conservar" className="rounded-xl font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="whatsappToken" className="text-xs font-bold">WhatsApp Access Token (Meta Cloud)</Label>
                                <Input id="whatsappToken" name="whatsappToken" type="password" autoComplete="new-password" placeholder="Dejar vacío para conservar el actual" className="rounded-xl font-mono text-xs" />
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-850">
                                <div>
                                    <Label htmlFor="autoWhatsapp" className="text-xs font-bold">Envío Automático de Confirmaciones</Label>
                                    <p className="text-[10px] text-slate-400">Envía mensaje instantáneo a cada cliente al confirmar reserva.</p>
                                </div>
                                <input type="checkbox" id="autoWhatsapp" name="autoWhatsapp" defaultChecked={initialSettings.autoWhatsapp} className="w-5 h-5 rounded text-[var(--color-primary)]" />
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-850">
                                <div>
                                    <Label htmlFor="notifyAdmin" className="text-xs font-bold">Notificar al Celular del Club</Label>
                                    <p className="text-[10px] text-slate-400">Recibe una alerta en el teléfono del club ante cada reserva.</p>
                                </div>
                                <input type="checkbox" id="notifyAdmin" name="notifyAdmin" defaultChecked={initialSettings.notifyAdmin} className="w-5 h-5 rounded text-[var(--color-primary)]" />
                            </div>
                        </CardContent>
                    </Card>

                    <PushConfig />
                </div>

                {/* BOTÓN GUARDAR STICKY */}
                <div className="pt-4 flex justify-end sticky bottom-4 z-20">
                    <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isSaving} 
                        className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all ${
                          saved 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30' 
                            : 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-95 shadow-[var(--color-primary)]/30'
                        }`}
                    >
                        {isSaving ? 'Guardando ajustes...' : saved ? '¡Guardado con éxito! ✓' : 'Guardar Todos los Cambios'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
