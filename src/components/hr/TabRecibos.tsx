import { type FC, useState, useEffect } from 'react';
import { Receipt, Search, FileText, Loader2, Download, CheckCircle2, Calculator } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TabRecibos: FC = () => {
    const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [payslips, setPayslips] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const periodYear = parseInt(period.split('-')[0]);
    const periodMonth = parseInt(period.split('-')[1]);

    useEffect(() => {
        fetchPayslips();
    }, [period]);

    const fetchPayslips = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('payslips')
            .select(`
                *,
                guards ( first_name, last_name, ci, id_document, base_salary )
            `)
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPayslips(data);
        }
        setIsLoading(false);
    };

    const handleGeneratePayroll = async () => {
        if (!confirm('¿Desea generar la nómina del periodo seleccionado? Esto calculará el salario en base a los datos actuales.')) return;

        setIsGenerating(true);
        // NOTA DE IMPLEMENTACIÓN: En un sistema real, esto llamaría a un Edge Function en Supabase
        // que haría los cálculos pesados en el backend. Para el prototipo Frontend, simulamos
        // el guardado si encontramos guardias activos.

        try {
            // 1. Get active guards
            const { data: guards } = await supabase.from('guards').select('*').eq('status', 'ACTIVE');

            if (!guards) throw new Error("No guards found");

            // 2. Fetch Active Loans
            const { data: activeLoans } = await supabase
                .from('employee_loans')
                .select('*')
                .eq('status', 'ACTIVE');

            // 3. Fake insert for demonstration
            for (const guard of guards) {
                const base = Number(guard.base_salary || 2700000);

                // Demo logic: 10% chance of bonus, 20% chance of discount
                const overtime = Math.random() > 0.5 ? 150000 : 0;
                const bonus = Math.random() > 0.9 ? 300000 : 0;
                let discount = Math.random() > 0.8 ? 50000 : 0;
                // Simulating a quincena advance of 50% of base salary usually
                const quincena = base * 0.5;

                // --- NEW INTEGRATION: Calculate loan installment ---
                const employeeLoan = activeLoans?.find(loan => loan.guard_id === guard.id);
                let loanInstallment = 0;
                let loanId = null;

                if (employeeLoan) {
                    loanInstallment = Math.round(employeeLoan.amount / employeeLoan.installments);
                    discount += loanInstallment; // Add to discounts
                    loanId = employeeLoan.id;
                }
                // ---------------------------------------------------

                const netPay = base + overtime + bonus - discount - quincena;

                const { data: existing } = await supabase
                    .from('payslips')
                    .select('id')
                    .eq('guard_id', guard.id)
                    .eq('period_month', periodMonth)
                    .eq('period_year', periodYear)
                    .single();

                if (!existing) {
                    await supabase.from('payslips').insert({
                        guard_id: guard.id,
                        period_month: periodMonth,
                        period_year: periodYear,
                        base_salary_pro_rated: base,
                        overtime_amount: overtime,
                        bonuses_total: bonus,
                        discounts_total: discount,
                        quincena_advance: quincena,
                        net_pay: netPay,
                        status: 'DRAFT'
                    });

                    // Update loan progress conceptually if draft saved
                    if (loanId && employeeLoan) {
                        const newInstallmentCount = employeeLoan.current_installment + 1;
                        let newStatus = 'ACTIVE';
                        if (newInstallmentCount >= employeeLoan.installments) {
                            newStatus = 'PAID';
                        }

                        await supabase
                            .from('employee_loans')
                            .update({
                                current_installment: newInstallmentCount,
                                status: newStatus
                            })
                            .eq('id', loanId);
                    }
                }
            }

            await fetchPayslips();

        } catch (err) {
            console.error("Error generating payroll", err);
            alert("Error al generar la nómina.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header controls */}
            <div className="glassmorphism p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-4">
                    <Receipt className="text-primary w-8 h-8" />
                    <div>
                        <h3 className="text-lg font-bold text-white font-grotesk">Liquidación de Salarios</h3>
                        <p className="text-sm text-slate-400">Seleccione el periodo para visualizar o generar las planillas.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input
                        type="month"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    <button
                        onClick={handleGeneratePayroll}
                        disabled={isGenerating}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                        Generar Planilla
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="glassmorphism p-6 rounded-2xl animate-in fade-in duration-500 delay-100">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-white font-bold">Recibos Emitidos ({period})</h4>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input type="text" placeholder="Buscar personal..." className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary w-64" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center text-primary"><Loader2 className="animate-spin" size={32} /></div>
                ) : payslips.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-700/50 border-dashed">
                        <FileText className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-slate-400 font-medium">No hay planillas generadas para este periodo.</p>
                        <p className="text-slate-500 text-sm mt-1">Haga clic en Generar Planilla para iniciar el proceso de cálculo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-slate-400 text-sm">
                                    <th className="p-3 font-medium">Personal</th>
                                    <th className="p-3 font-medium text-right">Salario Base</th>
                                    <th className="p-3 font-medium text-right text-emerald-400/80">+ Extras/Bonos</th>
                                    <th className="p-3 font-medium text-right text-red-400/80">- Anticipo/Desc.</th>
                                    <th className="p-3 font-medium text-right text-white">Salario Neto Mensual</th>
                                    <th className="p-3 font-medium text-center">Estado</th>
                                    <th className="p-3 font-medium text-right">Recibo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {payslips.map(slip => (
                                    <tr key={slip.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3">
                                            <p className="text-white text-sm font-medium">{slip.guards.first_name} {slip.guards.last_name}</p>
                                            <p className="text-xs text-slate-500">CI: {slip.guards.ci}</p>
                                        </td>
                                        <td className="p-3 text-right text-slate-300 font-mono text-sm">
                                            {Number(slip.base_salary_pro_rated).toLocaleString('es-PY')}
                                        </td>
                                        <td className="p-3 text-right text-emerald-400 font-mono text-sm">
                                            {slip.overtime_amount > 0 || slip.bonuses_total > 0 ? '+' : ''}
                                            {Number(Number(slip.overtime_amount) + Number(slip.bonuses_total)).toLocaleString('es-PY')}
                                        </td>
                                        <td className="p-3 text-right text-red-400 font-mono text-sm">
                                            - {Number(Number(slip.discounts_total) + Number(slip.quincena_advance)).toLocaleString('es-PY')}
                                        </td>
                                        <td className="p-3 text-right text-white font-mono font-bold text-sm bg-slate-800/20">
                                            {Number(slip.net_pay).toLocaleString('es-PY')} Gs.
                                        </td>
                                        <td className="p-3 text-center">
                                            {slip.status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">
                                                    <CheckCircle2 size={12} /> PAGADO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-slate-700 text-slate-400">
                                                    BORRADOR
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button className="p-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded transition-colors tooltip" title="Descargar Recibo Individual">
                                                <Download size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabRecibos;
