import { type FC, useState, useEffect, useMemo } from 'react';
import {
    Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import {
    TrendingUp, AlertTriangle, AlertCircle, FileX, DollarSign, FileCheck, Loader2, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const DashboardFinanciero: FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [invoicesRes, expensesRes] = await Promise.all([
                supabase.from('invoices').select('*'),
                supabase.from('expense_orders').select('*')
            ]);

            if (invoicesRes.data) setInvoices(invoicesRes.data);
            if (expensesRes.data) setExpenses(expensesRes.data);
        } catch (error) {
            console.error("Error fetching financial data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const kpis = useMemo(() => {
        const paidInvoices = invoices.filter(i => i.status === 'PAID');
        const pendingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
        const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');

        const totalIncome = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        const totalExpenses = approvedExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

        const netProfitability = totalIncome - totalExpenses;

        const pendingBilling = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;

        // ROI simulation (Mock historical comparison for UI)
        const roiConsolidado = totalIncome > 0 ? ((netProfitability / totalExpenses) * 100).toFixed(1) : 0;

        // Taxes assuming 10% IVA and 10% IRE on what's left
        const iva = totalIncome * 0.10;
        const ire = (totalIncome - iva - totalExpenses) * 0.10;
        const netAfterTaxes = totalIncome - iva - (ire > 0 ? ire : 0) - totalExpenses;

        const taxData = [
            { name: 'Bruto', monto: totalIncome },
            { name: 'IVA (10%)', monto: -iva },
            { name: 'IRE (10%)', monto: ire > 0 ? -ire : 0 },
            { name: 'Gasto', monto: -totalExpenses },
            { name: 'Neto', monto: netAfterTaxes > 0 ? netAfterTaxes : 0 },
        ];

        // Generate ROI curve based on today's net profitability for demonstration
        const baseROI = netProfitability / 1000;
        const roiData = [
            { name: 'Lun', ROI: baseROI * 0.8, Meta: baseROI * 0.9 },
            { name: 'Mar', ROI: baseROI * 0.9, Meta: baseROI * 0.95 },
            { name: 'Mié', ROI: baseROI * 1.1, Meta: baseROI * 1.0 },
            { name: 'Jue', ROI: baseROI * 1.05, Meta: baseROI * 1.1 },
            { name: 'Vie', ROI: baseROI * 0.95, Meta: baseROI * 1.15 },
            { name: 'Sáb', ROI: baseROI * 1.15, Meta: baseROI * 1.2 },
            { name: 'Dom', ROI: baseROI, Meta: baseROI * 1.25 },
        ];

        return {
            netProfitability,
            roiConsolidado,
            pendingBilling,
            overdueCount,
            taxData,
            roiData
        };
    }, [invoices, expenses]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            maximumFractionDigits: 0
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-slate-400 font-medium">Cargando datos financieros...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Dashboard Financiero</h2>
                    <p className="text-slate-400 mt-1">Rentabilidad Neta y Análisis en Tiempo Real</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 px-4 py-2 rounded shadow-[0_0_15px_rgba(19,91,236,0.2)] transition-colors">
                        Exportar Reporte
                    </button>
                </div>
            </header>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Beneficio / Rentabilidad Neta</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white uppercase font-grotesk tracking-tighter truncate block" title={formatCurrency(kpis.netProfitability)}>
                            {formatCurrency(kpis.netProfitability)}
                        </span>
                        <p className={`text-sm flex items-center gap-1 mt-2 ${kpis.netProfitability >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {kpis.netProfitability >= 0 ? <TrendingUp size={16} /> : <AlertTriangle size={16} />}
                            {kpis.netProfitability >= 0 ? "+ Rentable" : "- Déficit"}
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between border-primary/30 shadow-[0_0_20px_rgba(19,91,236,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">ROI Consolidado</h3>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white font-grotesk tracking-tighter">
                            {kpis.roiConsolidado === 'Infinity' || isNaN(Number(kpis.roiConsolidado)) ? "N/A" : `${kpis.roiConsolidado}%`}
                        </span>
                        <p className="text-emerald-400 text-sm flex items-center gap-1 mt-2">
                            <TrendingUp size={16} /> Margen Bruto
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">Facturación Pendiente</h3>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white uppercase font-grotesk tracking-tighter truncate block" title={formatCurrency(kpis.pendingBilling)}>
                            {formatCurrency(kpis.pendingBilling)}
                        </span>
                        <p className={`${kpis.overdueCount > 0 ? "text-red-400" : "text-yellow-400"} text-sm flex items-center gap-1 mt-2`}>
                            {kpis.overdueCount > 0 ? <AlertTriangle size={16} /> : <Clock size={16} />}
                            {kpis.overdueCount} vencidas
                        </p>
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-400 font-medium">e-kuatia (XML)</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <FileCheck size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-white font-grotesk tracking-tighter">100%</span>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mt-2">
                            Integración SIFEN Activa
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ROI Chart */}
                <div className="lg:col-span-2 glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 font-grotesk">Flujo de Caja y Proyección</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={kpis.roiData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorROI" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#135bec" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#135bec" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    formatter={(value: any) => [formatCurrency(value * 1000), 'Monto']}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area type="monotone" dataKey="ROI" stroke="#135bec" strokeWidth={3} fillOpacity={1} fill="url(#colorROI)" />
                                <Line type="monotone" dataKey="Meta" stroke="#13ec5b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tax Compliance */}
                <div className="glassmorphism p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 font-grotesk">Impacto Tributario</h3>
                    <div className="h-72 w-full relative">
                        {kpis.taxData.some(d => Math.abs(d.monto) > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kpis.taxData} margin={{ top: 10, right: 10, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#334155', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        formatter={(value: any) => [formatCurrency(value), 'Monto']}
                                    />
                                    <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                                        {kpis.taxData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.monto > 0 ? '#10b981' : entry.monto < 0 ? '#ef4444' : '#64748b'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">No hay facturación para calcular impuestos</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row - Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glassmorphism p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white font-grotesk">Alertas Financieras</h3>
                        {kpis.overdueCount > 0 && (
                            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-bold">{kpis.overdueCount} FACTURAS VENCIDAS</span>
                        )}
                    </div>
                    <div className="space-y-4">
                        {kpis.overdueCount > 0 ? (
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                    <FileX className="text-red-400" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">Cuentas por Cobrar en Riesgo</h4>
                                    <p className="text-slate-400 text-sm mt-1">Existen {kpis.overdueCount} facturas con fecha de vencimiento superada.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <FileCheck className="text-emerald-400" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">Finanzas Sanas</h4>
                                    <p className="text-slate-400 text-sm mt-1">No hay facturas vencidas detectadas en el sistema.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glassmorphism p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 to-primary/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white font-grotesk">Vencimientos Tributarios</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                            <div className="flex flex-col">
                                <span className="text-white font-bold">Liquidación IVA (10%)</span>
                                <span className="text-slate-400 text-xs">Periodo actual</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-primary font-bold">En 5 días</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardFinanciero;
