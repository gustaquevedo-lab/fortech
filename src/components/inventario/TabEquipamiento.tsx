import { type FC, useState, useEffect } from 'react';
import {
    Radio, Plus, X, Loader2, Search, Package, UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
    RADIO: { label: 'Radio', emoji: '📻' },
    CHALECO: { label: 'Chaleco Antibalas', emoji: '🦺' },
    LINTERNA: { label: 'Linterna', emoji: '🔦' },
    ESPOSAS: { label: 'Esposas', emoji: '⛓️' },
    CAMARA: { label: 'Cámara / Body Cam', emoji: '📷' },
    CASCO: { label: 'Casco', emoji: '⛑️' },
    UNIFORME: { label: 'Uniforme', emoji: '👔' },
    OTRO: { label: 'Otro', emoji: '📦' },
};

const TabEquipamiento: FC = () => {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Modals
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedEquipId, setSelectedEquipId] = useState('');
    const [selectedGuardId, setSelectedGuardId] = useState('');

    // Register Form
    const [newItem, setNewItem] = useState({
        name: '', category: '', serial_number: '', brand: '', model: '', condition: 'NEW', notes: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [eqRes, gRes] = await Promise.all([
            supabase.from('equipment').select('*, guards:assigned_to(id, first_name, last_name)').order('created_at', { ascending: false }),
            supabase.from('guards').select('*').eq('status', 'ACTIVE').order('first_name', { ascending: true })
        ]);
        if (eqRes.data) setEquipment(eqRes.data);
        if (gRes.data) setGuards(gRes.data);
        setIsLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('equipment').insert({
                name: newItem.name,
                category: newItem.category,
                serial_number: newItem.serial_number || null,
                brand: newItem.brand || null,
                model: newItem.model || null,
                condition: newItem.condition,
                notes: newItem.notes || null,
                status: 'AVAILABLE'
            });
            if (error) throw error;
            setIsRegisterModalOpen(false);
            setNewItem({ name: '', category: '', serial_number: '', brand: '', model: '', condition: 'NEW', notes: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al registrar equipo.');
        } finally { setIsSubmitting(false); }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await supabase.from('equipment').update({ status: 'IN_USE', assigned_to: selectedGuardId }).eq('id', selectedEquipId);
            setIsAssignModalOpen(false);
            setSelectedEquipId('');
            setSelectedGuardId('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al asignar equipo.');
        } finally { setIsSubmitting(false); }
    };

    const handleReturn = async (eqId: string) => {
        if (!confirm('¿Confirmar devolución de este equipo?')) return;
        try {
            await supabase.from('equipment').update({ status: 'AVAILABLE', assigned_to: null }).eq('id', eqId);
            fetchData();
        } catch (error) { console.error(error); }
    };

    const filtered = equipment.filter(eq => {
        const matchSearch = eq.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eq.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eq.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = filterCategory === 'ALL' || eq.category === filterCategory;
        const matchSt = filterStatus === 'ALL' || eq.status === filterStatus;
        return matchSearch && matchCat && matchSt;
    });

    const statusLabel = (s: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            'AVAILABLE': { label: 'Disponible', cls: 'bg-emerald-500/20 text-emerald-400' },
            'IN_USE': { label: 'En Uso', cls: 'bg-primary/20 text-primary' },
            'MAINTENANCE': { label: 'Mantenimiento', cls: 'bg-orange-500/20 text-orange-400' },
            'DECOMMISSIONED': { label: 'De Baja', cls: 'bg-red-500/20 text-red-400' },
        };
        return map[s] || { label: s, cls: 'bg-slate-700 text-slate-300' };
    };

    const condLabel = (c: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            'NEW': { label: 'Nuevo', cls: 'text-emerald-400' },
            'GOOD': { label: 'Bueno', cls: 'text-blue-400' },
            'FAIR': { label: 'Regular', cls: 'text-orange-400' },
            'POOR': { label: 'Malo', cls: 'text-red-400' },
        };
        return map[c] || { label: c, cls: 'text-slate-400' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Buscar equipo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        <option value="ALL">Categorías</option>
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        <option value="ALL">Estados</option>
                        <option value="AVAILABLE">Disponibles</option>
                        <option value="IN_USE">En Uso</option>
                        <option value="MAINTENANCE">Mantenimiento</option>
                    </select>
                    <button onClick={() => setIsAssignModalOpen(true)} className="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <UserCheck size={16} /> Asignar
                    </button>
                    <button onClick={() => setIsRegisterModalOpen(true)} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(19,91,236,0.2)]">
                        <Plus size={16} /> Registrar Equipo
                    </button>
                </div>
            </div>

            {/* Equipment Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-slate-500"><Loader2 size={32} className="mx-auto animate-spin mb-3" />Cargando equipamiento...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <Package size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No se encontraron equipos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(eq => {
                        const st = statusLabel(eq.status);
                        const cond = condLabel(eq.condition);
                        const cat = CATEGORIES[eq.category] || { label: eq.category, emoji: '📦' };
                        return (
                            <div key={eq.id} className="glassmorphism p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{cat.emoji}</span>
                                        <div>
                                            <h4 className="text-white font-semibold text-sm">{eq.name}</h4>
                                            <p className="text-slate-500 text-xs">{cat.label}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    {eq.serial_number && <div className="flex justify-between"><span className="text-slate-500">Serie:</span><span className="text-slate-300 font-mono">{eq.serial_number}</span></div>}
                                    {eq.brand && <div className="flex justify-between"><span className="text-slate-500">Marca:</span><span className="text-slate-300">{eq.brand} {eq.model || ''}</span></div>}
                                    <div className="flex justify-between"><span className="text-slate-500">Estado Físico:</span><span className={`font-medium ${cond.cls}`}>{cond.label}</span></div>
                                    {eq.notes && <p className="text-slate-500 text-[11px] italic mt-1 border-l-2 border-slate-700 pl-2">{eq.notes}</p>}
                                </div>
                                {eq.status === 'IN_USE' && eq.guards && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                        <div className="text-xs">
                                            <span className="text-slate-500">Asignado a: </span>
                                            <span className="text-white font-medium">{eq.guards.first_name} {eq.guards.last_name}</span>
                                        </div>
                                        <button onClick={() => handleReturn(eq.id)}
                                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors">
                                            Devolver
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Register Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk">Registrar Nuevo Equipo</h3>
                            <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nombre del Equipo *</label>
                                    <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Radio Motorola T600" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Categoría *</label>
                                    <select required value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Seleccionar</option>
                                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nº de Serie</label>
                                    <input type="text" value={newItem.serial_number} onChange={e => setNewItem({ ...newItem, serial_number: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Marca</label>
                                    <input type="text" value={newItem.brand} onChange={e => setNewItem({ ...newItem, brand: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Modelo</label>
                                    <input type="text" value={newItem.model} onChange={e => setNewItem({ ...newItem, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Condición</label>
                                    <select value={newItem.condition} onChange={e => setNewItem({ ...newItem, condition: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="NEW">Nuevo</option>
                                        <option value="GOOD">Bueno</option>
                                        <option value="FAIR">Regular</option>
                                        <option value="POOR">Malo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Notas</label>
                                    <input type="text" value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Observaciones..." />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><Radio className="text-primary" /> Asignar Equipo</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Equipo Disponible *</label>
                                <select required value={selectedEquipId} onChange={e => setSelectedEquipId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="" disabled>-- Seleccione --</option>
                                    {equipment.filter(eq => eq.status === 'AVAILABLE').map(eq => (
                                        <option key={eq.id} value={eq.id}>{CATEGORIES[eq.category]?.emoji} {eq.name} {eq.serial_number ? `(${eq.serial_number})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Empleado *</label>
                                <select required value={selectedGuardId} onChange={e => setSelectedGuardId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="" disabled>-- Seleccione --</option>
                                    {guards.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !selectedEquipId || !selectedGuardId} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabEquipamiento;
