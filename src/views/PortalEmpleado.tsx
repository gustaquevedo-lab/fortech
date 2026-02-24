import { type FC, useState, useEffect } from 'react';
import { Calendar, FileText, MapPin, Clock, LogIn, LogOut, CheckCircle2, ChevronRight, HelpCircle, AlertTriangle, X, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Formula de Haversine para distancia en metros
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const PortalEmpleado: FC = () => {
    const { user } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'inicio' | 'turnos' | 'recibos' | 'ausencias' | 'prestamos' | 'historial'>('inicio');
    const [isLoading, setIsLoading] = useState(true);

    const [currentAttendance, setCurrentAttendance] = useState<any>(null);
    const [weaponInfo, setWeaponInfo] = useState<any>(null);

    // UI states
    const [clockError, setClockError] = useState<string | null>(null);
    const [clockSuccess, setClockSuccess] = useState<string | null>(null);
    const [isClocking, setIsClocking] = useState(false);

    // Weapon Modal
    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [actualAmmo, setActualAmmo] = useState<number>(0);
    const [handoverComments, setHandoverComments] = useState('');
    const [pendingClockInData, setPendingClockInData] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchEmployeeProfile();
        }
    }, [user]);

    const fetchEmployeeProfile = async () => {
        setIsLoading(true);
        try {
            const { data: guardData } = await supabase
                .from('guards')
                .select('*, posts(id, name, address, lat, lng)')
                .limit(1)
                .single();

            if (guardData) {
                setEmployee(guardData);

                // Fetch Today's Attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attData } = await supabase
                    .from('attendance_logs')
                    .select('*')
                    .eq('guard_id', guardData.id)
                    .eq('date', today)
                    .is('time_out', null)
                    .maybeSingle();

                if (attData) {
                    setCurrentAttendance(attData);
                }

                // Fetch Post's Weapon for Handover logic
                if (guardData.post_id) {
                    const { data: wData } = await supabase
                        .from('weapons')
                        .select('*')
                        .eq('assigned_post_id', guardData.post_id)
                        .maybeSingle();

                    if (wData) {
                        setWeaponInfo(wData);
                        setActualAmmo(wData.ammo_count || 0);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching profile", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClockInCoords = (coords: { latitude: number; longitude: number }) => {
        if (!employee) return;

        let statusIn = 'ON_TIME';

        // Check Geofence if Post has coordinates
        if (employee.posts && employee.posts.lat && employee.posts.lng) {
            const distance = getDistance(coords.latitude, coords.longitude, employee.posts.lat, employee.posts.lng);
            if (distance > 300) { // More than 300 meters away
                setClockError(`Cuidado: Estás a ${Math.round(distance)}m de tu puesto asignado. La marcación quedará flaggeada como Fuera de Rango.`);
                statusIn = 'OUT_OF_RANGE';
            }
        }

        const clockData = {
            guard_id: employee.id,
            post_id: employee.post_id,
            date: new Date().toISOString().split('T')[0],
            time_in: new Date().toLocaleTimeString('en-US', { hour12: false }),
            lat_in: coords.latitude,
            lng_in: coords.longitude,
            status_in: statusIn
        };

        if (weaponInfo && !currentAttendance) {
            // Need Handover
            setPendingClockInData(clockData);
            setShowWeaponModal(true);
            setIsClocking(false);
        } else {
            // Straight clock IN
            executeClockIn(clockData);
        }
    };

    const executeClockIn = async (clockData: any, weaponHandover?: any) => {
        setIsClocking(true);
        setClockError(null);
        try {
            // 1. Insert Attendance
            const { data: attRes, error: attError } = await supabase
                .from('attendance_logs')
                .insert([clockData])
                .select()
                .single();

            if (attError) throw attError;

            // 2. Insert Handover if applicable
            if (weaponHandover) {
                const { error: wError } = await supabase
                    .from('weapon_handovers')
                    .insert([{
                        weapon_id: weaponHandover.weapon_id,
                        post_id: employee.post_id,
                        receiving_guard_id: employee.id,
                        expected_ammo: weaponHandover.expected_ammo,
                        actual_ammo: weaponHandover.actual_ammo,
                        comments: weaponHandover.comments,
                        status: (weaponHandover.actual_ammo < weaponHandover.expected_ammo) ? 'MISSING_AMMO' : 'OK'
                    }]);
                if (wError) console.error("Handover log error:", wError);
            }

            setCurrentAttendance(attRes);
            setClockSuccess(`Marcación Exitosa: ¡Entrada registrada a las ${clockData.time_in}!`);
            setShowWeaponModal(false);

            setTimeout(() => setClockSuccess(null), 5000);
        } catch (error: any) {
            setClockError(error.message || "Error guardando asistencia");
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockInRequest = () => {
        setIsClocking(true);
        setClockError(null);
        setClockSuccess(null);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    handleClockInCoords(position.coords);
                },
                () => {
                    setIsClocking(false);
                    setClockError("Error obteniendo ubicación. Asegúrate de dar permisos de GPS. Marcación denegada.");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setIsClocking(false);
            setClockError("Geolocalización no soportada en este dispositivo.");
        }
    };

    const handleClockOutRequest = () => {
        if (!currentAttendance) return;
        setIsClocking(true);
        setClockError(null);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = position.coords;
                    let statusOut = 'ON_TIME';

                    if (employee.posts && employee.posts.lat && employee.posts.lng) {
                        const distance = getDistance(coords.latitude, coords.longitude, employee.posts.lat, employee.posts.lng);
                        if (distance > 300) {
                            statusOut = 'OUT_OF_RANGE';
                        }
                    }

                    try {
                        const timeOut = new Date().toLocaleTimeString('en-US', { hour12: false });
                        const { error } = await supabase
                            .from('attendance_logs')
                            .update({
                                time_out: timeOut,
                                lat_out: coords.latitude,
                                lng_out: coords.longitude,
                                status_out: statusOut
                            })
                            .eq('id', currentAttendance.id);

                        if (error) throw error;

                        setCurrentAttendance(null);
                        setClockSuccess(`Salida Registrada exitosamente a las ${timeOut}.`);
                        setTimeout(() => setClockSuccess(null), 5000);
                    } catch (error: any) {
                        setClockError(error.message || "Error al registrar salida");
                    } finally {
                        setIsClocking(false);
                    }
                },
                () => {
                    setIsClocking(false);
                    setClockError("Error obteniendo ubicación. Marcación denegada.");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setIsClocking(false);
            setClockError("Geolocalización no soportada.");
        }
    };

    if (isLoading) {
        return <div className="flex h-[80vh] items-center justify-center text-slate-500">Cargando tu portal...</div>;
    }

    if (!employee) {
        return <div className="flex h-[80vh] items-center justify-center text-slate-500">Perfil de empleado no encontrado.</div>;
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Hola, {employee.first_name} 👋</h2>
                    <p className="text-slate-400 mt-1 max-w-xl">
                        Bienvenido a tu portal de autogestión. Aquí puedes marcar tu entrada, revisar turnos y descargar recibos.
                    </p>
                </div>
                <div className="flex bg-slate-800/60 rounded-full px-4 py-2 border border-slate-700/50 items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm text-slate-300 font-medium">Conectado ({employee.employee_type || 'GUARDIA'})</span>
                </div>
            </header>

            {/* Error & Success Messages */}
            {clockError && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-400">
                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium">{clockError}</p>
                </div>
            )}

            {clockSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-xl flex items-start gap-3 text-emerald-400">
                    <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium">{clockSuccess}</p>
                </div>
            )}

            {/* Marcación Rápida Widget */}
            <div className={`glassmorphism p-6 rounded-3xl bg-gradient-to-br ${currentAttendance ? 'from-slate-800 to-slate-900 border-slate-700' : 'from-primary/10 to-slate-900 border-primary/20'} relative overflow-hidden transition-all duration-500`}>
                <div className={`absolute top-0 right-0 w-64 h-64 ${currentAttendance ? 'bg-slate-700/20' : 'bg-primary/20'} rounded-full blur-3xl -mr-20 -mt-20`}></div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className={`flex items-center gap-2 font-bold tracking-wider uppercase mb-2 text-sm ${currentAttendance ? 'text-slate-400' : 'text-primary'}`}>
                            <Clock size={16} /> Marcación de Horario
                        </div>
                        <h3 className="text-4xl text-white font-bold font-mono tracking-tighter mb-4">
                            {new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 flex items-start gap-2 max-w-md">
                            <MapPin size={16} className="shrink-0 mt-0.5" />
                            Tu ubicación actual será verificada con el objetivo {employee.posts?.name ? `(${employee.posts.name})` : ''} mediante GPS.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {!currentAttendance ? (
                                <button
                                    onClick={handleClockInRequest}
                                    disabled={isClocking}
                                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    <LogIn size={20} /> {isClocking ? 'Procesando...' : 'Marcar Entrada'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleClockOutRequest}
                                    disabled={isClocking}
                                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                    <LogOut size={20} /> {isClocking ? 'Procesando...' : 'Marcar Salida'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm self-stretch flex flex-col justify-center">
                        <h4 className="text-slate-300 font-medium mb-3 text-sm">Tu Turno Actual / Próximo</h4>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-bold">
                                    {currentAttendance ? `Marcaste entrada: ${currentAttendance.time_in?.substring(0, 5)}` : 'Turno Regular'}
                                </span>
                                {currentAttendance ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-bold">Activo</span>
                                ) : (
                                    <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-0.5 rounded font-bold">Pendiente</span>
                                )}
                            </div>
                            <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-700/50">
                                <MapPin size={14} className="text-primary" />
                                {employee.posts ? employee.posts.name : 'Sin puesto asignado'}
                            </div>
                            {weaponInfo && (
                                <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                                    <Target size={14} className="text-orange-400" />
                                    Arma Asignada: {weaponInfo.brand} {weaponInfo.model}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('inicio')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'inicio' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setActiveTab('turnos')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'turnos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Mis Turnos
                </button>
                <button
                    onClick={() => setActiveTab('recibos')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'recibos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Mis Recibos
                </button>
                <button
                    onClick={() => setActiveTab('ausencias')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ausencias' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Vacaciones / Reposos
                </button>
                <button
                    onClick={() => setActiveTab('prestamos')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'prestamos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Préstamos
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'historial' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    Mi Historial
                </button>
            </div>

            {/* Main Content Areas */}
            {activeTab === 'inicio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glassmorphism p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <HelpCircle className="text-primary" size={20} /> Información Útil
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Asegúrate de conceder permisos de ubicación a tu navegador para registrar la asistencia correctamente.</div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Los recibos de salario se generan los días 05 de cada mes. Las quincenas los días 20.</div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-0.5 text-primary"><CheckCircle2 size={16} /></div>
                                <div>Puedes solicitar Préstamos o Adelantos que se descontarán automáticamente de tu recibo mensual.</div>
                            </li>
                        </ul>
                    </div>

                    <div className="glassmorphism p-6 rounded-2xl flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-primary" size={20} /> Último Recibo
                        </h3>
                        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-primary/50 transition-colors cursor-pointer group">
                            <FileText size={32} className="text-slate-500 group-hover:text-primary transition-colors mb-2" />
                            <h4 className="text-white font-medium">Liquidación - Octubre 2024</h4>
                            <p className="text-slate-400 text-xs mt-1 mb-4">G. 2.700.000 neto (Generado el 05/11/2024)</p>
                            <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                Descargar PDF <ChevronRight size={16} />
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'turnos' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Mis Próximos Turnos</h3>
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No tienes turnos programados a futuro.</p>
                    </div>
                </div>
            )}

            {activeTab === 'recibos' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Mis Recibos y Liquidaciones</h3>
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No hay recibos disponibles aún.</p>
                    </div>
                </div>
            )}

            {activeTab === 'ausencias' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Mis Solicitudes</h3>
                        <button className="bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Nueva Solicitud
                        </button>
                    </div>
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <HelpCircle size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="mb-2">Aún no has solicitado vacaciones o reposos.</p>
                        <p className="text-xs">Usa el botón superior para crear una solicitud.</p>
                    </div>
                </div>
            )}

            {activeTab === 'prestamos' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Mis Adelantos y Préstamos</h3>
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No tienes préstamos o adelantos activos.</p>
                    </div>
                </div>
            )}

            {activeTab === 'historial' && (
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Historial de Desempeño y Disciplina</h3>
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                        <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30 text-emerald-500/50" />
                        <p className="mb-2 text-emerald-400/80 font-medium">¡Excelente trabajo!</p>
                        <p className="text-sm">No tienes llamados de atención ni actas registradas en tu historial.</p>
                    </div>
                </div>
            )}

            {/* Weapon Handover Modal */}
            {showWeaponModal && weaponInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Target className="text-orange-400" size={20} />
                                Relevo de Armamento
                            </h3>
                            <button onClick={() => { setShowWeaponModal(false); setIsClocking(false); }} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                                <p className="text-sm text-orange-200 font-medium mb-1">El puesto {employee.posts?.name} tiene asignada el siguiente arma:</p>
                                <p className="text-white font-bold">{weaponInfo.brand} {weaponInfo.model}</p>
                                <p className="text-slate-400 text-sm">SN: {weaponInfo.serial_number} • Tipo: {weaponInfo.type}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Munición Teórica: <span className="text-white font-bold">{weaponInfo.ammo_count} u.</span>
                                </label>
                                <label className="block text-sm font-medium text-slate-300 mt-4 mb-2">
                                    Munición Real Recibida (Física):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={actualAmmo}
                                    onChange={(e) => setActualAmmo(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-xl"
                                />
                            </div>

                            {actualAmmo < weaponInfo.ammo_count && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-medium text-red-400">
                                        Faltan municiones. Por favor justifica el consumo o la pérdida:
                                    </label>
                                    <textarea
                                        value={handoverComments}
                                        onChange={(e) => setHandoverComments(e.target.value)}
                                        placeholder="Ej: Se usaron 2 proyectiles durante un disparo de disuasión a las 03:00 am..."
                                        className="w-full bg-slate-900 border border-red-500/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all h-24 resize-none"
                                        required
                                    />
                                </div>
                            )}

                        </div>
                        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowWeaponModal(false); setIsClocking(false); }}
                                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (actualAmmo < weaponInfo.ammo_count && !handoverComments.trim()) {
                                        alert("Debes ingresar un comentario justificando la falta de munición.");
                                        return;
                                    }
                                    executeClockIn(pendingClockInData, {
                                        weapon_id: weaponInfo.id,
                                        expected_ammo: weaponInfo.ammo_count,
                                        actual_ammo: actualAmmo,
                                        comments: handoverComments
                                    });
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                Confirmar y Marcar Entrada
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalEmpleado;

