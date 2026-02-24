import { type FC, useState, useEffect, useMemo } from 'react';

// Helper: parse Paraguayan formatted number (1.500.000 → 1500000)
const parsePYG = (val: string): number => {
    const cleaned = val.replace(/\./g, '').replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
};
import {
    Building, FileSignature, MapPin, Users, Calendar, Plus, CheckCircle2, AlertCircle, X, Loader2,
    DollarSign, Trash2, Edit3, Search, Filter, Phone, Mail, UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Activo', cls: 'bg-emerald-500/20 text-emerald-400' },
    INACTIVE: { label: 'Inactivo', cls: 'bg-orange-500/20 text-orange-400' },
    CANCELLED: { label: 'Cancelado', cls: 'bg-red-500/20 text-red-400' },
};

const ModuloContratos: FC = () => {
    const [contracts, setContracts] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Which post are we editing? null = creating new
    const [editingPost, setEditingPost] = useState<any | null>(null);

    // Edit Contract Form State
    const [editClientName, setEditClientName] = useState('');
    const [editRuc, setEditRuc] = useState('');
    const [editContractNumber, setEditContractNumber] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editTotalValue, setEditTotalValue] = useState('');
    const [editStatus, setEditStatus] = useState('ACTIVE');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editFiscalAddress, setEditFiscalAddress] = useState('');

    // Create Contract Form State
    const [clientName, setClientName] = useState('');
    const [ruc, setRuc] = useState('');
    const [contractNumber, setContractNumber] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalValue, setTotalValue] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientFiscalAddress, setClientFiscalAddress] = useState('');

    // Post Form State
    const [postName, setPostName] = useState('');
    const [postAddress, setPostAddress] = useState('');
    const [postGuardsRequired, setPostGuardsRequired] = useState('1');
    const [postPrice, setPostPrice] = useState('');
    const [postLat, setPostLat] = useState('');
    const [postLng, setPostLng] = useState('');

    useEffect(() => { fetchContracts(); }, []);

    const fetchContracts = async () => {
        setIsLoading(true);
        const [contractsRes, guardsRes] = await Promise.all([
            supabase.from('contracts').select('*, clients(*)').order('created_at', { ascending: false }),
            supabase.from('guards').select('id, first_name, last_name, post_id').eq('status', 'ACTIVE')
        ]);
        if (contractsRes.data) {
            setContracts(contractsRes.data);
            if (contractsRes.data.length > 0 && !selectedContract) {
                handleSelectContract(contractsRes.data[0]);
            }
        }
        if (guardsRes.data) setGuards(guardsRes.data);
        setIsLoading(false);
    };

    const handleSelectContract = async (contract: any) => {
        setSelectedContract(contract);
        const { data } = await supabase.from('posts').select('*').eq('contract_id', contract.id);
        if (data) setPosts(data);
    };

    // ── Contract CRUD ──
    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: clientData, error: clientErr } = await supabase
                .from('clients')
                .insert({ name: clientName, ruc, phone: clientPhone || null, email: clientEmail || null, fiscal_address: clientFiscalAddress || null })
                .select().single();
            if (clientErr) throw clientErr;
            if (clientData) {
                const { error: contractErr } = await supabase.from('contracts').insert({
                    client_id: clientData.id,
                    contract_number: contractNumber,
                    start_date: startDate,
                    end_date: endDate,
                    total_value: parsePYG(totalValue)
                });
                if (contractErr) throw contractErr;
                setIsModalOpen(false);
                setClientName(''); setRuc(''); setContractNumber(''); setStartDate(''); setEndDate(''); setTotalValue('');
                setClientPhone(''); setClientEmail(''); setClientFiscalAddress('');
                fetchContracts();
            }
        } catch (error) {
            console.error(error); alert('Error al crear el contrato.');
        } finally { setIsSubmitting(false); }
    };

    const openEditModal = (contract: any) => {
        setEditClientName(contract.clients?.name || '');
        setEditRuc(contract.clients?.ruc || '');
        setEditContractNumber(contract.contract_number || '');
        setEditStartDate(contract.start_date || '');
        setEditEndDate(contract.end_date || '');
        setEditTotalValue(contract.total_value?.toString() || '');
        setEditStatus(contract.status || 'ACTIVE');
        setEditPhone(contract.clients?.phone || '');
        setEditEmail(contract.clients?.email || '');
        setEditFiscalAddress(contract.clients?.fiscal_address || '');
        setIsEditModalOpen(true);
    };

    const handleEditContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContract) return;
        setIsSubmitting(true);
        try {
            if (selectedContract.client_id) {
                await supabase.from('clients').update({
                    name: editClientName, ruc: editRuc,
                    phone: editPhone || null, email: editEmail || null, fiscal_address: editFiscalAddress || null
                }).eq('id', selectedContract.client_id);
            }
            const { error } = await supabase.from('contracts').update({
                contract_number: editContractNumber,
                start_date: editStartDate, end_date: editEndDate,
                total_value: parsePYG(editTotalValue), status: editStatus
            }).eq('id', selectedContract.id);
            if (error) throw error;
            setIsEditModalOpen(false);
            const updatedContract = { ...selectedContract, contract_number: editContractNumber, start_date: editStartDate, end_date: editEndDate, total_value: parsePYG(editTotalValue), status: editStatus, clients: { ...selectedContract.clients, name: editClientName, ruc: editRuc, phone: editPhone, email: editEmail, fiscal_address: editFiscalAddress } };
            setSelectedContract(updatedContract);
            fetchContracts();
        } catch (error) { console.error(error); alert('Error al actualizar contrato.'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteContract = async (id: string) => {
        if (!confirm('¿Eliminar este contrato y todos sus puestos? Esta acción no se puede deshacer.')) return;
        try {
            await supabase.from('posts').delete().eq('contract_id', id);
            await supabase.from('contracts').delete().eq('id', id);
            setSelectedContract(null);
            setPosts([]);
            fetchContracts();
        } catch (error) { console.error(error); alert('Error al eliminar contrato.'); }
    };

    // ── Posts CRUD ──
    const openPostModal = (post?: any) => {
        if (post) {
            setEditingPost(post);
            setPostName(post.name || '');
            setPostAddress(post.address || '');
            setPostGuardsRequired((post.guards_required || 1).toString());
            setPostPrice(post.price?.toString() || '');
            setPostLat(post.lat?.toString() || '');
            setPostLng(post.lng?.toString() || '');
        } else {
            setEditingPost(null);
            setPostName(''); setPostAddress(''); setPostGuardsRequired('1'); setPostPrice(''); setPostLat(''); setPostLng('');
        }
        setIsPostModalOpen(true);
    };

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContract) return;
        setIsSubmitting(true);
        const postData = {
            name: postName, address: postAddress || null,
            guards_required: parseInt(postGuardsRequired) || 1,
            price: postPrice ? parsePYG(postPrice) : null,
            lat: postLat ? parseFloat(postLat) : null,
            lng: postLng ? parseFloat(postLng) : null,
        };
        try {
            if (editingPost) {
                const { error } = await supabase.from('posts').update(postData).eq('id', editingPost.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('posts').insert({ ...postData, contract_id: selectedContract.id, client_id: selectedContract.client_id });
                if (error) throw error;
            }
            setIsPostModalOpen(false);
            setEditingPost(null);
            handleSelectContract(selectedContract);
        } catch (error) { console.error(error); alert('Error al guardar puesto.'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('¿Eliminar este puesto?')) return;
        await supabase.from('posts').delete().eq('id', postId);
        handleSelectContract(selectedContract);
    };

    // ── Computed Values ──
    const formatCurrency = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

    const totalPostsValue = posts.reduce((s, p) => s + (p.price || 0), 0);
    const totalGuardsRequired = posts.reduce((s, p) => s + (p.guards_required || 0), 0);
    const valueDifference = selectedContract ? (selectedContract.total_value || 0) - totalPostsValue : 0;

    const allTotalPosts = useMemo(() => contracts.reduce((sum, c) => {
        // This is approximate since we only have posts for the selected contract
        return sum;
    }, 0), [contracts]);

    const expiringContracts = useMemo(() => contracts.filter(c => {
        if (!c.end_date) return false;
        const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 60;
    }).length, [contracts]);

    // Filtered contracts
    const filteredContracts = useMemo(() => {
        let filtered = contracts;
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(c => c.status === statusFilter);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.clients?.name?.toLowerCase().includes(term) ||
                c.contract_number?.toLowerCase().includes(term) ||
                c.clients?.ruc?.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [contracts, statusFilter, searchTerm]);

    const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary";

    // Guards assigned to posts of this contract
    const getGuardsForPost = (postId: string) => guards.filter(g => g.post_id === postId);

    return (
        <div className="animate-in fade-in duration-500 space-y-6 relative">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Gestión de Contratos y Servicios</h2>
                    <p className="text-slate-400 mt-1">Estructura operativa base: Clientes, Contratos y Asignaciones</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary/20 text-primary border border-primary/30 font-medium hover:bg-primary/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={16} /> Nuevo Contrato
                </button>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between border-primary/30 shadow-[0_0_20px_rgba(19,91,236,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium text-sm">Contratos Activos</h3>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><FileSignature size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-white font-grotesk tracking-tighter block">{isLoading ? '-' : contracts.filter(c => c.status === 'ACTIVE').length}</span>
                    <p className="text-emerald-400 text-sm mt-1">de {contracts.length} totales</p>
                </div>
                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium text-sm">Puestos (Contrato Sel.)</h3>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300"><MapPin size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-white font-grotesk tracking-tighter block">{posts.length}</span>
                    <p className="text-slate-400 text-sm mt-1">{totalGuardsRequired} efectivos requeridos</p>
                </div>
                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium text-sm">Valor Puestos</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><DollarSign size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-white font-grotesk tracking-tighter block">{totalPostsValue > 0 ? formatCurrency(totalPostsValue) : '-'}</span>
                    {selectedContract && totalPostsValue > 0 && (
                        <p className={`text-sm mt-1 ${Math.abs(valueDifference) < 1 ? 'text-emerald-400' : valueDifference > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                            {Math.abs(valueDifference) < 1 ? '✔ Cuadrado con contrato' : valueDifference > 0 ? `⚠ Faltan ${formatCurrency(valueDifference)} por cubrir` : `🔴 Excede en ${formatCurrency(Math.abs(valueDifference))}`}
                        </p>
                    )}
                </div>
                <div className={`glassmorphism p-6 rounded-2xl flex flex-col justify-between ${expiringContracts > 0 ? 'border-orange-500/30' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium text-sm">Vencen pronto</h3>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Calendar size={20} /></div>
                    </div>
                    <span className="text-3xl font-bold text-orange-400 font-grotesk tracking-tighter block">{expiringContracts}</span>
                    <p className="text-orange-400 text-sm mt-1">Requieren renovación</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Contract List */}
                <div className="lg:col-span-1 glassmorphism p-6 rounded-2xl flex flex-col h-[600px]">
                    <h3 className="text-lg font-bold text-white font-grotesk mb-4 flex items-center gap-2">
                        <Building size={20} className="text-primary" /> Portafolio de Clientes
                    </h3>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar cliente, contrato o RUC..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-1.5 mb-4">
                        {[{ key: 'ALL', label: 'Todos' }, { key: 'ACTIVE', label: 'Activos' }, { key: 'INACTIVE', label: 'Inactivos' }, { key: 'CANCELLED', label: 'Cancelados' }].map(f => (
                            <button key={f.key} onClick={() => setStatusFilter(f.key)}
                                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${statusFilter === f.key ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {isLoading ? (
                            <div className="text-center py-10 text-slate-500">Cargando contratos...</div>
                        ) : filteredContracts.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">{searchTerm || statusFilter !== 'ALL' ? 'Sin resultados para el filtro.' : 'No hay contratos. ¡Crea el primero!'}</div>
                        ) : (
                            filteredContracts.map(contract => (
                                <div key={contract.id} onClick={() => handleSelectContract(contract)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedContract?.id === contract.id ? 'bg-primary/10 border-primary/50' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-white font-bold text-sm">{contract.clients?.name}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_MAP[contract.status]?.cls || 'bg-slate-700 text-slate-400'}`}>
                                            {STATUS_MAP[contract.status]?.label || contract.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">{contract.contract_number}</p>
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {contract.end_date}</span>
                                        <span className="text-white font-medium">{formatCurrency(contract.total_value || 0)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Contract Details & Posts */}
                <div className="lg:col-span-2 glassmorphism p-6 rounded-2xl h-[600px] flex flex-col">
                    {selectedContract ? (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">{selectedContract.contract_number}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${STATUS_MAP[selectedContract.status]?.cls || 'bg-slate-700 text-slate-400'}`}>
                                            {STATUS_MAP[selectedContract.status]?.label || selectedContract.status}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white font-grotesk tracking-tight">{selectedContract.clients?.name}</h2>
                                    <p className="text-slate-400 mt-1">Valor Total: {formatCurrency(selectedContract.total_value || 0)}</p>

                                    {/* Client contact info */}
                                    <div className="flex gap-4 mt-2 flex-wrap">
                                        {selectedContract.clients?.phone && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {selectedContract.clients.phone}</span>
                                        )}
                                        {selectedContract.clients?.email && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} /> {selectedContract.clients.email}</span>
                                        )}
                                        {selectedContract.clients?.ruc && (
                                            <span className="text-xs text-slate-500">RUC: {selectedContract.clients.ruc}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(selectedContract)} className="text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5">
                                        <Edit3 size={14} /> Editar
                                    </button>
                                    <button onClick={() => handleDeleteContract(selectedContract.id)} className="text-red-400/60 hover:text-red-400 border border-slate-700 hover:border-red-500/30 hover:bg-red-500/10 px-2.5 py-1.5 rounded text-sm transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Value Comparison Bar */}
                            {posts.length > 0 && totalPostsValue > 0 && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>Valor puestos: {formatCurrency(totalPostsValue)}</span>
                                        <span>Valor contrato: {formatCurrency(selectedContract.total_value || 0)}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${Math.abs(valueDifference) < 1 ? 'bg-emerald-500' : valueDifference > 0 ? 'bg-orange-400' : 'bg-red-400'}`}
                                            style={{ width: `${Math.min(100, (totalPostsValue / (selectedContract.total_value || 1)) * 100)}%` }} />
                                    </div>
                                    {Math.abs(valueDifference) > 0 && (
                                        <p className={`text-[10px] mt-1 ${valueDifference > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                            {valueDifference > 0 ? `⚠ Diferencia: ${formatCurrency(valueDifference)} sin asignar a puestos` : `🔴 Excede el contrato en ${formatCurrency(Math.abs(valueDifference))}`}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Posts Section */}
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-white font-grotesk">Puestos ({posts.length})</h3>
                                <button onClick={() => openPostModal()} className="text-primary text-xs hover:underline flex items-center gap-1">
                                    <Plus size={12} /> Añadir Puesto
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-700/50 text-slate-400 text-xs">
                                            <th className="pb-2 font-medium">Puesto</th>
                                            <th className="pb-2 font-medium">Dirección</th>
                                            <th className="pb-2 font-medium text-center">Efectivos</th>
                                            <th className="pb-2 font-medium text-right">Precio (Gs.)</th>
                                            <th className="pb-2 font-medium text-center">Guardias</th>
                                            <th className="pb-2 font-medium text-center w-20">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {posts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-500">No hay puestos. Haz clic en "+ Añadir Puesto".</td>
                                            </tr>
                                        ) : (
                                            posts.map(post => {
                                                const assignedGuards = getGuardsForPost(post.id);
                                                return (
                                                    <tr key={post.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors group">
                                                        <td className="py-3">
                                                            <span className="text-white font-medium block text-xs">{post.name}</span>
                                                            {post.lat && post.lng && (
                                                                <span className="text-[9px] text-slate-600 font-mono">{parseFloat(post.lat).toFixed(4)}, {parseFloat(post.lng).toFixed(4)}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-slate-400 text-xs max-w-[120px] truncate">{post.address || '-'}</td>
                                                        <td className="py-3 text-center">
                                                            <span className="bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-700 font-mono text-xs">{post.guards_required}</span>
                                                        </td>
                                                        <td className="py-3 text-right font-mono text-white text-xs">
                                                            {post.price ? formatCurrency(post.price) : <span className="text-slate-600">-</span>}
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            {assignedGuards.length > 0 ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    {assignedGuards.map(g => (
                                                                        <span key={g.id} className="text-[10px] text-emerald-400 flex items-center justify-center gap-0.5">
                                                                            <UserCheck size={9} /> {g.first_name} {g.last_name?.[0]}.
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-600">Sin asignar</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openPostModal(post)} className="text-slate-500 hover:text-primary transition-colors" title="Editar">
                                                                    <Edit3 size={13} />
                                                                </button>
                                                                <button onClick={() => handleDeletePost(post.id)} className="text-slate-500 hover:text-red-400 transition-colors" title="Eliminar">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Building size={48} className="mb-4 opacity-20" />
                            <p>Selecciona o crea un contrato para ver sus detalles y puestos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ MODALS ══ */}

            {/* Modal Nuevo Contrato */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><FileSignature className="text-primary" /> Crear Nuevo Contrato</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateContract} className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Datos del Cliente</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Nombre / Razón Social *</label>
                                        <input required value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">RUC</label>
                                        <input value={ruc} onChange={e => setRuc(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={10} /> Teléfono</label>
                                        <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} className={inputClass} placeholder="+595 9XX XXX XXX" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail size={10} /> Email</label>
                                        <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className={inputClass} placeholder="contacto@empresa.com" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Dirección Fiscal</label>
                                        <input value={clientFiscalAddress} onChange={e => setClientFiscalAddress(e.target.value)} className={inputClass} placeholder="Dirección fiscal del cliente" />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800">
                                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Detalles del Contrato</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Número de Contrato *</label>
                                        <input required value={contractNumber} onChange={e => setContractNumber(e.target.value)} className={`${inputClass} font-mono`} placeholder="CTR-2024-001" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Valor Total (Gs.) *</label>
                                        <input required value={totalValue} onChange={e => setTotalValue(e.target.value)} type="number" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Fecha Inicio *</label>
                                        <input required value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Fecha Fin *</label>
                                        <input required value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Guardar y Crear Contrato'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Contrato */}
            {isEditModalOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><Edit3 className="text-primary" /> Editar Contrato</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditContract} className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Datos del Cliente</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Nombre / Razón Social *</label>
                                        <input required value={editClientName} onChange={e => setEditClientName(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">RUC</label>
                                        <input value={editRuc} onChange={e => setEditRuc(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={10} /> Teléfono</label>
                                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail size={10} /> Email</label>
                                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Dirección Fiscal</label>
                                        <input value={editFiscalAddress} onChange={e => setEditFiscalAddress(e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800">
                                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Detalles del Contrato</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Número de Contrato *</label>
                                        <input required value={editContractNumber} onChange={e => setEditContractNumber(e.target.value)} className={`${inputClass} font-mono`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Valor Total (Gs.) *</label>
                                        <input required value={editTotalValue} onChange={e => setEditTotalValue(e.target.value)} type="number" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Fecha Inicio *</label>
                                        <input required value={editStartDate} onChange={e => setEditStartDate(e.target.value)} type="date" className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Fecha Fin *</label>
                                        <input required value={editEndDate} onChange={e => setEditEndDate(e.target.value)} type="date" className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800">
                                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Estado</h4>
                                <div className="flex gap-3">
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <button key={key} type="button" onClick={() => setEditStatus(key)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${editStatus === key ? val.cls + ' border-current' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                                            {val.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Puesto */}
            {isPostModalOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <MapPin className="text-primary" /> {editingPost ? 'Editar Puesto' : 'Añadir Puesto'}
                            </h3>
                            <button onClick={() => { setIsPostModalOpen(false); setEditingPost(null); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSavePost} className="p-6 space-y-4">
                            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
                                Contrato: <span className="text-white font-bold">{selectedContract.clients?.name}</span> — {selectedContract.contract_number}
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Nombre del Puesto *</label>
                                <input required value={postName} onChange={e => setPostName(e.target.value)} className={inputClass} placeholder="Ej: Sede Central - Portería Norte" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Dirección</label>
                                <input value={postAddress} onChange={e => setPostAddress(e.target.value)} className={inputClass} placeholder="Av. Mariscal López 1234, Asunción" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Efectivos Requeridos *</label>
                                    <input required type="number" min="1" value={postGuardsRequired} onChange={e => setPostGuardsRequired(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><DollarSign size={10} /> Precio (Gs.)</label>
                                    <input type="number" value={postPrice} onChange={e => setPostPrice(e.target.value)} className={inputClass} placeholder="5.000.000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Latitud</label>
                                    <input type="number" step="any" value={postLat} onChange={e => setPostLat(e.target.value)} className={`${inputClass} font-mono`} placeholder="-25.2637" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Longitud</label>
                                    <input type="number" step="any" value={postLng} onChange={e => setPostLng(e.target.value)} className={`${inputClass} font-mono`} placeholder="-57.5759" />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500">💡 Las coordenadas ubican el puesto en el Mapa de Operaciones.</p>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsPostModalOpen(false); setEditingPost(null); }} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingPost ? 'Guardar Cambios' : <><Plus size={16} /> Crear Puesto</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuloContratos;
