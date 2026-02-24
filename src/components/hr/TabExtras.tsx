import { type FC, useState, useEffect } from 'react';
import { Clock, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TabExtras: FC = () => {
    const [pendingExtras, setPendingExtras] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPendingExtras = async () => {
        setIsLoading(true);
        // Supabase select with join to get guard info
        const { data, error } = await supabase
            .from('attendance_logs')
            .select(`
                id, date, calculated_overtime, overtime_status,
                guards ( id, first_name, last_name, ci )
            `)
            .eq('overtime_status', 'PENDING')
            .order('date', { ascending: false });

        if (!error && data) {
            setPendingExtras(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPendingExtras();
    }, []);

    const handleAction = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
        const { error } = await supabase
            .from('attendance_logs')
            .update({
                overtime_status: newStatus,
                // approved_by could be set via Edge Function, or if using a trigger, but here client side for prototype
            })
            .eq('id', id);

        if (!error) {
            setPendingExtras(prev => prev.filter(log => log.id !== id));
        } else {
            alert('Error al actualizar el estado.');
            console.error(error);
        }
    };

    if (isLoading) {
        return <div className="p-10 flex justify-center text-primary"><Loader2 className="animate-spin" size={32} /></div>;
    }

    return (
        <div className="glassmorphism p-6 rounded-2xl animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                    <Clock className="text-orange-400" /> Autorización de Horas Extras
                </h3>
                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm">
                    {pendingExtras.length} Pendientes
                </span>
            </div>

            <p className="text-slate-400 mb-6 text-sm">
                Las horas extras listadas aquí fueron generadas superando las horas estándar del turno asignado. Requieren aprobación manual para incluirse en nómina.
            </p>

            {pendingExtras.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-700/50 border-dashed">
                    <p className="text-slate-400">No hay horas extras pendientes de autorización.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700/50 text-slate-400 text-sm">
                                <th className="p-3 font-medium">Fecha</th>
                                <th className="p-3 font-medium">Personal</th>
                                <th className="p-3 font-medium text-center">Horas a Aprobar</th>
                                <th className="p-3 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {pendingExtras.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 text-white text-sm">{log.date}</td>
                                    <td className="p-3">
                                        <p className="text-white text-sm font-medium">{log.guards.first_name} {log.guards.last_name}</p>
                                        <p className="text-xs text-slate-400">CI: {log.guards.ci}</p>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-mono font-bold">
                                            {log.calculated_overtime} hs
                                        </span>
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleAction(log.id, 'APPROVED')}
                                            className="p-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors tooltip"
                                            title="Aprobar"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleAction(log.id, 'REJECTED')}
                                            className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors tooltip"
                                            title="Rechazar"
                                        >
                                            <X size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TabExtras;
