import { type FC, useState, useEffect } from 'react';
import {
    X, User, Calendar, Clock, HelpCircle, ShieldAlert, BadgeDollarSign, AlertOctagon,
    FileText, MapPin, Loader2, CheckCircle2, FileWarning
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeDetailViewProps {
    guardId: string;
    onClose: () => void;
}

const EmployeeDetailView: FC<EmployeeDetailViewProps> = ({ guardId, onClose }) => {
    const [activeTab, setActiveTab] = useState<'resumen' | 'turnos' | 'asistencia' | 'ausencias' | 'prestamos' | 'documentos' | 'disciplina'>('resumen');
    const [guard, setGuard] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>({
        shifts: [],
        attendance: [],
        requests: [],
        loans: [],
        documents: [],
        records: []
    });

    useEffect(() => {
        fetchEmployeeData();
    }, [guardId]);

    const fetchEmployeeData = async () => {
        setIsLoading(true);
        try {
            // 1. Basic Info
            const { data: guardData } = await supabase
                .from('guards')
                .select('*')
                .eq('id', guardId)
                .single();
            setGuard(guardData);

            // 2. Parallel Fetching of all related data
            const [
                { data: shifts },
                { data: attendance },
                { data: requests },
                { data: loans },
                { data: documents },
                { data: records }
            ] = await Promise.all([
                supabase.from('shifts').select('*, posts(name)').eq('guard_id', guardId).order('date', { ascending: false }).limit(20),
                supabase.from('attendance_logs').select('*').eq('guard_id', guardId).order('date', { ascending: false }).limit(30),
                supabase.from('time_off_requests').select('*').eq('guard_id', guardId).order('start_date', { ascending: false }),
                supabase.from('employee_loans').select('*').eq('guard_id', guardId).order('created_at', { ascending: false }),
                supabase.from('employee_documents').select('*').eq('guard_id', guardId).order('created_at', { ascending: false }),
                supabase.from('employee_records').select('*').eq('guard_id', guardId).order('date', { ascending: false })
            ]);

            setData({
                shifts: shifts || [],
                attendance: attendance || [],
                requests: requests || [],
                loans: loans || [],
                documents: documents || [],
                records: records || []
            });

        } catch (error) {
            console.error("Error fetching employee 360 data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!guard && !isLoading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-primary/10 to-transparent flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-grotesk tracking-tight">
                                {isLoading ? 'Cargando...' : `${guard.first_name} ${guard.last_name}`}
                            </h2>
                            <div className="flex gap-3 mt-1 text-sm">
                                <span className="text-slate-400 flex items-center gap-1"><FileText size={14} /> CI: {guard?.ci}</span>
                                <span className="text-slate-400 flex items-center gap-1"><BadgeDollarSign size={14} /> {guard?.employee_type || 'GUARDIA'}</span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${guard?.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {guard?.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs Tabbed Navigation */}
                <div className="flex space-x-1 bg-slate-950/50 p-1 border-b border-slate-800 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'resumen', label: 'Resumen', icon: FileText },
                        { id: 'turnos', label: 'Turnos', icon: Calendar },
                        { id: 'asistencia', label: 'Asistencia & Extras', icon: Clock },
                        { id: 'ausencias', label: 'Ausencias', icon: HelpCircle },
                        { id: 'prestamos', label: 'Préstamos', icon: BadgeDollarSign },
                        { id: 'documentos', label: 'Documentos', icon: ShieldAlert },
                        { id: 'disciplina', label: 'Disciplina', icon: AlertOctagon },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                            >
                                <Icon size={16} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <Loader2 size={48} className="animate-spin text-primary" />
                            <p className="font-medium animate-pulse">Consolidando expediente digital...</p>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">

                            {/* Content based on tab */}
                            {activeTab === 'resumen' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="glassmorphism p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-white font-bold mb-4 flex items-center gap-2 italic"><FileText size={18} className="text-primary" /> Datos Contractuales</h3>
                                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                                <div>
                                                    <p className="text-slate-500 mb-1 font-medium">Salario Base Mensual</p>
                                                    <p className="text-lg font-bold text-emerald-400 font-mono">Gs. {Number(guard.base_salary || 0).toLocaleString('es-PY')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 mb-1 font-medium">Fecha de Ingreso</p>
                                                    <p className="text-white font-semibold">{guard.hire_date || 'No registrada'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 mb-1 font-medium">IPS Asegurado</p>
                                                    <p className="text-white font-semibold">{guard.ips_number || 'No registra'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 mb-1 font-medium">Cuenta Bancaria</p>
                                                    <p className="text-white font-semibold">{guard.bank_account || 'Paga en efectivo'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                                            <p className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Estado de Préstamos</p>
                                            <h4 className="text-2xl font-bold text-white mb-1">
                                                {data.loans.filter((l: any) => l.status === 'ACTIVE').length > 0 ? 'Con Deuda Activa' : 'Sin Deudas'}
                                            </h4>
                                            <p className="text-slate-400 text-xs">Total cuotas pendientes: {data.loans.reduce((acc: number, curr: any) => acc + (curr.status === 'ACTIVE' ? (curr.installments - curr.current_installment) : 0), 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'turnos' && (
                                <div className="space-y-4">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Calendar size={18} className="text-primary" /> Próximos / Últimos Turnos</h3>
                                    {data.shifts.length === 0 ? (
                                        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-2xl">No hay turnos registrados.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {data.shifts.map((s: any) => (
                                                <div key={s.id} className="glassmorphism p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-bold">{s.posts?.name || 'Puesto Desconocido'}</p>
                                                        <p className="text-xs text-slate-400">{s.date}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{s.start_time} - {s.end_time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'asistencia' && (
                                <div className="overflow-hidden border border-slate-800 rounded-2xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4">Fecha</th>
                                                <th className="p-4">Entrada</th>
                                                <th className="p-4">Salida</th>
                                                <th className="p-4">Extras (hs)</th>
                                                <th className="p-4">Estado Extras</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 text-sm">
                                            {data.attendance.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">Sin registros de asistencia reciente.</td></tr>
                                            ) : (
                                                data.attendance.map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="p-4 text-white font-medium">{log.date}</td>
                                                        <td className="p-4 text-emerald-400 font-mono">{log.check_in}</td>
                                                        <td className="p-4 text-orange-400 font-mono">{log.check_out || '--:--'}</td>
                                                        <td className="p-4 text-white font-bold">{log.calculated_overtime || 0}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.overtime_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    log.overtime_status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                                                                }`}>
                                                                {log.overtime_status || 'N/A'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'ausencias' && (
                                <div className="space-y-4">
                                    {data.requests.length === 0 ? (
                                        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-2xl">No hay solicitudes de ausencia.</div>
                                    ) : (
                                        data.requests.map((r: any) => (
                                            <div key={r.id} className="glassmorphism p-4 rounded-xl border border-slate-800 flex justify-between items-center group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-orange-400">
                                                        <HelpCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{r.reason}</p>
                                                        <p className="text-xs text-slate-400">{r.start_date} al {r.end_date}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            r.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {r.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'disciplina' && (
                                <div className="space-y-4">
                                    {data.records.length === 0 ? (
                                        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-2xl">Legajo disciplinario limpio.</div>
                                    ) : (
                                        data.records.map((rec: any) => {
                                            const isMerit = rec.record_type === 'MERIT';
                                            const isIncident = rec.record_type === 'INCIDENT';
                                            return (
                                                <div key={rec.id} className={`glassmorphism p-5 rounded-xl border ${isMerit ? 'border-emerald-500/20' : isIncident ? 'border-red-500/20' : 'border-orange-500/20'} flex flex-col gap-2`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            {isMerit ? <CheckCircle2 className="text-emerald-400" size={16} /> : isIncident ? <AlertOctagon className="text-red-400" size={16} /> : <FileWarning className="text-orange-400" size={16} />}
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isMerit ? 'text-emerald-400' : isIncident ? 'text-red-400' : 'text-orange-400'}`}>
                                                                {rec.record_type}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-mono">{rec.date}</span>
                                                    </div>
                                                    <p className="text-white text-sm font-medium">"{rec.description}"</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium">Cerrar Expediente</button>
                    <button className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                        <FileText size={18} /> Exportar Reporte PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailView;
