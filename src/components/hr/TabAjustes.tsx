import { type FC, useState, useEffect } from 'react';
import { DollarSign, Plus, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TabAjustes: FC = () => {
    const [guards, setGuards] = useState<any[]>([]);
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedGuard, setSelectedGuard] = useState('');
    const [type, setType] = useState('DISCOUNT');
    const [concept, setConcept] = useState('');
    const [amount, setAmount] = useState('');

    // Default period to current month YYYY-MM
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const [period, setPeriod] = useState(currentPeriod);

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setIsLoading(true);
        // Fetch guards for the dropdown
        const { data: guardsData } = await supabase.from('guards').select('id, first_name, last_name, ci').eq('status', 'ACTIVE');
        if (guardsData) setGuards(guardsData);

        // Fetch adjustments for the selected period
        const { data: adjData } = await supabase
            .from('salary_adjustments')
            .select(`
                id, type, concept, amount, period,
                guards ( first_name, last_name, ci )
            `)
            .eq('period', period)
            .order('created_at', { ascending: false });

        if (adjData) setAdjustments(adjData);
        setIsLoading(false);
    };

    const handleAddAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { error } = await supabase
            .from('salary_adjustments')
            .insert({
                guard_id: selectedGuard,
                period,
                type,
                concept,
                amount: parseFloat(amount)
            });

        if (!error) {
            setConcept('');
            setAmount('');
            fetchData();
        } else {
            alert('Error al registrar el ajuste.');
            console.error(error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 glassmorphism p-6 rounded-2xl animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-white mb-6 font-grotesk flex items-center gap-2">
                    <Plus className="text-emerald-400" /> Nuevo Ajuste
                </h3>
                <form onSubmit={handleAddAdjustment} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Periodo (Mes/Año)</label>
                        <input required type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary [&::-webkit-calendar-picker-indicator]:invert" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Personal</label>
                        <select required value={selectedGuard} onChange={e => setSelectedGuard(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary appearance-none">
                            <option value="">Selecciona un guardia...</option>
                            {guards.map(g => (
                                <option key={g.id} value={g.id}>{g.first_name} {g.last_name} ({g.ci})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Tipo de Ajuste</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary appearance-none">
                            <option value="DISCOUNT">Descuento / Anticipo / Quincena</option>
                            <option value="BONUS">Bonificación / Premio</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Concepto</label>
                        <input required type="text" value={concept} onChange={e => setConcept(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" placeholder="Ej. Anticipo Quincena" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Monto (Gs.)</label>
                        <input required type="number" min="0" step="1000" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary" placeholder="Ej. 1000000" />
                    </div>

                    <button type="submit" disabled={isSubmitting || !selectedGuard} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Registrar Ajuste'}
                    </button>
                </form>
            </div>

            <div className="lg:col-span-2 glassmorphism p-6 rounded-2xl animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                        <DollarSign className="text-emerald-400" /> Ajustes del Periodo ({period})
                    </h3>
                </div>

                {isLoading ? (
                    <div className="py-10 flex justify-center text-emerald-400"><Loader2 className="animate-spin" size={32} /></div>
                ) : adjustments.length === 0 ? (
                    <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-700/50 border-dashed">
                        <p className="text-slate-400">No hay ajustes registrados para este periodo.</p>
                    </div>
                ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                        {adjustments.map(adj => (
                            <div key={adj.id} className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/50 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${adj.type === 'BONUS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {adj.type === 'BONUS' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm">{adj.guards.first_name} {adj.guards.last_name}</h4>
                                        <p className="text-xs text-slate-400">{adj.concept}</p>
                                    </div>
                                </div>
                                <div className={`text-right font-mono font-bold ${adj.type === 'BONUS' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {adj.type === 'BONUS' ? '+' : '-'} {Number(adj.amount).toLocaleString('es-PY')} Gs.
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabAjustes;
