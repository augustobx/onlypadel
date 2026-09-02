'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Coffee, ShoppingCart, Plus, Minus, Trash2, Search, 
  DollarSign, CheckCircle2, Clock, User, Sparkles, X, Edit2, Loader2, ArrowRight,
  FileText
} from 'lucide-react';
import { 
  getPosProducts, savePosProduct, deletePosProduct, 
  recordPosSale, getPosSales, PosProduct, PosCartItem, PosSale 
} from '@/actions/pos';
import { searchUsersForPos } from '@/actions/current-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CantinaPage() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos del cobro en mostrador
  const [customerName, setCustomerName] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    phone?: string | null;
    dni?: string | null;
    balance: number;
  } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CUENTA_CORRIENTE'>('CASH');
  const [saleSuccessMessage, setSaleSuccessMessage] = useState('');

  // Modal para agregar o editar producto
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    category: 'BEBIDAS' | 'EQUIPAMIENTO' | 'SNACKS' | 'OTROS';
    price: number;
    icon: string;
  }>({
    name: '',
    category: 'BEBIDAS',
    price: 1500,
    icon: '🥤',
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [prodRes, salesRes] = await Promise.all([
      getPosProducts(),
      getPosSales(todayStr)
    ]);
    if (prodRes.success && prodRes.data) setProducts(prodRes.data);
    if (salesRes.success && salesRes.data) setSales(salesRes.data);
    setLoading(false);
  };

  // Carrito helpers
  const addToCart = (product: PosProduct) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as PosCartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Búsqueda de socios registrados
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    const res = await searchUsersForPos(query);
    if (res.success) {
      setUserSearchResults(res.data);
    }
    setIsSearchingUsers(false);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setCustomerName(user.name);
    setUserSearchOpen(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setCustomerName('');
    if (paymentMethod === 'CUENTA_CORRIENTE') {
      setPaymentMethod('CASH');
    }
  };

  const clearCart = () => {
    setCart([]);
    clearSelectedUser();
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Cobrar Ticket
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'CUENTA_CORRIENTE' && !selectedUser) {
      alert('Para fiar a Cuenta Corriente debés seleccionar un socio registrado.');
      setUserSearchOpen(true);
      return;
    }

    setSubmitting(true);

    const items = cart.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
    }));

    const res = await recordPosSale({
      items,
      totalAmount: cartTotal,
      paymentMethod,
      customerName: selectedUser ? selectedUser.name : (customerName.trim() || 'Consumidor Final'),
      userId: selectedUser?.id,
    });

    if (res.success && res.data) {
      setSales(prev => [res.data!, ...prev]);
      setSaleSuccessMessage(
        paymentMethod === 'CUENTA_CORRIENTE'
          ? `¡Cargado a la Cuenta Corriente de ${selectedUser?.name} por $${cartTotal.toLocaleString('es-AR')}!`
          : `¡Venta cobrada con éxito por $${cartTotal.toLocaleString('es-AR')}!`
      );
      clearCart();
      setTimeout(() => setSaleSuccessMessage(''), 4000);
    } else {
      alert(res.error || 'Error al registrar la venta.');
    }
    setSubmitting(false);
  };

  // Guardar Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || productForm.price <= 0) return;

    const prodToSave: PosProduct = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: productForm.name.trim(),
      category: productForm.category,
      price: Number(productForm.price),
      icon: productForm.icon.trim() || '🥤',
    };

    const res = await savePosProduct(prodToSave);
    if (res.success) {
      setProductModalOpen(false);
      setEditingProduct(null);
      loadData();
    } else {
      alert(res.error || 'Error al guardar el producto.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Eliminar este artículo del catálogo?')) {
      const res = await deletePosProduct(id);
      if (res.success) loadData();
    }
  };

  // Filtrado de productos
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // Métricas del día
  const todayTotalSales = sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Coffee className="w-7 h-7 text-amber-500" /> Cantina & Punto de Venta (POS)
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
            Venta rápida en mostrador de bebidas, pelotas, paletas y consumos de jugadores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/cuentas-corrientes">
            <Button
              variant="outline"
              className="rounded-2xl border-slate-300 dark:border-slate-700 font-bold text-xs md:text-sm h-11 px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-amber-500" /> Cuentas Corrientes
            </Button>
          </Link>

          <Button
            onClick={() => {
              setEditingProduct(null);
              setProductForm({ name: '', category: 'BEBIDAS', price: 1500, icon: '🥤' });
              setProductModalOpen(true);
            }}
            className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm h-11 px-4 shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Artículo
          </Button>
        </div>
      </div>

      {/* FEEDBACK DE VENTA EXITOSA */}
      {saleSuccessMessage && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      {/* STATS RÁPIDAS DEL DÍA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Recaudación Cantina Hoy</span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${todayTotalSales.toLocaleString('es-AR')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Tickets Emitidos</span>
          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            {sales.length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Artículos Activos</span>
          <span className="text-xl md:text-2xl font-black text-amber-500">
            {products.length} productos
          </span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: CATÁLOGO (IZQUIERDA) + TICKET/CARRITO (DERECHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMNA CATÁLOGO */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'BEBIDAS', label: '🥤 Bebidas' },
                { id: 'EQUIPAMIENTO', label: '🎾 Equipamiento' },
                { id: 'SNACKS', label: '🍫 Snacks' },
                { id: 'OTROS', label: '✨ Otros' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Productos */}
          {loading ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-bold text-sm">No encontramos productos en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all cursor-pointer group flex flex-col justify-between active:scale-[0.97]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl mb-2">{product.icon || '🥤'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                        setProductForm({
                          name: product.name,
                          category: product.category,
                          price: product.price,
                          icon: product.icon || '🥤',
                        });
                        setProductModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Editar producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                      {product.name}
                    </h4>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-2 block">
                      ${product.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA TICKET EN CURSO (CARRITO) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl sticky top-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">Ticket en Curso</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Lista de Items */}
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">Ticket vacío</p>
              <p className="text-[11px] opacity-70">Tocá productos del catálogo para agregarlos.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ${item.product.price.toLocaleString('es-AR')} c/u
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-black text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de Cobro */}
          {cart.length > 0 && (
              {/* Selector de Cliente / Consumidor Final / Socio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Venta A
                  </Label>
                  {!selectedUser && (
                    <button
                      type="button"
                      onClick={() => setUserSearchOpen(!userSearchOpen)}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>{userSearchOpen ? 'Consumidor Final' : 'Buscar Socio'}</span>
                    </button>
                  )}
                </div>

                {selectedUser ? (
                  <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                          👤 {selectedUser.name}
                        </span>
                        {selectedUser.dni && (
                          <span className="text-[10px] text-slate-500 font-bold">
                            (DNI: {selectedUser.dni})
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          selectedUser.balance < 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : selectedUser.balance === 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                        }`}>
                          {selectedUser.balance < 0
                            ? `Debe: $${Math.abs(selectedUser.balance).toLocaleString('es-AR')}`
                            : selectedUser.balance === 0
                            ? 'Cuenta al día ($0)'
                            : `Saldo a favor: +$${selectedUser.balance.toLocaleString('es-AR')}`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedUser}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                      title="Quitar socio y pasar a Consumidor Final"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : userSearchOpen ? (
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        autoFocus
                        placeholder="Buscar por nombre, DNI o teléfono..."
                        value={userSearchQuery}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        className="pl-9 h-9 text-xs font-bold rounded-xl"
                      />
                    </div>
                    {isSearchingUsers ? (
                      <div className="py-3 text-center text-xs text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto inline-block mr-1.5" />
                        Buscando socios...
                      </div>
                    ) : userSearchResults.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 hide-scrollbar">
                        {userSearchResults.map(u => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-between transition-all"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {u.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {u.phone || (u.dni ? `DNI: ${u.dni}` : 'Socio')}
                              </p>
                            </div>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                              u.balance < 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50' : 'text-emerald-600'
                            }`}>
                              {u.balance < 0 ? `Debe $${Math.abs(u.balance)}` : '$0'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : userSearchQuery.trim().length > 1 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">
                        No se encontró ningún socio.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 text-center py-1">
                        Escribí al menos 2 letras para buscar...
                      </p>
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="Consumidor Final (o Cancha / Mesa)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl text-xs h-9 font-bold"
                  />
                )}
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Método de Pago
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'CASH', label: '💵 Efectivo' },
                    { id: 'TRANSFER', label: '📲 Transf.' },
                    { id: 'MERCADOPAGO', label: '💳 MP' },
                    { id: 'CUENTA_CORRIENTE', label: '📒 Cta. Cte.' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.id === 'CUENTA_CORRIENTE' && !selectedUser) {
                          setUserSearchOpen(true);
                        }
                        setPaymentMethod(m.id as any);
                      }}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        paymentMethod === m.id
                          ? m.id === 'CUENTA_CORRIENTE'
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40'
                            : 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'CUENTA_CORRIENTE' && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl mt-1.5 border border-amber-200 dark:border-amber-800/50">
                    ℹ️ Se sumará al saldo deudor de {selectedUser ? selectedUser.name : 'el socio seleccionado'}.
                  </p>
                )}
              </div>

              {/* Total y Botón Cobrar */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total a Cobrar</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ${cartTotal.toLocaleString('es-AR')}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-base shadow-lg shadow-amber-600/20 active:scale-[0.98] transition-all"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    `Cobrar $${cartTotal.toLocaleString('es-AR')}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: HISTORIAL DE VENTAS DEL DÍA */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Registro de Ventas de Hoy
        </h3>

        {sales.length === 0 ? (
          <p className="text-slate-400 text-xs font-medium py-6 text-center">
            Aún no se registraron ventas en la cantina hoy.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Hora</th>
                  <th className="pb-3">Cliente / Detalle</th>
                  <th className="pb-3">Artículos</th>
                  <th className="pb-3">Pago</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 text-slate-500 font-bold">
                      {new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {sale.customerName}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        sale.paymentMethod === 'CASH'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : sale.paymentMethod === 'TRANSFER'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : sale.paymentMethod === 'MERCADOPAGO'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}>
                        {sale.paymentMethod === 'CASH' 
                          ? 'Efectivo' 
                          : sale.paymentMethod === 'TRANSFER' 
                          ? 'Transferencia' 
                          : sale.paymentMethod === 'MERCADOPAGO' 
                          ? 'Mercado Pago' 
                          : '📒 Cta. Cte.'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      ${Number(sale.totalAmount).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingProduct ? 'Editar Artículo' : 'Nuevo Artículo para Cantina'}
              </h3>
              <button 
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre del Producto</Label>
                <Input
                  required
                  placeholder="Ej: Gatorade 500ml Manzana"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Categoría</Label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="BEBIDAS">🥤 Bebidas</option>
                    <option value="EQUIPAMIENTO">🎾 Equipamiento</option>
                    <option value="SNACKS">🍫 Snacks</option>
                    <option value="OTROS">✨ Otros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Emoji / Icono</Label>
                  <Input
                    placeholder="Ej: 🥤"
                    value={productForm.icon}
                    onChange={(e) => setProductForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="rounded-xl text-center text-lg h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Precio de Venta ($)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  placeholder="Ej: 2200"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  className="rounded-xl font-black text-base"
                />
              </div>

              <div className="flex gap-2 pt-3">
                {editingProduct && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      handleDeleteProduct(editingProduct.id);
                      setProductModalOpen(false);
                    }}
                    className="rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
