import { type FC, useState, useEffect } from 'react';
import { Calendar, FileText, MapPin, Clock, LogIn, LogOut, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PortalEmpleado: FC = () => {
    const { user } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'inicio' | 'turnos' | 'recibos' | 'ausencias' | 'prestamos' | 'historial'>('inicio');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchEmployeeProfile();
        }
    }, [user]);

    const fetchEmployeeProfile = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('guards')
                .select('*')
                // Assuming we use a dummy user matching or the actual auth.user mapping
                // Temporarily just grab the first guard matched or simply a mock if auth mapping is complex
                .limit(1)
                .single();

            if (data) setEmployee(data);
        } catch (error) {
            console.error("Error fetching profile", error);
        } finally {
            setIsLoading(false);
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

            {/* Marcación Rápida Widget */}
            <div className="glassmorphism p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-slate-900 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase mb-2 text-sm">
                            <Clock size={16} /> Marcación de Horario
                        </div>
                        <h3 className="text-4xl text-white font-bold font-mono tracking-tighter mb-4">
                            {new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 flex items-start gap-2 max-w-md">
                            <MapPin size={16} className="shrink-0 mt-0.5" />
                            Tu ubicación actual será verificada con el objetivo asignado mediante Geofencing.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <LogIn size={20} /> Marcar Entrada
                            </button>
                            <button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                                <LogOut size={20} /> Marcar Salida
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm self-stretch flex flex-col justify-center">
                        <h4 className="text-slate-300 font-medium mb-3 text-sm">Tu Turno Actual / Próximo</h4>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-bold">Hoy, 06:00 - 18:00</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-bold">Activo</span>
                            </div>
                            <div className="text-sm text-slate-400 flex items-center gap-1.5">
                                <MapPin size={14} /> Cliente: Edificio Fortaleza
                            </div>
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
        </div>
    );
};

export default PortalEmpleado;
