import { type FC, useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TimeOffRequest {
    id: string;
    guard_id: string;
    type: string;
    start_date: string;
    end_date: string;
    status: string;
    reason: string;
    created_at: string;
    guards: {
        first_name: string;
        last_name: string;
        employee_type: string;
    };
}

const TabAusencias: FC = () => {
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('time_off_requests')
                .select(`
                    *,
                    guards (first_name, last_name, employee_type)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setRequests(data as any[]);
        } catch (error) {
            console.error("Error fetching time off requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const { error } = await supabase
                .from('time_off_requests')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            // Update local state
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar la solicitud.");
        }
    };

    const translateType = (type: string) => {
        switch (type) {
            case 'VACATION': return 'Vacaciones';
            case 'SICK_LEAVE': return 'Reposo Médico';
            case 'UNPAID': return 'Permiso no Remunerado';
            case 'MATERNITY': return 'Permiso por Maternidad';
            default: return type;
        }
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white font-grotesk flex items-center gap-2">
                    <HelpCircle className="text-primary" size={20} /> Solicitudes de Personal
                </h3>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : requests.length === 0 ? (
                <div className="glassmorphism p-10 rounded-2xl text-center text-slate-500 border border-slate-700/50">
                    <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No hay solicitudes pendientes ni registradas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map((req) => (
                        <div key={req.id} className="glassmorphism p-6 rounded-2xl flex flex-col justify-between border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-white font-bold">{req.guards?.first_name} {req.guards?.last_name}</h4>
                                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                                            {req.guards?.employee_type || 'GUARDIA'}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${req.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' :
                                            req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-red-500/20 text-red-400'
                                        }`}>
                                        {req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Tipo de Solicitud</p>
                                            <p>{translateType(req.type)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Fechas</p>
                                            <p>{req.start_date} al {req.end_date}</p>
                                        </div>
                                    </div>
                                    {req.reason && (
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mt-2">
                                            <p className="text-xs text-slate-400 mb-1">Motivo / Notas:</p>
                                            <p className="text-sm text-slate-300 italic">"{req.reason}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {req.status === 'PENDING' && (
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700/50">
                                    <button
                                        onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <XCircle size={16} className="text-red-400" /> Rechazar
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <CheckCircle size={16} /> Aprobar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TabAusencias;
