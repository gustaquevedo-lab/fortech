import { type FC, useState, useEffect } from 'react';
import { BadgeDollarSign, Plus, CheckCircle2, XCircle, Clock, Loader2, DollarSign, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeLoan {
    id: string;
    guard_id: string;
    amount: number;
    installments: number;
    current_installment: number;
    status: 'ACTIVE' | 'PAID' | 'CANCELLED';
    created_at: string;
    guards: {
        first_name: string;
        last_name: string;
        employee_type: string;
    };
}

const TabPrestamos: FC = () => {
    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState('1');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Guards for the dropdown
            const { data: guardsData } = await supabase
                .from('guards')
                .select('id, first_name, last_name')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (guardsData) {
                setEmployees(guardsData.map(g => ({ id: g.id, name: `${g.first_name} ${g.last_name}` })));
                if (guardsData.length > 0) setSelectedEmployee(guardsData[0].id);
            }

            // Fetch Loans
            const { data: loansData, error } = await supabase
                .from('employee_loans')
                .select(`
                    *,
                    guards (first_name, last_name, employee_type)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (loansData) setLoans(loansData as unknown as EmployeeLoan[]);

        } catch (error) {
            console.error("Error fetching loans data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !amount || !installments) return;

        setIsSaving(true);
        try {
            const numAmount = parseFloat(amount.replace(/\./g, '')); // Handle formatted numbers conceptually
            const numInstallments = parseInt(installments, 10);

            if (numAmount <= 0) throw new Error("El monto debe ser mayor a 0");
            if (numInstallments <= 0) throw new Error("Las cuotas deben ser al menos 1");

            const { error: dbError } = await supabase
                .from('employee_loans')
                .insert([{
                    guard_id: selectedEmployee,
                    amount: numAmount,
                    installments: numInstallments,
                    current_installment: 0,
                    status: 'ACTIVE'
                }]);

            if (dbError) throw dbError;

            setIsModalOpen(false);
            setAmount('');
            setInstallments('1');
            fetchData();

            alert("Préstamo / Adelanto registrado exitosamente.");

        } catch (error: any) {
            console.error("Error creating loan:", error);
            alert(error.message || "Error al registrar el préstamo");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelLoan = async (id: string) => {
        if (!window.confirm("¿Seguro que deseas cancelar o dar de baja este préstamo?")) return;

        try {
            const { error } = await supabase
                .from('employee_loans')
                .update({ status: 'CANCELLED' })
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (error: any) {
            console.error("Error cancelling loan:", error);
            alert("Error al cancelar el préstamo.");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                        <BadgeDollarSign className="text-primary" size={24} /> Préstamos y Adelantos
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Gestión de créditos de la empresa descontables automáticamente en nómina
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] text-sm font-medium"
                >
                    <Plus size={16} /> Nuevo Préstamo
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : loans.length === 0 ? (
                <div className="glassmorphism p-12 text-center rounded-2xl border border-slate-700/50">
                    <BadgeDollarSign size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-white mb-2">No hay préstamos activos</h3>
                    <p className="text-slate-400 text-sm">Registra un adelanto de salario o préstamo al personal para iniciar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loans.map((loan) => {
                        const installmentAmount = loan.amount / loan.installments;
                        const progressPercentage = (loan.current_installment / loan.installments) * 100;

                        return (
                            <div key={loan.id} className="glassmorphism rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all overflow-hidden flex flex-col relative">

                                {loan.status === 'PAID' && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <CheckCircle2 size={100} className="text-emerald-500" />
                                    </div>
                                )}
                                {loan.status === 'CANCELLED' && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <XCircle size={100} className="text-red-500" />
                                    </div>
                                )}

                                <div className="p-5 flex-1 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                                {new Date(loan.created_at).toLocaleDateString()}
                                            </p>
                                            <h4 className="text-lg font-bold text-white leading-tight">
                                                {loan.guards?.first_name} {loan.guards?.last_name}
                                            </h4>
                                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider font-medium">
                                                {loan.guards?.employee_type || 'EMPLEADO'}
                                            </span>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${loan.status === 'ACTIVE' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                            loan.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                            {loan.status === 'ACTIVE' ? <Clock size={10} /> :
                                                loan.status === 'PAID' ? <CheckCircle2 size={10} /> :
                                                    <XCircle size={10} />}
                                            {loan.status === 'ACTIVE' ? 'Activo' : loan.status === 'PAID' ? 'Saldado' : 'Cancelado'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-slate-400">Total Solicitado</p>
                                                <p className="text-xl font-bold text-white font-mono mt-0.5">{formatCurrency(loan.amount)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Cuota Mensual</p>
                                                <p className="text-base font-bold text-slate-300 font-mono mt-0.5 opacity-80">{formatCurrency(installmentAmount)}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <p className="text-xs text-slate-400 font-medium">Progreso de Pago</p>
                                                <p className="text-xs text-slate-300 font-bold font-mono">
                                                    {loan.current_installment} / {loan.installments} cuotas
                                                </p>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${loan.status === 'PAID' ? 'bg-emerald-500' :
                                                        loan.status === 'CANCELLED' ? 'bg-red-500' :
                                                            'bg-primary'
                                                        }`}
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {loan.status === 'ACTIVE' && (
                                    <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                                        <button
                                            onClick={() => handleCancelLoan(loan.id)}
                                            className="text-xs text-slate-500 hover:text-red-400 transition-colors font-medium flex items-center gap-1"
                                        >
                                            Anular Préstamo
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Nuevo Préstamo */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <DollarSign className="text-primary" size={20} /> Asignar Nuevo Préstamo
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLoan} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

                            {/* Empleado */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Personal</label>
                                <select
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                    required
                                >
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Monto */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Monto Total (Gs.)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Ej: 500000"
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                                        required
                                        min="1"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Gs.</span>
                                </div>
                            </div>

                            {/* Cuotas */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Cantidad de Cuotas (Meses)</label>
                                <input
                                    type="number"
                                    value={installments}
                                    onChange={(e) => setInstallments(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                                    required
                                    min="1"
                                    step="1"
                                />
                                <p className="text-[10px] text-slate-500 mt-1 mt-1">
                                    Se descontará {(amount && installments && parseInt(installments) > 0) ? formatCurrency(parseFloat(amount) / parseInt(installments)) : '0 Gs.'} de manera automática en la generación mensual de Nómina.
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Registrar Préstamo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabPrestamos;
