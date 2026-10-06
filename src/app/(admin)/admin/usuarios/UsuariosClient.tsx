'use client';

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User as UserIcon, Edit, ShieldBan, CheckCircle2, Search, ArrowLeft, CalendarDays, KeyRound, UserPlus, X, AlertCircle, ShieldCheck, Sparkles, PhoneCall, RefreshCw, GitMerge, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateUserAdmin, checkUserDniAdmin, createUserAdmin, findDuplicateUsersAdmin, mergeUserAccountsAdmin, batchNormalizeAllPhonesAdmin } from "@/actions/admin-users";
import { formatPhoneDisplay } from "@/lib/phone";
import { useRouter } from "next/navigation";

type UserData = {
    id: string;
    name: string | null;
    lastName: string | null;
    dni: string | null;
    phone: string | null;
    email: string | null;
    category: string | null;
    isActive: boolean;
    hasPassword?: boolean;
    createdAt: Date;
    _count: { bookings: number };
};

export default function UsuariosClient({ initialUsers }: { initialUsers: UserData[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal Duplicados
    const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
    const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [isNormalizingPhones, setIsNormalizingPhones] = useState(false);

    // Modal Crear Usuario
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createStep, setCreateStep] = useState<'dni' | 'form'>('dni');
    const [createDni, setCreateDni] = useState("");
    const [existingUserFound, setExistingUserFound] = useState<any | null>(null);
    const [isCheckingDni, setIsCheckingDni] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createFormData, setCreateFormData] = useState({
        name: "",
        lastName: "",
        phone: "",
        email: "",
        category: "",
        password: ""
    });

    // Form state for editing
    const [formData, setFormData] = useState({
        name: "",
        lastName: "",
        phone: "",
        category: "",
        isActive: true,
        password: ""
    });

    const openUserDetail = (user: UserData) => {
        setSelectedUser(user);
        setFormData({
            name: user.name || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            category: user.category || "",
            isActive: user.isActive,
            password: ""
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsLoading(true);

        const res = await updateUserAdmin(selectedUser.id, formData);
        
        if (res.success) {
            alert("Usuario actualizado correctamente");
            setUsers(users.map(u => u.id === selectedUser.id ? { 
                ...u, 
                name: formData.name, 
                lastName: formData.lastName, 
                phone: formData.phone,
                category: formData.category,
                isActive: formData.isActive,
                hasPassword: formData.password ? true : u.hasPassword
            } : u));
            
            setSelectedUser(prev => prev ? {
                ...prev,
                name: formData.name, 
                lastName: formData.lastName, 
                phone: formData.phone,
                category: formData.category,
                isActive: formData.isActive,
                hasPassword: formData.password ? true : prev.hasPassword
            } : null);

            setFormData(prev => ({ ...prev, password: "" }));
        } else {
            alert(res.error || "Error al actualizar");
        }
        
        setIsLoading(false);
    };

    // Validación y apertura de formulario de creación
    const handleVerifyDni = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanDni = createDni.trim().replace(/\D/g, '');
        if (cleanDni.length < 5) {
            setCreateError("Ingresá un número de DNI válido.");
            return;
        }

        setIsCheckingDni(true);
        setCreateError(null);
        setExistingUserFound(null);

        const res = await checkUserDniAdmin(cleanDni);
        setIsCheckingDni(false);

        if (res.exists && res.user) {
            setExistingUserFound(res.user);
        } else {
            setCreateStep('form');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createFormData.name || !createFormData.lastName || !createFormData.phone) {
            setCreateError("Completá los campos obligatorios (Nombre, Apellido y Teléfono).");
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        const res = await createUserAdmin({
            dni: createDni.trim(),
            name: createFormData.name,
            lastName: createFormData.lastName,
            phone: createFormData.phone,
            email: createFormData.email,
            category: createFormData.category,
            password: createFormData.password
        });

        setIsCreating(false);

        if (res.success && res.user) {
            const newUser: UserData = {
                id: res.user.id,
                name: res.user.name,
                lastName: res.user.lastName,
                dni: res.user.dni,
                phone: res.user.phone,
                email: res.user.email,
                category: res.user.category,
                isActive: res.user.isActive,
                hasPassword: Boolean(createFormData.password),
                createdAt: new Date(),
                _count: { bookings: 0 }
            };

            setUsers([newUser, ...users]);
            setIsCreateModalOpen(false);
            setCreateStep('dni');
            setCreateDni("");
            setCreateFormData({ name: "", lastName: "", phone: "", email: "", category: "", password: "" });
            alert("¡Jugador creado y registrado en el padrón con éxito!");
            router.refresh();
        } else {
            setCreateError(res.error || "No se pudo crear el usuario.");
        }
    };

    const resetCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreateStep('dni');
        setCreateDni("");
        setExistingUserFound(null);
        setCreateError(null);
        setCreateFormData({ name: "", lastName: "", phone: "", email: "", category: "", password: "" });
    };

    const handleOpenDuplicatesModal = async () => {
        setIsDuplicatesModalOpen(true);
        setIsLoadingDuplicates(true);
        const res = await findDuplicateUsersAdmin();
        if (res.success && res.data) {
            setDuplicateGroups(res.data);
        }
        setIsLoadingDuplicates(false);
    };

    const handleMergeAccounts = async (targetUserId: string, sourceUserIds: string | string[]) => {
        const ids = Array.isArray(sourceUserIds) ? sourceUserIds : [sourceUserIds];
        if (ids.length === 0) return;
        const msg = ids.length > 1
            ? `¿Estás seguro de unificar estas ${ids.length + 1} cuentas en una sola? Todas las reservas, abonos y datos se moverán a la cuenta seleccionada.`
            : '¿Estás seguro de unificar estas dos cuentas? Todas las reservas, abonos y datos se moverán a la cuenta seleccionada.';
        if (!confirm(msg)) return;

        setIsMerging(true);
        try {
            for (const sourceId of ids) {
                const res = await mergeUserAccountsAdmin(targetUserId, sourceId);
                if (!res.success) {
                    alert(res.error || 'Error al unificar cuentas.');
                    setIsMerging(false);
                    return;
                }
            }
            alert('¡Cuentas unificadas con éxito!');
            router.refresh();
            const updated = await findDuplicateUsersAdmin();
            if (updated.success && updated.data) {
                setDuplicateGroups(updated.data);
            }
        } catch (err: any) {
            alert(err.message || 'Error al unificar cuentas.');
        } finally {
            setIsMerging(false);
        }
    };

    const handleBatchNormalizePhones = async () => {
        if (!confirm('¿Normalizar y estandarizar los números de teléfono de todos los jugadores registrados?')) return;
        setIsNormalizingPhones(true);
        const res = await batchNormalizeAllPhonesAdmin();
        if (res.success) {
            alert(`¡Teléfonos normalizados correctamente! Se estandarizaron ${res.updatedCount} números.`);
            router.refresh();
        } else {
            alert(res.error || 'Error al normalizar teléfonos.');
        }
        setIsNormalizingPhones(false);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                (user.name && user.name.toLowerCase().includes(searchLower)) ||
                (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
                (user.dni && user.dni.includes(searchLower)) ||
                (user.phone && user.phone.includes(searchLower));

            const matchesCategory = categoryFilter === "ALL" || user.category === categoryFilter;
            
            let matchesStatus = true;
            if (statusFilter === "ACTIVE") matchesStatus = user.isActive === true;
            if (statusFilter === "BLOCKED") matchesStatus = user.isActive === false;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [users, searchTerm, categoryFilter, statusFilter]);

    if (selectedUser) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            {selectedUser.name} {selectedUser.lastName}
                            {selectedUser.isActive ? 
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Activo</Badge> : 
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none"><ShieldBan className="w-3 h-3 mr-1" /> Bloqueado</Badge>
                            }
                            {selectedUser.hasPassword ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Con Clave</Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Alta Rápida</Badge>
                            )}
                        </h2>
                        <p className="text-slate-500 text-sm">Gestión de cuenta, categoría oficial y seguridad</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Estadísticas Rápidas */}
                    <Card className="md:col-span-1 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-emerald-800 dark:text-emerald-400">Total Reservas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-emerald-950 dark:text-emerald-50">{selectedUser._count.bookings}</div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-blue-800 dark:text-blue-400">Miembro desde</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-blue-950 dark:text-blue-50">
                                {new Date(selectedUser.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-purple-800 dark:text-purple-400">Categoría Actual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-purple-950 dark:text-purple-50">
                                {selectedUser.category || 'Sin Asignar'}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formulario Principal */}
                    <Card className="md:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-blue-500" /> Información Personal y Nivel Deportivo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form id="user-form" onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Apellido</label>
                                        <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">DNI (Identificador)</label>
                                        <input disabled value={selectedUser.dni || ''} className="w-full px-4 py-2 border bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp</label>
                                        <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email (Solo Lectura)</label>
                                        <input disabled value={selectedUser.email || ''} className="w-full px-4 py-2 border bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Categoría Oficial de Juego</label>
                                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-white dark:bg-slate-900 font-bold">
                                            <option value="">Sin Categoría</option>
                                            <option value="8va">8va</option>
                                            <option value="7ma">7ma</option>
                                            <option value="6ta">6ta</option>
                                            <option value="5ta">5ta</option>
                                            <option value="4ta">4ta</option>
                                            <option value="3ra">3ra</option>
                                            <option value="2da">2da</option>
                                            <option value="1ra">1ra</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Formulario Seguridad */}
                    <Card className="md:col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-red-500" /> Clave y Acceso
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Asignar / Cambiar Contraseña</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Nueva contraseña" className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 text-sm" />
                                <p className="text-xs text-slate-500">Dejar en blanco para no modificar su clave actual.</p>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <div>
                                    <p className="font-bold text-sm">Estado de la Cuenta</p>
                                    <p className="text-xs text-slate-500 mt-1">{formData.isActive ? 'El usuario tiene acceso normal al sistema.' : 'El usuario está bloqueado y no puede ingresar.'}</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData({...formData, isActive: !formData.isActive})} 
                                    className={`w-full py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${formData.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                >
                                    {formData.isActive ? <><ShieldBan className="w-4 h-4"/> Bloquear Acceso</> : <><CheckCircle2 className="w-4 h-4"/> Activar Acceso</>}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={() => setSelectedUser(null)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                        Volver a la Lista
                    </button>
                    <button form="user-form" type="submit" disabled={isLoading} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-sm transition-all disabled:opacity-50">
                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-300">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-emerald-500" /> 
                        <CardTitle className="text-xl font-bold">Padrón de Jugadores ({filteredUsers.length})</CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleBatchNormalizePhones}
                            disabled={isNormalizingPhones}
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-xs"
                            title="Limpia y estandariza los números de teléfono para que no haya inconsistencias"
                        >
                            <PhoneCall className={`w-3.5 h-3.5 text-blue-500 ${isNormalizingPhones ? 'animate-spin' : ''}`} />
                            {isNormalizingPhones ? 'Estandarizando...' : 'Estandarizar Teléfonos'}
                        </button>
                        <button
                            onClick={handleOpenDuplicatesModal}
                            className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40 font-bold px-3 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-xs"
                            title="Detectar cuentas con mismo teléfono, email o DNI para fusionarlas"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Unificar Duplicados
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
                        >
                            <UserPlus className="w-4 h-4" /> Crear Jugador
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* FILTROS */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            placeholder="Buscar por nombre, DNI o WhatsApp..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            value={categoryFilter} 
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs font-bold"
                        >
                            <option value="ALL">Todas las Categorías</option>
                            <option value="8va">8va</option>
                            <option value="7ma">7ma</option>
                            <option value="6ta">6ta</option>
                            <option value="5ta">5ta</option>
                            <option value="4ta">4ta</option>
                            <option value="3ra">3ra</option>
                            <option value="2da">2da</option>
                            <option value="1ra">1ra</option>
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs font-bold"
                        >
                            <option value="ALL">Todos los Estados</option>
                            <option value="ACTIVE">Activos</option>
                            <option value="BLOCKED">Bloqueados</option>
                        </select>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold">Jugador</TableHead>
                                <TableHead className="font-bold">WhatsApp</TableHead>
                                <TableHead className="font-bold text-center">Categoría</TableHead>
                                <TableHead className="font-bold text-center">Tipo Registro</TableHead>
                                <TableHead className="font-bold text-center">Reservas</TableHead>
                                <TableHead className="font-bold text-center">Estado</TableHead>
                                <TableHead className="text-right font-bold">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                                            <Search className="w-8 h-8 text-slate-300" />
                                            <p className="font-medium text-slate-500">No se encontraron jugadores con esos filtros.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map(user => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => openUserDetail(user)}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">{user.name} {user.lastName}</span>
                                                <span className="text-xs text-slate-500">DNI: {user.dni || 'Sin DNI'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                    {formatPhoneDisplay(user.phone) || '-'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.category ? (
                                                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-bold">
                                                    {user.category}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Sin Cat</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.hasPassword ? (
                                                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
                                                    Con Clave
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                                                    Alta Rápida
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-bold text-xs">
                                                {user._count.bookings}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.isActive ? 
                                                <div className="flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div> : 
                                                <div className="flex items-center justify-center text-red-600"><ShieldBan className="w-4 h-4" /></div>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openUserDetail(user); }} 
                                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 font-bold rounded-lg transition-colors text-xs"
                                            >
                                                Ver Ficha
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* MODAL CREAR JUGADOR CON VALIDACIÓN PREVIA DE DNI */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-black text-lg text-slate-900 dark:text-white">Nuevo Jugador</h3>
                            </div>
                            <button onClick={resetCreateModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createStep === 'dni' ? (
                            <form onSubmit={handleVerifyDni} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Paso 1: Ingresá el DNI del jugador a registrar
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Ej: 38123456"
                                            value={createDni}
                                            onChange={e => { setCreateDni(e.target.value); setExistingUserFound(null); setCreateError(null); }}
                                            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isCheckingDni || !createDni.trim()}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                                        >
                                            {isCheckingDni ? "Verificando..." : "Verificar DNI"}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">Validaremos si el DNI ya existe en el padrón del club.</p>
                                </div>

                                {existingUserFound && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3">
                                        <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-black">El DNI {existingUserFound.dni} ya está registrado</p>
                                                <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">
                                                    Pertenece a: <strong>{existingUserFound.name} {existingUserFound.lastName}</strong>
                                                    {existingUserFound.phone ? ` • Tel: ${existingUserFound.phone}` : ''}
                                                    {existingUserFound.category ? ` • Cat: ${existingUserFound.category}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreateModalOpen(false);
                                                const u = users.find(x => x.id === existingUserFound.id);
                                                if (u) openUserDetail(u);
                                            }}
                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all"
                                        >
                                            Ver y Editar Ficha de este Jugador
                                        </button>
                                    </div>
                                )}

                                {createError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
                                        ⚠️ {createError}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> DNI {createDni} Disponible
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCreateStep('dni')}
                                        className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold underline"
                                    >
                                        Cambiar DNI
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre *</label>
                                        <input
                                            required
                                            value={createFormData.name}
                                            onChange={e => setCreateFormData({...createFormData, name: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"
                                            placeholder="Ej: Martín"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Apellido *</label>
                                        <input
                                            required
                                            value={createFormData.lastName}
                                            onChange={e => setCreateFormData({...createFormData, lastName: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"
                                            placeholder="Ej: Silva"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp *</label>
                                        <input
                                            required
                                            type="tel"
                                            value={createFormData.phone}
                                            onChange={e => setCreateFormData({...createFormData, phone: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"
                                            placeholder="3329..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Categoría Oficial</label>
                                        <select
                                            value={createFormData.category}
                                            onChange={e => setCreateFormData({...createFormData, category: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm font-bold"
                                        >
                                            <option value="">Sin Categoría</option>
                                            <option value="8va">8va</option>
                                            <option value="7ma">7ma</option>
                                            <option value="6ta">6ta</option>
                                            <option value="5ta">5ta</option>
                                            <option value="4ta">4ta</option>
                                            <option value="3ra">3ra</option>
                                            <option value="2da">2da</option>
                                            <option value="1ra">1ra</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email (Opcional)</label>
                                    <input
                                        type="email"
                                        value={createFormData.email}
                                        onChange={e => setCreateFormData({...createFormData, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"
                                        placeholder="jugador@ejemplo.com"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contraseña Inicial (Opcional)</label>
                                    <input
                                        type="password"
                                        value={createFormData.password}
                                        onChange={e => setCreateFormData({...createFormData, password: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm"
                                        placeholder="Dejar en blanco para alta rápida"
                                    />
                                    <p className="text-[11px] text-slate-400">Si se deja en blanco, el jugador podrá registrar su clave luego.</p>
                                </div>

                                {createError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
                                        ⚠️ {createError}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={resetCreateModal}
                                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-sm transition-all shadow-sm"
                                    >
                                        {isCreating ? "Guardando..." : "Crear y Guardar Jugador"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE UNIFICACIÓN DE CUENTAS DUPLICADAS */}
            {isDuplicatesModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    <GitMerge className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Unificar Cuentas Duplicadas</h3>
                                    <p className="text-xs text-slate-400">Detecta coincidencias por teléfono, email o DNI para fusionar en una única cuenta oficial.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDuplicatesModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {isLoadingDuplicates ? (
                                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                                    <p className="text-xs font-bold">Escaneando padrón de jugadores...</p>
                                </div>
                            ) : duplicateGroups.length === 0 ? (
                                <div className="py-16 text-center space-y-3">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">¡Todo en orden!</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">No se encontraron cuentas duplicadas. Los teléfonos y usuarios están unificados correctamente.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 font-medium">
                                        💡 Se encontraron <strong>{duplicateGroups.length}</strong> grupos de duplicados. Seleccioná qué cuenta querés conservar como <strong>Principal</strong>; todas las reservas, abonos y datos se transferirán automáticamente a ella.
                                    </div>

                                    {duplicateGroups.map((group, gIdx) => (
                                        <div key={gIdx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                                <span>Coincidencia por {group.criterion === 'phone' ? 'Teléfono' : group.criterion === 'email' ? 'Email' : 'DNI'}: <strong className="text-slate-800 dark:text-slate-200 font-mono">{group.matchKey}</strong></span>
                                                <Badge variant="outline" className="text-[10px] font-black">{group.users.length} Cuentas</Badge>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {group.users.map((u: any, uIdx: number) => {
                                                    const otherUsers = group.users.filter((other: any) => other.id !== u.id);
                                                    return (
                                                        <div key={u.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-2">
                                                            <div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                        {u.name} {u.lastName || ''}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                        {u.bookingsCount} turnos
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 space-y-0.5 mt-1">
                                                                    <div>DNI: <span className="font-mono text-slate-700 dark:text-slate-300">{u.dni || 'Sin DNI'}</span></div>
                                                                    <div>Tel: <span className="font-mono text-slate-700 dark:text-slate-300">{formatPhoneDisplay(u.phone) || '-'}</span></div>
                                                                    <div className="truncate">Email: <span className="text-slate-700 dark:text-slate-300">{u.email || '-'}</span></div>
                                                                    <div>Clave: {u.hasPassword ? <span className="text-emerald-500 font-bold">Activa</span> : <span className="text-slate-400">Sin clave</span>}</div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                disabled={isMerging}
                                                                onClick={() => {
                                                                    if (otherUsers.length > 0) {
                                                                        handleMergeAccounts(u.id, otherUsers.map(o => o.id));
                                                                    }
                                                                }}
                                                                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 hover:text-white dark:text-emerald-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                                                            >
                                                                {isMerging ? (
                                                                    <>
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Unificando...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Check className="w-3.5 h-3.5" /> Conservar esta cuenta
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                            <button
                                onClick={() => setIsDuplicatesModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
