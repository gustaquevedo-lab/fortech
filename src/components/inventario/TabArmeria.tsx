import { type FC, useState, useEffect } from 'react';
import {
    ShieldCheck, Plus, X, Loader2, Search, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TabArmeria: FC = () => {
    const [weapons, setWeapons] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Modals
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Register Form
    const [newWeapon, setNewWeapon] = useState({
        type: '', serial_number: '', caliber: '', brand: '', model: '',
        registration_number: '', dimabel_expiration: ''
    });

    // Assign Form
    const [selectedWeaponId, setSelectedWeaponId] = useState('');
    const [selectedGuardId, setSelectedGuardId] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [weaponsRes, guardsRes] = await Promise.all([
            supabase.from('weapons').select('*, guards:assigned_to(id, first_name, last_name, ci)').order('created_at', { ascending: false }),
            supabase.from('guards').select('*').eq('status', 'ACTIVE').order('first_name', { ascending: true })
        ]);
        if (weaponsRes.data) setWeapons(weaponsRes.data);
        if (guardsRes.data) setGuards(guardsRes.data);
        setIsLoading(false);
    };

    const handleRegisterWeapon = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('weapons').insert({
                type: newWeapon.type,
                serial_number: newWeapon.serial_number,
                caliber: newWeapon.caliber || null,
                brand: newWeapon.brand || null,
                model: newWeapon.model || null,
                registration_number: newWeapon.registration_number || null,
                dimabel_expiration: newWeapon.dimabel_expiration || null,
                status: 'AVAILABLE'
            });
            if (error) throw error;
            setIsRegisterModalOpen(false);
            setNewWeapon({ type: '', serial_number: '', caliber: '', brand: '', model: '', registration_number: '', dimabel_expiration: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al registrar el arma.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignWeapon = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await supabase.from('weapons').update({ status: 'IN_USE', assigned_to: selectedGuardId }).eq('id', selectedWeaponId);
            await supabase.from('weapon_logs').insert({ weapon_id: selectedWeaponId, guard_id: selectedGuardId, action: 'CHECKOUT' });
            setIsAssignModalOpen(false);
            setSelectedWeaponId('');
            setSelectedGuardId('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al asignar el armamento.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturnWeapon = async (weaponId: string, guardId: string) => {
        if (!confirm('¿Confirmar devolución de esta arma?')) return;
        try {
            await supabase.from('weapons').update({ status: 'AVAILABLE', assigned_to: null }).eq('id', weaponId);
            await supabase.from('weapon_logs').insert({ weapon_id: weaponId, guard_id: guardId, action: 'RETURN' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al registrar devolución.');
        }
    };

    const filteredWeapons = weapons.filter(w => {
        const matchesSearch = w.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || w.status === filterStatus;
        return matchesSearch && matchesFilter;
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

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* DIMABEL Compliance Dashboard */}
            {(() => {
                const today = new Date();
                const expired = weapons.filter(w => w.dimabel_expiration && new Date(w.dimabel_expiration) < today);
                const expiringSoon = weapons.filter(w => {
                    if (!w.dimabel_expiration) return false;
                    const d = new Date(w.dimabel_expiration);
                    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff >= 0 && diff <= 60;
                });
                const valid = weapons.filter(w => {
                    if (!w.dimabel_expiration) return false;
                    const diff = Math.ceil((new Date(w.dimabel_expiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff > 60;
                });
                const noReg = weapons.filter(w => !w.dimabel_expiration && !w.registration_number);

                if (weapons.length === 0) return null;
                return (
                    <div className="glassmorphism rounded-2xl p-5 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold text-sm font-grotesk flex items-center gap-2">
                                <ShieldCheck size={16} className="text-primary" /> Control DIMABEL — Legislación Paraguaya (Ley 4036)
                            </h3>
                            {expired.length > 0 && (
                                <span className="bg-red-500/20 text-red-400 text-[10px] px-3 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
                                    <AlertTriangle size={12} /> {expired.length} HABILITACIONES VENCIDAS
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-red-400 font-grotesk">{expired.length}</p>
                                <p className="text-red-400/70 text-[10px] font-bold mt-1">🔴 VENCIDAS</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-orange-400 font-grotesk">{expiringSoon.length}</p>
                                <p className="text-orange-400/70 text-[10px] font-bold mt-1">🟡 PRÓXIMAS (60d)</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-400 font-grotesk">{valid.length}</p>
                                <p className="text-emerald-400/70 text-[10px] font-bold mt-1">🟢 VIGENTES</p>
                            </div>
                            <div className="bg-slate-700/30 border border-slate-700/50 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-slate-400 font-grotesk">{noReg.length}</p>
                                <p className="text-slate-500 text-[10px] font-bold mt-1">⚪ SIN REGISTRO</p>
                            </div>
                        </div>
                        {expired.length > 0 && (
                            <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                <p className="text-red-400 text-xs font-bold mb-2">⚠ Armas con habilitación DIMABEL vencida:</p>
                                <div className="flex flex-wrap gap-2">
                                    {expired.map(w => (
                                        <span key={w.id} className="bg-red-500/20 text-red-300 text-[11px] px-2 py-1 rounded font-mono">
                                            {w.type} • {w.serial_number} • Venció: {new Date(w.dimabel_expiration).toLocaleDateString()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Buscar por tipo, serie, marca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-2 items-center">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        <option value="ALL">Todos</option>
                        <option value="AVAILABLE">Disponibles</option>
                        <option value="IN_USE">En Uso</option>
                        <option value="MAINTENANCE">Mantenimiento</option>
                    </select>
                    <button onClick={() => setIsAssignModalOpen(true)} className="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <ShieldCheck size={16} /> Asignar
                    </button>
                    <button onClick={() => setIsRegisterModalOpen(true)} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(19,91,236,0.2)]">
                        <Plus size={16} /> Registrar Arma
                    </button>
                </div>
            </div>

            {/* Weapons Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-slate-500"><Loader2 size={32} className="mx-auto animate-spin mb-3" />Cargando inventario...</div>
            ) : filteredWeapons.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <ShieldCheck size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No se encontraron armas con los filtros actuales.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredWeapons.map(weapon => {
                        const st = statusLabel(weapon.status);
                        const dimabelDate = weapon.dimabel_expiration ? new Date(weapon.dimabel_expiration) : null;
                        const dimabelExpired = dimabelDate && dimabelDate < new Date();
                        return (
                            <div key={weapon.id} className="glassmorphism p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold text-sm">{weapon.type}</h4>
                                        <p className="text-slate-400 text-xs mt-0.5">{weapon.brand} {weapon.model}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-500">Serie:</span><span className="text-slate-300 font-mono">{weapon.serial_number}</span></div>
                                    {weapon.caliber && <div className="flex justify-between"><span className="text-slate-500">Calibre:</span><span className="text-slate-300">{weapon.caliber}</span></div>}
                                    {weapon.registration_number && <div className="flex justify-between"><span className="text-slate-500">Reg. DIMABEL:</span><span className="text-slate-300 font-mono">{weapon.registration_number}</span></div>}
                                    {dimabelDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Venc. DIMABEL:</span>
                                            <span className={`font-mono flex items-center gap-1 ${dimabelExpired ? 'text-red-400' : 'text-slate-300'}`}>
                                                {dimabelExpired && <AlertTriangle size={12} />}
                                                {dimabelDate.toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {weapon.status === 'IN_USE' && weapon.guards && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs">
                                                <span className="text-slate-500">Asignado a: </span>
                                                <span className="text-white font-medium">{weapon.guards.first_name} {weapon.guards.last_name}</span>
                                            </div>
                                            <button onClick={() => handleReturnWeapon(weapon.id, weapon.guards.id)}
                                                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors">
                                                Devolver
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Register Weapon Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk">Registrar Nueva Arma</h3>
                            <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRegisterWeapon} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Tipo de Arma *</label>
                                    <select required value={newWeapon.type} onChange={e => setNewWeapon({ ...newWeapon, type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Seleccionar</option>
                                        <option value="Pistola">Pistola</option>
                                        <option value="Revólver">Revólver</option>
                                        <option value="Escopeta">Escopeta</option>
                                        <option value="Carabina">Carabina</option>
                                        <option value="Fusil">Fusil</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Número de Serie *</label>
                                    <input required type="text" value={newWeapon.serial_number} onChange={e => setNewWeapon({ ...newWeapon, serial_number: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Ej: ABC-12345" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Calibre</label>
                                    <input type="text" value={newWeapon.caliber} onChange={e => setNewWeapon({ ...newWeapon, caliber: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="9mm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Marca</label>
                                    <input type="text" value={newWeapon.brand} onChange={e => setNewWeapon({ ...newWeapon, brand: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Beretta" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Modelo</label>
                                    <input type="text" value={newWeapon.model} onChange={e => setNewWeapon({ ...newWeapon, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="92FS" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Registro DIMABEL</label>
                                    <input type="text" value={newWeapon.registration_number} onChange={e => setNewWeapon({ ...newWeapon, registration_number: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="DIMABEL-001" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Vencimiento DIMABEL</label>
                                    <input type="date" value={newWeapon.dimabel_expiration} onChange={e => setNewWeapon({ ...newWeapon, dimabel_expiration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
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

            {/* Assign Weapon Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><ShieldCheck className="text-primary" /> Asignar Armamento</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssignWeapon} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Seleccionar Arma (Disponibles) *</label>
                                <select required value={selectedWeaponId} onChange={e => setSelectedWeaponId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="" disabled>-- Seleccione un arma --</option>
                                    {weapons.filter(w => w.status === 'AVAILABLE').map(w => (
                                        <option key={w.id} value={w.id}>{w.type} (Ser: {w.serial_number}) - {w.caliber}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Personal Asignado *</label>
                                <select required value={selectedGuardId} onChange={e => setSelectedGuardId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="" disabled>-- Seleccione un empleado --</option>
                                    {guards.map(g => (
                                        <option key={g.id} value={g.id}>{g.first_name} {g.last_name} (CI: {g.ci})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !selectedWeaponId || !selectedGuardId} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Retiro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabArmeria;
