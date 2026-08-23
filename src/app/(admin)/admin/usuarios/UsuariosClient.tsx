'use client';

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User as UserIcon, Edit, ShieldBan, CheckCircle2, Search, ArrowLeft, CalendarDays, KeyRound, UserPlus, X, AlertCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateUserAdmin, checkUserDniAdmin, createUserAdmin } from "@/actions/admin-users";
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
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
                    >
                        <UserPlus className="w-4 h-4" /> Crear Jugador
                    </button>
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
                                                <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{user.phone || '-'}</span>
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
        </Card>
    );
}
