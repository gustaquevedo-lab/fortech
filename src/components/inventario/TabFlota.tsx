import { type FC, useState, useEffect } from 'react';
import {
    Plus, X, Loader2, Search, AlertTriangle, CheckCircle2, Wrench, Fuel, Calendar, ChevronDown, ChevronUp, MapPin, ShieldAlert, Edit2, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const VEHICLE_TYPES: Record<string, { label: string; emoji: string }> = {
    CAMIONETA: { label: 'Camioneta', emoji: '🚛' },
    MOTO: { label: 'Moto', emoji: '🏍️' },
    BLINDADO: { label: 'Blindado', emoji: '🛡️' },
    CUATRICICLO: { label: 'Cuatriciclo', emoji: '🏎️' },
    TACTICO: { label: 'Vehículo Táctico', emoji: '🚔' },
    SEDAN: { label: 'Sedán', emoji: '🚗' },
    SUV: { label: 'SUV', emoji: '🚙' },
    OTRO: { label: 'Otro', emoji: '🚐' },
};

const MAINT_TYPES: Record<string, { label: string; emoji: string }> = {
    PREVENTIVO: { label: 'Preventivo', emoji: '🔧' },
    CORRECTIVO: { label: 'Correctivo', emoji: '🔨' },
    NEUMATICOS: { label: 'Neumáticos', emoji: '🛞' },
    ACEITE: { label: 'Cambio de Aceite', emoji: '🛢️' },
    REVISION_TECNICA: { label: 'Revisión Técnica', emoji: '📋' },
    FRENOS: { label: 'Frenos', emoji: '🛑' },
    ELECTRICO: { label: 'Sistema Eléctrico', emoji: '⚡' },
    OTRO: { label: 'Otro', emoji: '🔩' },
};

const TabFlota: FC = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [maintenanceMap, setMaintenanceMap] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

    // Modal
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceVehicleId, setMaintenanceVehicleId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Register Vehicle Form
    const [newVehicle, setNewVehicle] = useState({
        type: '', brand: '', model: '', year: '', plate_number: '', color: '', vin: '',
        fuel_type: 'GASOLINA', km_current: '', assigned_to: '', insurance_expiration: '', inspection_expiration: '', municipality: '', notes: ''
    });

    // Edit Form
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [editVehicleForm, setEditVehicleForm] = useState({
        type: '', brand: '', model: '', year: '', plate_number: '', color: '', vin: '',
        fuel_type: 'GASOLINA', km_current: '', assigned_to: '', insurance_expiration: '', inspection_expiration: '', municipality: '', notes: ''
    });

    // Maintenance Form
    const [newMaint, setNewMaint] = useState({
        type: 'PREVENTIVO', description: '', cost: '', km_at_service: '', next_service_km: '',
        date: new Date().toISOString().split('T')[0], next_service_date: '', provider: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [vRes, gRes, mRes] = await Promise.all([
            supabase.from('vehicles').select('*, guards:assigned_to(id, first_name, last_name)').order('created_at', { ascending: false }),
            supabase.from('guards').select('*').eq('status', 'ACTIVE').order('first_name', { ascending: true }),
            supabase.from('vehicle_maintenance').select('*').order('date', { ascending: false })
        ]);
        if (vRes.data) setVehicles(vRes.data);
        if (gRes.data) setGuards(gRes.data);
        if (mRes.data) {
            const map: Record<string, any[]> = {};
            mRes.data.forEach((m: any) => {
                if (!map[m.vehicle_id]) map[m.vehicle_id] = [];
                map[m.vehicle_id].push(m);
            });
            setMaintenanceMap(map);
        }
        setIsLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('vehicles').insert({
                type: newVehicle.type,
                brand: newVehicle.brand,
                model: newVehicle.model,
                year: newVehicle.year ? parseInt(newVehicle.year) : null,
                plate_number: newVehicle.plate_number || null,
                color: newVehicle.color || null,
                vin: newVehicle.vin || null,
                fuel_type: newVehicle.fuel_type,
                km_current: newVehicle.km_current ? parseInt(newVehicle.km_current) : 0,
                assigned_to: newVehicle.assigned_to || null,
                insurance_expiration: newVehicle.insurance_expiration || null,
                inspection_expiration: newVehicle.inspection_expiration || null,
                municipality: newVehicle.municipality || null,
                notes: newVehicle.notes || null,
                status: newVehicle.assigned_to ? 'IN_SERVICE' : 'AVAILABLE'
            });
            if (error) throw error;
            setIsRegisterModalOpen(false);
            setNewVehicle({
                type: '', brand: '', model: '', year: '', plate_number: '', color: '', vin: '',
                fuel_type: 'GASOLINA', km_current: '', assigned_to: '', insurance_expiration: '', inspection_expiration: '', municipality: '', notes: ''
            });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al registrar vehículo.');
        } finally { setIsSubmitting(false); }
    };

    const handleUpdateVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVehicle) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('vehicles').update({
                type: editVehicleForm.type,
                brand: editVehicleForm.brand,
                model: editVehicleForm.model,
                year: editVehicleForm.year ? parseInt(editVehicleForm.year) : null,
                plate_number: editVehicleForm.plate_number || null,
                color: editVehicleForm.color || null,
                vin: editVehicleForm.vin || null,
                fuel_type: editVehicleForm.fuel_type,
                km_current: editVehicleForm.km_current ? parseInt(editVehicleForm.km_current) : 0,
                assigned_to: editVehicleForm.assigned_to || null,
                insurance_expiration: editVehicleForm.insurance_expiration || null,
                inspection_expiration: editVehicleForm.inspection_expiration || null,
                municipality: editVehicleForm.municipality || null,
                notes: editVehicleForm.notes || null
            }).eq('id', editingVehicle.id);

            if (error) throw error;
            setEditingVehicle(null);
            fetchData();
        } catch (error: any) {
            console.error(error);
            alert('Error al actualizar el vehículo: ' + (error.message || JSON.stringify(error)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este vehículo? Esta acción no se puede deshacer y fallará si tiene mantenimientos o asignaciones asociadas.')) return;
        try {
            const { error, count } = await supabase.from('vehicles').delete({ count: 'exact' }).eq('id', id);
            if (error) throw error;
            if (count === 0) {
                alert('No se pudo eliminar el vehículo. Es probable que falten permisos (Políticas RLS) en la base de datos.');
                return;
            }
            fetchData();
        } catch (error: any) {
            console.error(error);
            alert('Error al eliminar vehículo. Puede que tenga registros asociados: ' + (error.message || JSON.stringify(error)));
        }
    };

    const handleAddMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('vehicle_maintenance').insert({
                vehicle_id: maintenanceVehicleId,
                type: newMaint.type,
                description: newMaint.description,
                cost: newMaint.cost ? parseFloat(newMaint.cost) : 0,
                km_at_service: newMaint.km_at_service ? parseInt(newMaint.km_at_service) : null,
                next_service_km: newMaint.next_service_km ? parseInt(newMaint.next_service_km) : null,
                date: newMaint.date,
                next_service_date: newMaint.next_service_date || null,
                provider: newMaint.provider || null,
                status: 'COMPLETED'
            });
            if (error) throw error;
            // Update vehicle km if provided
            if (newMaint.km_at_service) {
                await supabase.from('vehicles').update({ km_current: parseInt(newMaint.km_at_service) }).eq('id', maintenanceVehicleId);
            }
            setIsMaintenanceModalOpen(false);
            setNewMaint({
                type: 'PREVENTIVO', description: '', cost: '', km_at_service: '', next_service_km: '',
                date: new Date().toISOString().split('T')[0], next_service_date: '', provider: ''
            });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al registrar mantenimiento.');
        } finally { setIsSubmitting(false); }
    };

    const handleToggleStatus = async (vehicleId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'AVAILABLE' ? 'MAINTENANCE' : currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : currentStatus;
        if (currentStatus === 'IN_SERVICE') {
            await supabase.from('vehicles').update({ status: 'AVAILABLE', assigned_to: null }).eq('id', vehicleId);
        } else {
            await supabase.from('vehicles').update({ status: nextStatus }).eq('id', vehicleId);
        }
        fetchData();
    };

    const openMaintenanceModal = (vehicleId: string) => {
        setMaintenanceVehicleId(vehicleId);
        setIsMaintenanceModalOpen(true);
    };

    const filtered = vehicles.filter(v => {
        const matchSearch = v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'ALL' || v.type === filterType;
        const matchSt = filterStatus === 'ALL' || v.status === filterStatus;
        return matchSearch && matchType && matchSt;
    });

    const statusLabel = (s: string) => {
        const map: Record<string, { label: string; cls: string; dotCls: string }> = {
            'AVAILABLE': { label: 'Disponible', cls: 'bg-emerald-500/20 text-emerald-400', dotCls: 'bg-emerald-400' },
            'IN_SERVICE': { label: 'En Servicio', cls: 'bg-primary/20 text-primary', dotCls: 'bg-primary' },
            'MAINTENANCE': { label: 'En Taller', cls: 'bg-orange-500/20 text-orange-400', dotCls: 'bg-orange-400' },
            'DECOMMISSIONED': { label: 'De Baja', cls: 'bg-red-500/20 text-red-400', dotCls: 'bg-red-400' },
        };
        return map[s] || { label: s, cls: 'bg-slate-700 text-slate-300', dotCls: 'bg-slate-400' };
    };

    const getDaysUntil = (dateStr: string | null) => {
        if (!dateStr) return null;
        return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    const expirationBadge = (dateStr: string | null, label: string) => {
        const days = getDaysUntil(dateStr);
        if (days === null) return null;
        let cls = 'text-emerald-400';
        if (days < 0) cls = 'text-red-400';
        else if (days < 30) cls = 'text-orange-400';
        return (
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1"><Calendar size={11} />{label}:</span>
                <span className={`font-mono flex items-center gap-1 ${cls}`}>
                    {days < 0 && <AlertTriangle size={11} />}
                    {days < 0 ? `Vencido (${Math.abs(days)}d)` : days < 30 ? `${days} días` : new Date(dateStr!).toLocaleDateString()}
                </span>
            </div>
        );
    };

    const needsService = (v: any) => {
        const records = maintenanceMap[v.id] || [];
        if (records.length === 0) return false;
        const latest = records[0];
        if (latest.next_service_km && v.km_current >= latest.next_service_km) return true;
        if (latest.next_service_date && new Date(latest.next_service_date) <= new Date()) return true;
        return false;
    };

    // Summary stats
    const inService = vehicles.filter(v => v.status === 'IN_SERVICE').length;
    const inMaintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
    const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
    const needsServiceCount = vehicles.filter(v => needsService(v)).length;

    // Expiration alerts
    const today = new Date();
    const insuranceExpired = vehicles.filter(v => v.insurance_expiration && new Date(v.insurance_expiration) < today);
    const insuranceSoon = vehicles.filter(v => {
        if (!v.insurance_expiration) return false;
        const d = Math.ceil((new Date(v.insurance_expiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return d >= 0 && d <= 30;
    });
    const patentExpired = vehicles.filter(v => v.inspection_expiration && new Date(v.inspection_expiration) < today);
    const patentSoon = vehicles.filter(v => {
        if (!v.inspection_expiration) return false;
        const d = Math.ceil((new Date(v.inspection_expiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return d >= 0 && d <= 30;
    });
    const totalExpAlerts = insuranceExpired.length + patentExpired.length;

    const formatCurrency = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Expiration Alerts Dashboard */}
            {(totalExpAlerts > 0 || insuranceSoon.length > 0 || patentSoon.length > 0) && (
                <div className="glassmorphism rounded-2xl p-5 border border-red-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold text-sm font-grotesk flex items-center gap-2">
                            <ShieldAlert size={16} className="text-red-400" /> Alertas de Vencimiento — Flota Vehicular
                        </h3>
                        {totalExpAlerts > 0 && (
                            <span className="bg-red-500/20 text-red-400 text-[10px] px-3 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
                                <AlertTriangle size={12} /> {totalExpAlerts} DOCUMENTO(S) VENCIDOS
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-400 font-grotesk">{insuranceExpired.length}</p>
                            <p className="text-red-400/70 text-[10px] font-bold mt-1">🔴 Seguro Vencido</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400 font-grotesk">{insuranceSoon.length}</p>
                            <p className="text-orange-400/70 text-[10px] font-bold mt-1">🟡 Seguro Próx. (30d)</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-400 font-grotesk">{patentExpired.length}</p>
                            <p className="text-red-400/70 text-[10px] font-bold mt-1">🔴 Patente Vencida</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400 font-grotesk">{patentSoon.length}</p>
                            <p className="text-orange-400/70 text-[10px] font-bold mt-1">🟡 Patente Próx. (30d)</p>
                        </div>
                    </div>
                    {(insuranceExpired.length > 0 || patentExpired.length > 0) && (
                        <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1">
                            {insuranceExpired.map(v => (
                                <span key={`ins-${v.id}`} className="bg-red-500/20 text-red-300 text-[11px] px-2 py-1 rounded font-mono mr-2 inline-block">
                                    🛡️ {v.brand} {v.model} ({v.plate_number}) — Seguro venció: {new Date(v.insurance_expiration).toLocaleDateString()}
                                </span>
                            ))}
                            {patentExpired.map(v => (
                                <span key={`pat-${v.id}`} className="bg-red-500/20 text-red-300 text-[11px] px-2 py-1 rounded font-mono mr-2 inline-block">
                                    📋 {v.brand} {v.model} ({v.plate_number}) — Patente venció: {new Date(v.inspection_expiration).toLocaleDateString()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Fleet Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-white font-grotesk">{vehicles.length}</p>
                    <p className="text-slate-400 text-xs mt-1">Total Vehículos</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary font-grotesk">{inService}</p>
                    <p className="text-slate-400 text-xs mt-1">En Servicio</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-emerald-400 font-grotesk">{available}</p>
                    <p className="text-slate-400 text-xs mt-1">Disponibles</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-orange-400 font-grotesk">{inMaintenance}</p>
                    <p className="text-slate-400 text-xs mt-1">En Taller</p>
                </div>
                <div className={`glassmorphism p-4 rounded-xl text-center ${needsServiceCount > 0 ? 'border border-red-500/30' : ''}`}>
                    <p className={`text-2xl font-bold font-grotesk ${needsServiceCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{needsServiceCount}</p>
                    <p className="text-slate-400 text-xs mt-1">⚠ Service Pendiente</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Buscar por marca, modelo, placa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        <option value="ALL">Tipo</option>
                        {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        <option value="ALL">Estado</option>
                        <option value="AVAILABLE">Disponible</option>
                        <option value="IN_SERVICE">En Servicio</option>
                        <option value="MAINTENANCE">En Taller</option>
                    </select>
                    <button onClick={() => setIsRegisterModalOpen(true)} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(19,91,236,0.2)]">
                        <Plus size={16} /> Registrar Vehículo
                    </button>
                </div>
            </div>

            {/* Vehicles Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-slate-500"><Loader2 size={32} className="mx-auto animate-spin mb-3" />Cargando flota...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-4xl mb-4 opacity-30">🚛</p>
                    <p>No se encontraron vehículos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(v => {
                        const st = statusLabel(v.status);
                        const vType = VEHICLE_TYPES[v.type] || { label: v.type, emoji: '🚐' };
                        const records = maintenanceMap[v.id] || [];
                        const isExpanded = expandedVehicle === v.id;
                        const serviceAlert = needsService(v);
                        return (
                            <div key={v.id} className={`glassmorphism rounded-xl border transition-colors ${serviceAlert ? 'border-red-500/40' : 'border-slate-700/50 hover:border-slate-600'}`}>
                                <div className="p-5">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{vType.emoji}</span>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">{v.brand} {v.model}</h4>
                                                <p className="text-slate-500 text-xs">{vType.label} {v.year ? `• ${v.year}` : ''} {v.color ? `• ${v.color}` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${st.cls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`}></span>{st.label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => {
                                                    setEditingVehicle(v);
                                                    setEditVehicleForm({
                                                        type: v.type || '', brand: v.brand || '', model: v.model || '',
                                                        year: v.year ? v.year.toString() : '', plate_number: v.plate_number || '',
                                                        color: v.color || '', vin: v.vin || '', fuel_type: v.fuel_type || 'GASOLINA',
                                                        km_current: v.km_current ? v.km_current.toString() : '0',
                                                        assigned_to: v.assigned_to || '',
                                                        insurance_expiration: v.insurance_expiration ? v.insurance_expiration.split('T')[0] : '',
                                                        inspection_expiration: v.inspection_expiration ? v.inspection_expiration.split('T')[0] : '',
                                                        municipality: v.municipality || '', notes: v.notes || ''
                                                    });
                                                }} className="p-1 text-slate-400 hover:text-blue-400 transition-colors" title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteVehicle(v.id)} className="p-1 text-slate-400 hover:text-red-400 transition-colors" title="Eliminar">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1.5 text-xs">
                                        {v.plate_number && <div className="flex justify-between"><span className="text-slate-500">Placa:</span><span className="text-white font-mono font-bold tracking-wider">{v.plate_number}</span></div>}
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1"><Fuel size={11} />Combustible:</span>
                                            <span className="text-slate-300">{v.fuel_type}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Kilometraje:</span>
                                            <span className="text-white font-mono">{(v.km_current || 0).toLocaleString()} km</span>
                                        </div>
                                        {expirationBadge(v.insurance_expiration, 'Seguro')}
                                        {expirationBadge(v.inspection_expiration, 'Patente')}
                                        {v.municipality && (
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 flex items-center gap-1"><MapPin size={11} />Municipio:</span>
                                                <span className="text-slate-300">{v.municipality}</span>
                                            </div>
                                        )}
                                        {serviceAlert && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-red-400 text-[11px] font-bold mt-1">
                                                <AlertTriangle size={12} /> Service pendiente — km o fecha excedidos
                                            </div>
                                        )}
                                    </div>

                                    {/* Assigned + Actions */}
                                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                        {v.status === 'IN_SERVICE' && v.guards ? (
                                            <div className="text-xs">
                                                <span className="text-slate-500">Conductor: </span>
                                                <span className="text-white font-medium">{v.guards.first_name} {v.guards.last_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600">Sin asignar</span>
                                        )}
                                        <div className="flex gap-1.5">
                                            <button onClick={() => openMaintenanceModal(v.id)}
                                                className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                                <Wrench size={11} /> Mant.
                                            </button>
                                            {v.status === 'IN_SERVICE' && (
                                                <button onClick={() => handleToggleStatus(v.id, v.status)}
                                                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                                    <CheckCircle2 size={11} /> Liberar
                                                </button>
                                            )}
                                            {v.status === 'AVAILABLE' && (
                                                <button onClick={() => handleToggleStatus(v.id, v.status)}
                                                    className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                                    <Wrench size={11} /> Taller
                                                </button>
                                            )}
                                            {v.status === 'MAINTENANCE' && (
                                                <button onClick={() => handleToggleStatus(v.id, v.status)}
                                                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                                    <CheckCircle2 size={11} /> Listo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Maintenance History Expander */}
                                <div className="border-t border-slate-700/30">
                                    <button onClick={() => setExpandedVehicle(isExpanded ? null : v.id)}
                                        className="w-full px-5 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
                                        <span className="flex items-center gap-1"><Wrench size={12} /> Historial de Mantenimiento ({records.length})</span>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    {isExpanded && (
                                        <div className="px-5 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            {records.length === 0 ? (
                                                <p className="text-slate-600 text-xs text-center py-3 border border-dashed border-slate-700 rounded-lg">Sin registros de mantenimiento</p>
                                            ) : (
                                                records.slice(0, 5).map(m => {
                                                    const mt = MAINT_TYPES[m.type] || { label: m.type, emoji: '🔩' };
                                                    return (
                                                        <div key={m.id} className="bg-slate-800/50 rounded-lg p-3 text-xs space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-white font-medium flex items-center gap-1.5">{mt.emoji} {mt.label}</span>
                                                                <span className="text-slate-500 font-mono">{new Date(m.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-slate-400">{m.description}</p>
                                                            <div className="flex gap-3 text-[11px] text-slate-500">
                                                                {m.cost > 0 && <span>💰 {formatCurrency(m.cost)}</span>}
                                                                {m.km_at_service && <span>📍 {m.km_at_service.toLocaleString()} km</span>}
                                                                {m.provider && <span>🏪 {m.provider}</span>}
                                                            </div>
                                                            {m.next_service_km && (
                                                                <div className="text-[11px] text-orange-400/70">
                                                                    Próx. service: {m.next_service_km.toLocaleString()} km {m.next_service_date ? `| ${new Date(m.next_service_date).toLocaleDateString()}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Register Vehicle Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white font-grotesk">Registrar Nuevo Vehículo</h3>
                            <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Tipo *</label>
                                    <select required value={newVehicle.type} onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Seleccionar</option>
                                        {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Marca *</label>
                                    <input required type="text" value={newVehicle.brand} onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Toyota" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Modelo *</label>
                                    <input required type="text" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Hilux 4x4" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Año</label>
                                    <input type="number" value={newVehicle.year} onChange={e => setNewVehicle({ ...newVehicle, year: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="2024" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Placa</label>
                                    <input type="text" value={newVehicle.plate_number} onChange={e => setNewVehicle({ ...newVehicle, plate_number: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono" placeholder="ABC-1234" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Color</label>
                                    <input type="text" value={newVehicle.color} onChange={e => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Blanco" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Combustible</label>
                                    <select value={newVehicle.fuel_type} onChange={e => setNewVehicle({ ...newVehicle, fuel_type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="GASOLINA">Gasolina</option>
                                        <option value="DIESEL">Diésel</option>
                                        <option value="GAS">Gas</option>
                                        <option value="ELECTRICO">Eléctrico</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">VIN (Chasis)</label>
                                    <input type="text" value={newVehicle.vin} onChange={e => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Km Actuales</label>
                                    <input type="number" value={newVehicle.km_current} onChange={e => setNewVehicle({ ...newVehicle, km_current: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Conductor Asignado</label>
                                    <select value={newVehicle.assigned_to} onChange={e => setNewVehicle({ ...newVehicle, assigned_to: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Sin asignar</option>
                                        {guards.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Vencimiento de Seguro</label>
                                    <input type="date" value={newVehicle.insurance_expiration} onChange={e => setNewVehicle({ ...newVehicle, insurance_expiration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Venc. Patente de Rodados</label>
                                    <input type="date" value={newVehicle.inspection_expiration} onChange={e => setNewVehicle({ ...newVehicle, inspection_expiration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={12} /> Municipio Registro</label>
                                    <input type="text" value={newVehicle.municipality} onChange={e => setNewVehicle({ ...newVehicle, municipality: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Ej: Asunción" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Notas</label>
                                <textarea value={newVehicle.notes} onChange={e => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none h-16" placeholder="GPS, blindaje, etc." />
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

            {/* Edit Vehicle Modal */}
            {editingVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white font-grotesk">Editar Vehículo</h3>
                            <button onClick={() => setEditingVehicle(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateVehicle} className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Tipo *</label>
                                    <select required value={editVehicleForm.type} onChange={e => setEditVehicleForm({ ...editVehicleForm, type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Seleccionar</option>
                                        {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Marca *</label>
                                    <input required type="text" value={editVehicleForm.brand} onChange={e => setEditVehicleForm({ ...editVehicleForm, brand: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Modelo *</label>
                                    <input required type="text" value={editVehicleForm.model} onChange={e => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Año</label>
                                    <input type="number" value={editVehicleForm.year} onChange={e => setEditVehicleForm({ ...editVehicleForm, year: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Placa</label>
                                    <input type="text" value={editVehicleForm.plate_number} onChange={e => setEditVehicleForm({ ...editVehicleForm, plate_number: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Color</label>
                                    <input type="text" value={editVehicleForm.color} onChange={e => setEditVehicleForm({ ...editVehicleForm, color: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Combustible</label>
                                    <select value={editVehicleForm.fuel_type} onChange={e => setEditVehicleForm({ ...editVehicleForm, fuel_type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="GASOLINA">Gasolina</option>
                                        <option value="DIESEL">Diésel</option>
                                        <option value="GAS">Gas</option>
                                        <option value="ELECTRICO">Eléctrico</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">VIN (Chasis)</label>
                                    <input type="text" value={editVehicleForm.vin} onChange={e => setEditVehicleForm({ ...editVehicleForm, vin: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Km Actuales</label>
                                    <input type="number" value={editVehicleForm.km_current} onChange={e => setEditVehicleForm({ ...editVehicleForm, km_current: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Conductor Asignado</label>
                                    <select value={editVehicleForm.assigned_to} onChange={e => setEditVehicleForm({ ...editVehicleForm, assigned_to: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="">Sin asignar</option>
                                        {guards.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Vencimiento de Seguro</label>
                                    <input type="date" value={editVehicleForm.insurance_expiration} onChange={e => setEditVehicleForm({ ...editVehicleForm, insurance_expiration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Venc. Patente de Rodados</label>
                                    <input type="date" value={editVehicleForm.inspection_expiration} onChange={e => setEditVehicleForm({ ...editVehicleForm, inspection_expiration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={12} /> Municipio Registro</label>
                                    <input type="text" value={editVehicleForm.municipality} onChange={e => setEditVehicleForm({ ...editVehicleForm, municipality: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Notas</label>
                                <textarea value={editVehicleForm.notes} onChange={e => setEditVehicleForm({ ...editVehicleForm, notes: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none h-16" />
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingVehicle(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Maintenance Modal */}
            {isMaintenanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><Wrench className="text-violet-400" /> Registrar Mantenimiento</h3>
                            <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddMaintenance} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Tipo de Servicio *</label>
                                    <select required value={newMaint.type} onChange={e => setNewMaint({ ...newMaint, type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        {Object.entries(MAINT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                                    <input required type="date" value={newMaint.date} onChange={e => setNewMaint({ ...newMaint, date: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
                                <textarea required value={newMaint.description} onChange={e => setNewMaint({ ...newMaint, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none h-16" placeholder="Cambio de aceite sintético 10W-40, filtro de aceite..." />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Costo (G.)</label>
                                    <input type="number" value={newMaint.cost} onChange={e => setNewMaint({ ...newMaint, cost: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="350000" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Km Actual</label>
                                    <input type="number" value={newMaint.km_at_service} onChange={e => setNewMaint({ ...newMaint, km_at_service: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="45000" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Proveedor</label>
                                    <input type="text" value={newMaint.provider} onChange={e => setNewMaint({ ...newMaint, provider: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="Taller Mecánico XYZ" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Próx. Service (km)</label>
                                    <input type="number" value={newMaint.next_service_km} onChange={e => setNewMaint({ ...newMaint, next_service_km: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="50000" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Próx. Service (Fecha)</label>
                                    <input type="date" value={newMaint.next_service_date} onChange={e => setNewMaint({ ...newMaint, next_service_date: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />} Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabFlota;
