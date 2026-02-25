import { type FC, useState, useEffect } from 'react';
import {
    Users, UserCheck, Clock, MapPin, FileText, ChevronRight, Plus, X, Loader2, Calendar, Receipt, DollarSign, HelpCircle, AlertOctagon,
    ShieldAlert, BadgeDollarSign
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import TabExtras from '../components/hr/TabExtras';
import TabAjustes from '../components/hr/TabAjustes';
import TabRecibos from '../components/hr/TabRecibos';
import TabTurnos from '../components/hr/TabTurnos.tsx';
import EmployeeDetailView from '../components/hr/EmployeeDetailView.tsx';
import TabAusencias from '../components/hr/TabAusencias';
import TabDocumentos from '../components/hr/TabDocumentos';
import TabPrestamos from '../components/hr/TabPrestamos';
import TabDisciplina from '../components/hr/TabDisciplina';

const attendanceData = [
    { day: 'Lun', present: 145, absent: 5 },
    { day: 'Mar', present: 148, absent: 2 },
    { day: 'Mié', present: 142, absent: 8 },
    { day: 'Jue', present: 150, absent: 0 },
    { day: 'Vie', present: 147, absent: 3 },
    { day: 'Sáb', present: 140, absent: 10 },
    { day: 'Dom', present: 135, absent: 15 },
];

const ModuloHR: FC = () => {
    const [guards, setGuards] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'nomina' | 'extras' | 'ajustes' | 'recibos' | 'turnos' | 'ausencias' | 'documentos' | 'prestamos' | 'disciplina'>('nomina');

    // Chart Data State
    const [chartData, setChartData] = useState<any[]>([]);

    // KPI States
    const [stats, setStats] = useState({
        activeAttendance: 0,
        monthlyOvertime: 0,
        geofenceOk: 0
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingGuardId, setEditingGuardId] = useState<string | null>(null);

    // Profile Detail View State
    const [selectedDetailGuardId, setSelectedDetailGuardId] = useState<string | null>(null);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [ci, setCi] = useState('');
    const [phone, setPhone] = useState('');
    const [hireDate, setHireDate] = useState('');
    const [ipsNumber, setIpsNumber] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [employeeType, setEmployeeType] = useState('GUARDIA');

    useEffect(() => {
        fetchGuards();
    }, []);

    const fetchGuards = async () => {
        setIsLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Calculate last 7 days for the chart
        const last7Days: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        // Fetch Guards
        const { data: guardsData } = await supabase
            .from('guards')
            .select('*')
            .order('created_at', { ascending: false });

        // Fetch Today's Shifts for the list
        const { data: shiftsData } = await supabase
            .from('shifts')
            .select('*, posts(name)')
            .eq('date', todayStr);

        // Fetch Active Attendances (KPI)
        const { data: attendanceLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .is('check_out', null);

        // Fetch Monthly Overtime (KPI)
        const { data: overtimeData } = await supabase
            .from('attendance_logs')
            .select('calculated_overtime')
            .gte('date', firstDayOfMonth)
            .eq('overtime_status', 'APPROVED');

        // Fetch Geofence Stats (KPI)
        const { data: geofenceData } = await supabase
            .from('attendance_logs')
            .select('id')
            .eq('date', todayStr)
            .eq('inside_geofence', true);

        // Fetch Weekly Data for Chart
        const { data: weeklyLogs } = await supabase
            .from('attendance_logs')
            .select('date, id')
            .gte('date', last7Days[0])
            .lte('date', last7Days[6]);

        if (guardsData) {
            const enrichedGuards = guardsData.map(g => {
                const shift = shiftsData?.find(s => s.guard_id === g.id);
                return {
                    ...g,
                    current_shift: shift || null
                };
            });
            setGuards(enrichedGuards);

            // Format Chart Data
            const activeGuardCount = guardsData.filter(g => g.status === 'ACTIVE').length;
            const formattedChart = last7Days.map(dateStr => {
                const dayLogs = weeklyLogs?.filter(l => l.date === dateStr).length || 0;
                const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(dateStr).getDay()];
                return {
                    day: dayName,
                    present: dayLogs,
                    absent: Math.max(0, activeGuardCount - dayLogs)
                };
            });
            setChartData(formattedChart);
        }

        setStats({
            activeAttendance: attendanceLogs?.length || 0,
            monthlyOvertime: overtimeData?.reduce((acc, curr) => acc + (Number(curr.calculated_overtime) || 0), 0) || 0,
            geofenceOk: geofenceData?.length || 0
        });

        setIsLoading(false);
    };

    const handleEditGuard = (guard: any) => {
        setEditingGuardId(guard.id);
        setFirstName(guard.first_name);
        setLastName(guard.last_name);
        setCi(guard.ci);
        setPhone(guard.phone || '');
        setHireDate(guard.hire_date || '');
        setIpsNumber(guard.ips_number || '');
        setBaseSalary(guard.base_salary ? guard.base_salary.toString() : '');
        setBankAccount(guard.bank_account || '');
        setEmployeeType(guard.employee_type || 'GUARDIA');
        setIsModalOpen(true);
    };

    const handleDeleteGuard = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar a ${name}? Esta acción no se puede deshacer.`)) return;

        try {
            const { error } = await supabase.from('guards').delete().eq('id', id);
            if (error) throw error;
            fetchGuards();
        } catch (error) {
            console.error("Error deleting guard:", error);
            alert("Error al eliminar el personal. Verifique si tiene registros asociados.");
        }
    };

    const handleSaveGuard = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const guardData = {
            first_name: firstName,
            last_name: lastName,
            ci: ci,
            phone: phone,
            hire_date: hireDate || null,
            ips_number: ipsNumber || null,
            base_salary: baseSalary ? parseFloat(baseSalary) : null,
            bank_account: bankAccount || null,
            employee_type: employeeType,
            status: 'ACTIVE'
        };

        try {
            if (editingGuardId) {
                const { error } = await supabase
                    .from('guards')
                    .update(guardData)
                    .eq('id', editingGuardId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('guards')
                    .insert(guardData);
                if (error) throw error;
            }

            // Reset and close
            setIsModalOpen(false);
            setEditingGuardId(null);
            setFirstName('');
            setLastName('');
            setCi('');
            setPhone('');
            setHireDate('');
            setIpsNumber('');
            setBaseSalary('');
            setBankAccount('');
            setEmployeeType('GUARDIA');

            // Refresh list
            fetchGuards();
        } catch (error) {
            console.error("Error saving employee:", error);
            alert("Error al guardar el personal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6 relative">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Recursos Humanos y Nómina</h2>
                    <p className="text-slate-400 mt-1">Gestión de Personal, Asistencia y Cálculos IPS conectado a Supabase</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 px-4 py-2 rounded flex items-center gap-2 transition-colors">
                        <Plus size={16} /> Nuevo Personal
                    </button>
                    <button className="bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded transition-colors hidden sm:block">
                        Procesar Quincena
                    </button>
                </div>
            </header>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between border-primary/30 shadow-[0_0_20px_rgba(19,91,236,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Personal Activo</h3>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Users size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white font-grotesk tracking-tighter block">{isLoading ? '-' : guards.length}</span>
                        <p className="text-emerald-400 text-sm mt-1">
                            Sincronizado
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Asistencia Hoy</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <UserCheck size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white font-grotesk tracking-tighter">{isLoading ? '-' : stats.activeAttendance}</span>
                        <p className="text-slate-400 text-sm mt-1">
                            Personal en servicio
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Horas Extras (Mes)</h3>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white uppercase font-grotesk tracking-tighter">{isLoading ? '-' : stats.monthlyOvertime} hs</span>
                        <p className="text-slate-400 text-sm mt-1">
                            Aprobadas este mes
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Marcaciones Geofence</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <MapPin size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white font-grotesk tracking-tighter">{isLoading ? '-' : stats.geofenceOk}</span>
                        <p className="text-slate-400 text-sm mt-1">
                            Verificadas hoy
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('nomina')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'nomina' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Users size={16} /> Dashboard & Nómina
                </button>
                <button
                    onClick={() => setActiveTab('turnos')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'turnos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Calendar size={16} /> Gestión de Turnos
                </button>
                <button
                    onClick={() => setActiveTab('ausencias')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ausencias' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <HelpCircle size={16} /> Ausencias
                </button>
                <button
                    onClick={() => setActiveTab('extras')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'extras' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Clock size={16} /> Horas Extras
                </button>
                <button
                    onClick={() => setActiveTab('documentos')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'documentos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <ShieldAlert size={16} /> Compliance & Docs
                </button>
                <button
                    onClick={() => setActiveTab('prestamos')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'prestamos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <BadgeDollarSign size={16} /> Adelantos y Préstamos
                </button>
                <button
                    onClick={() => setActiveTab('disciplina')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'disciplina' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <AlertOctagon size={16} /> Disciplina
                </button>
                <button
                    onClick={() => setActiveTab('ajustes')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ajustes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <DollarSign size={16} /> Ajustes & Quincenas
                </button>
                <button
                    onClick={() => setActiveTab('recibos')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'recibos' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Receipt size={16} /> Liquidación & Recibos
                </button>
            </div>

            {/* Content Area based on Active Tab */}
            {activeTab === 'nomina' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">

                    {/* Guard List */}
                    <div className="glassmorphism p-6 rounded-2xl flex flex-col h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white font-grotesk flex items-center gap-2">
                                <Users className="text-primary" size={20} /> Nómina de Personal
                            </h3>
                        </div>

                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {isLoading ? (
                                <div className="text-center py-10 text-slate-500">Cargando personal...</div>
                            ) : guards.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">No hay personal registrado.</div>
                            ) : (
                                guards.map(guard => (
                                    <div key={guard.id} className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-white font-bold text-sm hover:text-primary transition-colors pr-4" onClick={() => setSelectedDetailGuardId(guard.id)}>{guard.first_name} {guard.last_name}</h4>
                                            <div className="flex flex-col items-end gap-2">
                                                {/* Action Buttons */}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditGuard(guard); }}
                                                        className="p-1 px-2.5 bg-slate-700 hover:bg-primary/20 hover:text-primary border border-slate-600 rounded text-slate-300 transition-all text-[10px] flex items-center gap-1"
                                                        title="Editar"
                                                    >
                                                        <FileText size={10} /> Editar
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteGuard(guard.id, `${guard.first_name} ${guard.last_name}`); }}
                                                        className="p-1 px-2.5 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 border border-slate-600 rounded text-slate-300 transition-all text-[10px] flex items-center gap-1"
                                                        title="Eliminar"
                                                    >
                                                        <X size={10} /> Borrar
                                                    </button>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${guard.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {guard.employee_type || 'GUARDIA'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs text-slate-400">CI: {guard.ci}</p>
                                            {guard.current_shift ? (
                                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                                                    <MapPin size={10} /> {guard.current_shift.posts?.name || 'Puesto asignado'}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Sin turno hoy</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                            <Calendar size={12} /> Alta: {guard.hire_date || 'No registrada'}
                                        </div>
                                        {guard.base_salary && (
                                            <div className="text-xs text-emerald-500/80 font-mono mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                                                <div>
                                                    <span>Salario:</span>
                                                    <span className="ml-1">Gs. {Number(guard.base_salary).toLocaleString('es-PY')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Main section: Attendance Chart & Payroll preview */}
                    <div className="lg:col-span-2 space-y-6 flex flex-col">

                        {/* Chart */}
                        <div className="glassmorphism p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-6 font-grotesk">Asistencia Semanal (Real)</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.length > 0 ? chartData : attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#334155', opacity: 0.4 }}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="present" stackId="a" fill="#135bec" radius={[0, 0, 4, 4]} name="Presente" />
                                        <Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Ausente" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* IPS preview row */}
                        <div className="glassmorphism p-6 rounded-2xl bg-gradient-to-r from-slate-800/40 to-slate-800/10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white font-grotesk flex items-center gap-2">
                                    <FileText className="text-primary" size={20} />
                                    Proyección IPS (Demo)
                                </h3>
                                <button className="text-sm flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                                    Ver Detalle <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-400">Total Imponible</p>
                                    <p className="text-lg font-bold text-white mt-1">G. 385.5M</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-400">Aporte Obrero (9%)</p>
                                    <p className="text-lg font-bold text-white mt-1">G. 34.6M</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-400">Aporte Patronal (16.5%)</p>
                                    <p className="text-lg font-bold text-white mt-1">G. 63.6M</p>
                                </div>
                                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                                    <p className="text-xs text-primary font-medium">Total a Transferir</p>
                                    <p className="text-lg font-bold text-white mt-1">G. 98.2M</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'extras' && <TabExtras />}

            {activeTab === 'ajustes' && <TabAjustes />}

            {activeTab === 'recibos' && <TabRecibos />}

            {activeTab === 'turnos' && <TabTurnos />}

            {activeTab === 'ausencias' && <TabAusencias />}

            {activeTab === 'documentos' && <TabDocumentos />}

            {activeTab === 'prestamos' && <TabPrestamos />}

            {activeTab === 'disciplina' && <TabDisciplina />}

            {/* Modal de Nuevo Guardia */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <Users className="text-primary" /> {editingGuardId ? 'Editar Personal' : 'Registrar Nuevo Personal'}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingGuardId(null); }} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveGuard} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nombre(s) *</label>
                                    <input required value={firstName} onChange={e => setFirstName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Apellido(s) *</label>
                                    <input required value={lastName} onChange={e => setLastName(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Cédula de Identidad *</label>
                                    <input required value={ci} onChange={e => setCi(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" placeholder="Ej. 0981..." />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Fecha de Ingreso</label>
                                    <input value={hireDate} onChange={e => setHireDate(e.target.value)} type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary [&::-webkit-calendar-picker-indicator]:invert" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nro. Asegurado IPS</label>
                                    <input value={ipsNumber} onChange={e => setIpsNumber(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs text-slate-400 mb-1">Tipo de Personal *</label>
                                    <select required value={employeeType} onChange={e => setEmployeeType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary appearance-none">
                                        <option value="GUARDIA">Guardia de Seguridad</option>
                                        <option value="ADMINISTRATIVO">Personal Administrativo</option>
                                        <option value="LIMPIEZA">Personal de Limpieza</option>
                                        <option value="MANTENIMIENTO">Personal de Mantenimiento</option>
                                        <option value="SUPERVISOR">Supervisor</option>
                                        <option value="GERENCIA">Gerencia general</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs text-slate-400 mb-1">Salario Base Mensual (Gs.) *</label>
                                    <input required value={baseSalary} onChange={e => setBaseSalary(e.target.value)} type="number" min="0" step="50000" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" placeholder="Ej. 2700000" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Cuenta Bancaria (Opcional)</label>
                                    <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" placeholder="Bnf 123456..." />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingGuardId ? 'Guardar Cambios' : 'Registrar Personal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* Employee Detail 360 View */}
            {selectedDetailGuardId && (
                <EmployeeDetailView
                    guardId={selectedDetailGuardId}
                    onClose={() => setSelectedDetailGuardId(null)}
                />
            )}
        </div >
    );
};

export default ModuloHR;
