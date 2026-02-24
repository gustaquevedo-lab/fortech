import { type FC, useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, FileText, MapPin, Clock, LogIn, LogOut, CheckCircle2, HelpCircle, Loader2, Shield, AlertTriangle, X, Target, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Haversine formula — distance in meters between two lat/lng
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const GEOFENCE_RADIUS = 500; // meters

const PortalEmpleado: FC = () => {
    const { user } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'inicio' | 'turnos' | 'recibos' | 'historial'>('inicio');
    const [isLoading, setIsLoading] = useState(true);

    // Attendance
    const [todayLog, setTodayLog] = useState<any>(null);
    const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distanceToPost, setDistanceToPost] = useState<number | null>(null);
    const [isInsideGeofence, setIsInsideGeofence] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

    // Weapon handover modal
    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [weaponAction, setWeaponAction] = useState<'CHECKIN' | 'CHECKOUT'>('CHECKIN');
    const [assignedWeapon, setAssignedWeapon] = useState<any>(null);
    const [ammoExpected, setAmmoExpected] = useState(0);
    const [ammoActual, setAmmoActual] = useState('');
    const [ammoNotes, setAmmoNotes] = useState('');
    const [outgoingGuardName, setOutgoingGuardName] = useState('');

    // Shifts, payslips
    const [shifts, setShifts] = useState<any[]>([]);
    const [payslips, setPayslips] = useState<any[]>([]);

    // Post info
    const [assignedPost, setAssignedPost] = useState<any>(null);

    // Live clock
    const [now, setNow] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Get guard linked to this auth user
            const { data: guard } = await supabase
                .from('guards')
                .select('*, posts:current_post_id(id, name, address, lat, lng, latitude, longitude)')
                .eq('user_id', user.id)
                .single();

            if (!guard) {
                // Fallback: get first guard (for demo)
                const { data: fallback } = await supabase
                    .from('guards')
                    .select('*, posts:current_post_id(id, name, address, lat, lng, latitude, longitude)')
                    .limit(1)
                    .single();
                if (fallback) {
                    setEmployee(fallback);
                    setAssignedPost(fallback.posts);
                }
            } else {
                setEmployee(guard);
                setAssignedPost(guard.posts);
            }

            const guardId = guard?.id || (await supabase.from('guards').select('id').limit(1).single()).data?.id;
            if (!guardId) return;

            // Today's attendance
            const today = new Date().toISOString().split('T')[0];
            const { data: todayAtt } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('guard_id', guardId)
                .gte('check_in', today + 'T00:00:00')
                .order('check_in', { ascending: false })
                .limit(1)
                .single();
            setTodayLog(todayAtt);

            // Attendance history
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select('*, posts:post_id(name)')
                .eq('guard_id', guardId)
                .order('check_in', { ascending: false })
                .limit(30);
            setAttendanceLogs(logs || []);

            // Weapon assigned to this guard
            const { data: weapon } = await supabase
                .from('weapons')
                .select('*')
                .eq('assigned_to', guardId)
                .limit(1)
                .single();
            setAssignedWeapon(weapon);
            if (weapon) setAmmoExpected(weapon.ammo_count || 0);

            // Shifts
            const { data: sh } = await supabase
                .from('shifts')
                .select('*, posts:post_id(name), clients:client_id(name)')
                .eq('guard_id', guardId)
                .gte('date', today)
                .order('date', { ascending: true })
                .limit(10);
            setShifts(sh || []);

            // Payslips
            const { data: ps } = await supabase
                .from('payslips')
                .select('*')
                .eq('guard_id', guardId)
                .order('period_year', { ascending: false })
                .order('period_month', { ascending: false })
                .limit(12);
            setPayslips(ps || []);

        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Geolocation
    const getLocation = (): Promise<GeolocationPosition> =>
        new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Geolocalización no soportada'));
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
        });

    const requestGeolocation = async () => {
        setGeoStatus('loading');
        try {
            const pos = await getLocation();
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentCoords(coords);

            // Calculate distance to assigned post
            const postLat = assignedPost?.lat || assignedPost?.latitude;
            const postLng = assignedPost?.lng || assignedPost?.longitude;
            if (postLat && postLng) {
                const dist = haversine(coords.lat, coords.lng, Number(postLat), Number(postLng));
                setDistanceToPost(Math.round(dist));
                setIsInsideGeofence(dist <= GEOFENCE_RADIUS);
            } else {
                setDistanceToPost(null);
                setIsInsideGeofence(true); // No post coords → allow
            }
            setGeoStatus('success');
        } catch {
            setGeoStatus('error');
        }
    };

    // Check In flow
    const handleCheckIn = async () => {
        if (!currentCoords || !employee) return;
        // If guard has a weapon, show weapon verification first
        if (assignedWeapon) {
            setWeaponAction('CHECKIN');
            setAmmoActual(String(ammoExpected));
            setAmmoNotes('');
            setOutgoingGuardName('');
            setShowWeaponModal(true);
        } else {
            await executeCheckIn();
        }
    };

    const executeCheckIn = async () => {
        if (!currentCoords || !employee) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('attendance_logs').insert({
                guard_id: employee.id,
                post_id: assignedPost?.id || employee.current_post_id,
                check_in: new Date().toISOString(),
                check_in_lat: currentCoords.lat,
                check_in_lng: currentCoords.lng,
                inside_geofence: isInsideGeofence,
                type: 'REGULAR',
                status: isInsideGeofence ? 'CONFIRMED' : 'FLAGGED',
            });
            if (error) throw error;
            await fetchData();
            setGeoStatus('idle');
        } catch (e) { console.error(e); alert('Error al marcar entrada'); }
        finally { setIsSubmitting(false); }
    };

    // Check Out flow
    const handleCheckOut = async () => {
        if (!currentCoords || !employee || !todayLog) return;
        if (assignedWeapon) {
            setWeaponAction('CHECKOUT');
            setAmmoActual(String(ammoExpected));
            setAmmoNotes('');
            setShowWeaponModal(true);
        } else {
            await executeCheckOut();
        }
    };

    const executeCheckOut = async () => {
        if (!currentCoords || !employee || !todayLog) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('attendance_logs').update({
                check_out: new Date().toISOString(),
                check_out_lat: currentCoords.lat,
                check_out_lng: currentCoords.lng,
            }).eq('id', todayLog.id);
            if (error) throw error;
            await fetchData();
            setGeoStatus('idle');
        } catch (e) { console.error(e); alert('Error al marcar salida'); }
        finally { setIsSubmitting(false); }
    };

    // Weapon handover confirmation
    const handleWeaponConfirm = async () => {
        if (!assignedWeapon || !employee) return;
        setIsSubmitting(true);
        try {
            const ammoNum = parseInt(ammoActual) || 0;
            const needsNotes = ammoNum < ammoExpected;

            if (needsNotes && !ammoNotes.trim()) {
                alert('Debes indicar la razón por la que hay menos municiones.');
                setIsSubmitting(false);
                return;
            }

            // Log weapon handover
            await supabase.from('weapon_logs').insert({
                weapon_id: assignedWeapon.id,
                guard_id: employee.id,
                post_id: assignedPost?.id || employee.current_post_id,
                action: weaponAction,
                ammo_received: weaponAction === 'CHECKIN' ? ammoNum : null,
                ammo_delivered: weaponAction === 'CHECKOUT' ? ammoNum : null,
                notes: [
                    outgoingGuardName ? `Guardia saliente: ${outgoingGuardName}` : '',
                    ammoNotes ? `Observación munición: ${ammoNotes}` : '',
                ].filter(Boolean).join(' | ') || null,
            });

            // Update weapon ammo count
            await supabase.from('weapons').update({ ammo_count: ammoNum }).eq('id', assignedWeapon.id);

            setShowWeaponModal(false);

            // Continue with check-in or check-out
            if (weaponAction === 'CHECKIN') {
                await executeCheckIn();
            } else {
                await executeCheckOut();
            }
        } catch (e) { console.error(e); alert('Error al registrar armamento'); }
        finally { setIsSubmitting(false); }
    };

    // Computed
    const ammoDiff = useMemo(() => {
        const actual = parseInt(ammoActual) || 0;
        return actual - ammoExpected;
    }, [ammoActual, ammoExpected]);

    const hasCheckedIn = !!todayLog && !todayLog.check_out;
    const hasCompleted = !!todayLog?.check_out;

    const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d: string) => new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatCurrency = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

    const tabCls = (t: string) => `flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === t ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`;

    if (isLoading) return <div className="flex h-[80vh] items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Cargando tu portal...</div>;
    if (!employee) return <div className="flex h-[80vh] items-center justify-center text-slate-500">Perfil de empleado no encontrado.</div>;

    return (
        <div className="animate-in fade-in duration-500 space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Hola, {employee.first_name} 👋</h2>
                    <p className="text-slate-400 mt-1 max-w-xl">Portal de autogestión — marca tu asistencia, verifica armamento y consulta tus turnos.</p>
                </div>
                <div className="flex bg-slate-800/60 rounded-full px-4 py-2 border border-slate-700/50 items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm text-slate-300 font-medium">Conectado ({employee.employee_type || 'GUARDIA'})</span>
                </div>
            </header>

            {/* Attendance Widget */}
            <div className="glassmorphism p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-slate-900 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase mb-2 text-sm">
                            <Clock size={16} /> Marcación de Horario
                        </div>
                        <h3 className="text-4xl text-white font-bold font-mono tracking-tighter mb-1">
                            {now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">{now.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

                        {/* Geolocation status */}
                        {geoStatus === 'idle' && !hasCompleted && (
                            <button onClick={requestGeolocation} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all mb-3">
                                <Navigation size={18} /> Obtener mi Ubicación
                            </button>
                        )}

                        {geoStatus === 'loading' && (
                            <div className="flex items-center gap-2 text-blue-400 mb-3">
                                <Loader2 size={18} className="animate-spin" /> Obteniendo ubicación GPS...
                            </div>
                        )}

                        {geoStatus === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} /> Error al obtener ubicación. Verifica los permisos del navegador.
                                <button onClick={requestGeolocation} className="underline ml-2">Reintentar</button>
                            </div>
                        )}

                        {geoStatus === 'success' && currentCoords && (
                            <div className="mb-4 space-y-2">
                                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 border ${isInsideGeofence ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                                    <Target size={16} />
                                    {distanceToPost !== null ? (
                                        <span>Distancia al puesto: <strong>{distanceToPost}m</strong> {isInsideGeofence ? '✓ Dentro del perímetro' : `⚠ Fuera del perímetro (máx ${GEOFENCE_RADIUS}m)`}</span>
                                    ) : (
                                        <span>Ubicación capturada: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        {geoStatus === 'success' && (
                            <div className="flex flex-wrap gap-4">
                                {!hasCheckedIn && !hasCompleted && (
                                    <button onClick={handleCheckIn} disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />} Marcar Entrada
                                    </button>
                                )}
                                {hasCheckedIn && (
                                    <button onClick={handleCheckOut} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />} Marcar Salida
                                    </button>
                                )}
                                {hasCompleted && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                                        <CheckCircle2 size={20} /> Turno completado hoy
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right side — post & status */}
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm self-stretch flex flex-col justify-center">
                        <h4 className="text-slate-300 font-medium mb-3 text-sm">Tu Puesto Asignado</h4>
                        {assignedPost ? (
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-bold">{assignedPost.name}</span>
                                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-bold">Asignado</span>
                                </div>
                                {assignedPost.address && (
                                    <div className="text-sm text-slate-400 flex items-center gap-1.5">
                                        <MapPin size={14} /> {assignedPost.address}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm">Sin puesto asignado actualmente.</div>
                        )}

                        {todayLog && (
                            <div className="mt-3 text-xs text-slate-400 space-y-1">
                                <div className="flex items-center gap-1"><LogIn size={12} className="text-emerald-400" /> Entrada: {formatTime(todayLog.check_in)}</div>
                                {todayLog.check_out && <div className="flex items-center gap-1"><LogOut size={12} className="text-orange-400" /> Salida: {formatTime(todayLog.check_out)}</div>}
                            </div>
                        )}

                        {assignedWeapon && (
                            <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                <div className="text-xs text-red-400 font-bold flex items-center gap-1"><Shield size={12} /> Armamento Asignado</div>
                                <div className="text-sm text-white mt-1">{assignedWeapon.type} — {assignedWeapon.serial_number}</div>
                                <div className="text-xs text-slate-400">{assignedWeapon.brand} {assignedWeapon.model} | Cal. {assignedWeapon.caliber} | Municiones: {assignedWeapon.ammo_count || 0}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('inicio')} className={tabCls('inicio')}>Resumen</button>
                <button onClick={() => setActiveTab('turnos')} className={tabCls('turnos')}>Mis Turnos</button>
                <button onClick={() => setActiveTab('recibos')} className={tabCls('recibos')}>Mis Recibos</button>
                <button onClick={() => setActiveTab('historial')} className={tabCls('historial')}>Historial Asistencia</button>
            </div>

            {/* Tab: Resumen */}
            {activeTab === 'inicio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glassmorphism p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <HelpCircle className="text-primary" size={20} /> Información Útil
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Al marcar entrada, tu ubicación GPS se compara con las coordenadas del puesto asignado.</div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Si tenés armamento asignado, un modal de verificación aparecerá al iniciar/finalizar turno.</div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Los recibos de salario se generan los días 05 de cada mes.</div>
                            </li>
                        </ul>
                    </div>

                    <div className="glassmorphism p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-primary" size={20} /> Último Recibo
                        </h3>
                        {payslips.length > 0 ? (
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                <h4 className="text-white font-medium">Liquidación — {payslips[0].period_month}/{payslips[0].period_year}</h4>
                                <p className="text-slate-400 text-xs mt-1 mb-2">Neto: {formatCurrency(payslips[0].net_pay || 0)}</p>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${payslips[0].status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {payslips[0].status === 'PAID' ? 'Pagado' : 'Borrador'}
                                </span>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay recibos disponibles aún.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Turnos */}
            {activeTab === 'turnos' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Mis Próximos Turnos</h3>
                    {shifts.length > 0 ? (
                        <div className="space-y-3">
                            {shifts.map(s => (
                                <div key={s.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                                    <div>
                                        <div className="text-white font-medium">{formatDate(s.date)} — {s.start_time?.slice(0, 5)} a {s.end_time?.slice(0, 5)}</div>
                                        <div className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                                            <MapPin size={14} /> {s.posts?.name || 'Sin puesto'} {s.clients?.name ? `• ${s.clients.name}` : ''}
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' : s.status === 'MISSED' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                        {s.status === 'SCHEDULED' ? 'Programado' : s.status === 'IN_PROGRESS' ? 'En Curso' : s.status === 'COMPLETED' ? 'Completado' : 'Perdido'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No tienes turnos programados a futuro.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Recibos */}
            {activeTab === 'recibos' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Mis Recibos y Liquidaciones</h3>
                    {payslips.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead><tr className="text-slate-400 border-b border-slate-700">
                                    <th className="pb-2">Período</th><th className="pb-2">Salario Base</th><th className="pb-2">Bonif.</th><th className="pb-2">Desc.</th><th className="pb-2">Neto</th><th className="pb-2">Estado</th>
                                </tr></thead>
                                <tbody>
                                    {payslips.map(p => (
                                        <tr key={p.id} className="border-b border-slate-800 text-slate-300">
                                            <td className="py-3 text-white font-medium">{p.period_month}/{p.period_year}</td>
                                            <td>{formatCurrency(p.base_salary_pro_rated || 0)}</td>
                                            <td className="text-emerald-400">{formatCurrency(p.bonuses_total || 0)}</td>
                                            <td className="text-red-400">-{formatCurrency(p.discounts_total || 0)}</td>
                                            <td className="text-white font-bold">{formatCurrency(p.net_pay || 0)}</td>
                                            <td><span className={`text-xs px-2 py-0.5 rounded font-bold ${p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status === 'PAID' ? 'Pagado' : 'Borrador'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No hay recibos disponibles.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Historial */}
            {activeTab === 'historial' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Historial de Asistencia (últimos 30)</h3>
                    {attendanceLogs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead><tr className="text-slate-400 border-b border-slate-700">
                                    <th className="pb-2">Fecha</th><th className="pb-2">Entrada</th><th className="pb-2">Salida</th><th className="pb-2">Puesto</th><th className="pb-2">Geofence</th>
                                </tr></thead>
                                <tbody>
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-800 text-slate-300">
                                            <td className="py-3 text-white">{formatDate(log.check_in)}</td>
                                            <td>{formatTime(log.check_in)}</td>
                                            <td>{log.check_out ? formatTime(log.check_out) : <span className="text-yellow-400">—</span>}</td>
                                            <td>{log.posts?.name || '—'}</td>
                                            <td>
                                                {log.inside_geofence ? (
                                                    <span className="text-emerald-400 text-xs font-bold">✓ Dentro</span>
                                                ) : (
                                                    <span className="text-orange-400 text-xs font-bold">⚠ Fuera</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30 text-emerald-500/50" />
                            <p>No hay registros de asistencia aún.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Weapon Handover */}
            {showWeaponModal && assignedWeapon && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowWeaponModal(false)}>
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-700 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="text-red-400" size={22} />
                                {weaponAction === 'CHECKIN' ? 'Recepción de Armamento' : 'Entrega de Armamento'}
                            </h3>
                            <button onClick={() => setShowWeaponModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-sm text-slate-400">Arma asignada</div>
                            <div className="text-white font-bold mt-1">{assignedWeapon.type} — S/N: {assignedWeapon.serial_number}</div>
                            <div className="text-xs text-slate-500">{assignedWeapon.brand} {assignedWeapon.model} | Cal. {assignedWeapon.caliber}</div>
                        </div>

                        {weaponAction === 'CHECKIN' && (
                            <div>
                                <label className="text-sm text-slate-300 font-medium block mb-1">Guardia saliente (nombre)</label>
                                <input value={outgoingGuardName} onChange={e => setOutgoingGuardName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                    placeholder="Nombre del guardia que entrega el turno" />
                            </div>
                        )}

                        <div>
                            <label className="text-sm text-slate-300 font-medium block mb-1">Municiones (cantidad actual)</label>
                            <input type="number" value={ammoActual} onChange={e => setAmmoActual(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" />
                            <div className="text-xs text-slate-500 mt-1">Esperadas: {ammoExpected} municiones</div>
                        </div>

                        {ammoDiff < 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
                                <div className="text-sm text-red-400 font-bold flex items-center gap-1">
                                    <AlertTriangle size={14} /> Faltan {Math.abs(ammoDiff)} municiones
                                </div>
                                <label className="text-sm text-slate-300 font-medium block">Razón / Observaciones *</label>
                                <textarea value={ammoNotes} onChange={e => setAmmoNotes(e.target.value)} rows={3}
                                    className="w-full bg-slate-950 border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                                    placeholder="Explica por qué se utilizaron municiones..." required />
                            </div>
                        )}

                        {ammoDiff === 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm flex items-center gap-2">
                                <CheckCircle2 size={16} /> Cantidad de municiones correcta
                            </div>
                        )}

                        {ammoDiff > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm flex items-center gap-2">
                                <CheckCircle2 size={16} /> {ammoDiff} municiones más que lo registrado
                            </div>
                        )}

                        <button onClick={handleWeaponConfirm} disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            Confirmar {weaponAction === 'CHECKIN' ? 'Recepción' : 'Entrega'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalEmpleado;
