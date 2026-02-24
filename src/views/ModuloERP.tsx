import { type FC, type ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileText, DollarSign, TrendingUp, TrendingDown, AlertTriangle, FileCheck, CreditCard, Landmark,
    Check, X, Loader2, Search, Eye, Ban, Receipt, Calendar, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type InvoiceStatus = 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA';
type TabView = 'facturas' | 'recibos';

const STATUS_LABELS: Record<string, { label: string; cls: string; icon: ReactNode }> = {
    PENDING: { label: 'Pendiente', cls: 'bg-primary/20 text-primary', icon: <Calendar size={10} /> },
    PAID: { label: 'Pagada', cls: 'bg-emerald-500/20 text-emerald-400', icon: <Check size={10} /> },
    OVERDUE: { label: 'Vencida', cls: 'bg-orange-500/20 text-orange-400', icon: <AlertTriangle size={10} /> },
    CANCELLED: { label: 'Anulada', cls: 'bg-red-500/20 text-red-400', icon: <Ban size={10} /> },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'EFECTIVO', label: '💵 Efectivo' },
    { value: 'TRANSFERENCIA', label: '🏦 Transferencia Bancaria' },
    { value: 'CHEQUE', label: '📝 Cheque' },
    { value: 'TARJETA', label: '💳 Tarjeta' },
];

const ModuloERP: FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [companySettings, setCompanySettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabView>('facturas');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('ALL');
    const [periodFilter, setPeriodFilter] = useState('30');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Invoice Form
    const [selectedContractId, setSelectedContractId] = useState('');
    const [subtotalInput, setSubtotalInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saleCondition, setSaleCondition] = useState('CREDITO');

    // Payment Form
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [payerName, setPayerName] = useState('');
    const [payerRuc, setPayerRuc] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [invRes, conRes, recRes, settingsRes] = await Promise.all([
                supabase.from('invoices').select('*, contracts(*, clients(*)), clients(*)').order('created_at', { ascending: false }),
                supabase.from('contracts').select('*, clients(*)').eq('status', 'ACTIVE'),
                supabase.from('payment_receipts').select('*, invoices(invoice_number, contracts(clients(name)))').order('created_at', { ascending: false }),
                supabase.from('company_settings').select('*').single(),
            ]);
            if (invRes.data) setInvoices(invRes.data);
            if (conRes.data) setContracts(conRes.data);
            if (recRes.data) setReceipts(recRes.data);
            if (settingsRes.data) setCompanySettings(settingsRes.data);
        } catch (error) {
            console.error('Error fetching ERP data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ──
    const formatCurrency = useCallback((val: number) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);
    }, []);

    const padInvoiceNumber = (num: number) => {
        const est = companySettings?.establecimiento || '001';
        const pto = companySettings?.punto_expedicion || '001';
        return `${est}-${pto}-${String(num).padStart(7, '0')}`;
    };

    const padReceiptNumber = (num: number) => String(num).padStart(7, '0');

    const computedTax = useMemo(() => {
        const total = parseFloat(subtotalInput) || 0;
        const tax = Math.round(total / 11); // IVA 10% incluido: total / 11
        const subtotal = total - tax;
        return { subtotal, tax, total };
    }, [subtotalInput]);

    // ── Create Invoice ──
    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const contract = contracts.find(c => c.id === selectedContractId);
            const nextNum = companySettings?.next_invoice_number || 1;
            const invoiceNumber = padInvoiceNumber(nextNum);

            const { error } = await supabase.from('invoices').insert({
                contract_id: selectedContractId,
                client_id: contract?.client_id || null,
                invoice_number: invoiceNumber,
                issue_date: new Date().toISOString().split('T')[0],
                due_date: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                subtotal: computedTax.subtotal,
                tax_amount: computedTax.tax,
                total_amount: computedTax.total,
                status: 'PENDING',
            });
            if (error) throw error;

            // Increment invoice counter
            await supabase.from('company_settings').update({ next_invoice_number: nextNum + 1 }).eq('singleton_id', 1);

            setIsCreateModalOpen(false);
            resetInvoiceForm();
            fetchData();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Error al crear factura. Verifique los datos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetInvoiceForm = () => {
        setSelectedContractId('');
        setSubtotalInput('');
        setDueDate('');
        setSaleCondition('CREDITO');
    };

    // ── Mark as Paid (via receipt) ──
    const handleCreatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;
        setIsSubmitting(true);
        try {
            const nextRecNum = companySettings?.next_receipt_number || 1;
            const receiptNumber = padReceiptNumber(nextRecNum);
            const amountPaid = parseFloat(paymentAmount) || selectedInvoice.total_amount;

            const { error: receiptError } = await supabase.from('payment_receipts').insert({
                invoice_id: selectedInvoice.id,
                receipt_number: receiptNumber,
                payment_method: paymentMethod,
                amount_paid: amountPaid,
                payment_date: new Date().toISOString().split('T')[0],
                payer_name: payerName || selectedInvoice.clients?.name || selectedInvoice.contracts?.clients?.name || '',
                payer_ruc: payerRuc || selectedInvoice.clients?.ruc || selectedInvoice.contracts?.clients?.ruc || '',
                notes: paymentNotes,
            });
            if (receiptError) throw receiptError;

            // Update invoice status
            await supabase.from('invoices').update({
                status: 'PAID',
                payment_date: new Date().toISOString().split('T')[0],
            }).eq('id', selectedInvoice.id);

            // Increment receipt counter
            await supabase.from('company_settings').update({ next_receipt_number: nextRecNum + 1 }).eq('singleton_id', 1);

            setIsPaymentModalOpen(false);
            resetPaymentForm();
            fetchData();
        } catch (error) {
            console.error('Error creating payment:', error);
            alert('Error al registrar pago.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetPaymentForm = () => {
        setPaymentMethod('EFECTIVO');
        setPaymentAmount('');
        setPayerName('');
        setPayerRuc('');
        setPaymentNotes('');
    };

    // ── Cancel Invoice ──
    const handleCancelInvoice = async (id: string) => {
        if (!confirm('¿Seguro que desea ANULAR esta factura? Esta acción no se puede deshacer.')) return;
        try {
            await supabase.from('invoices').update({ status: 'CANCELLED' }).eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error cancelling invoice:', error);
        }
    };

    // ── Filtered Data ──
    const filteredInvoices = useMemo(() => {
        let result = invoices;
        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(i => i.status === statusFilter);
        }
        // Period filter
        if (periodFilter !== 'all') {
            const days = parseInt(periodFilter);
            const cutoff = new Date(Date.now() - days * 86400000);
            result = result.filter(i => new Date(i.created_at) >= cutoff);
        }
        // Search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => {
                const clientName = (i.clients?.name || i.contracts?.clients?.name || '').toLowerCase();
                const clientRuc = (i.clients?.ruc || i.contracts?.clients?.ruc || '').toLowerCase();
                const invoiceNum = (i.invoice_number || '').toLowerCase();
                return clientName.includes(term) || clientRuc.includes(term) || invoiceNum.includes(term);
            });
        }
        return result;
    }, [invoices, statusFilter, periodFilter, searchTerm]);

    // ── KPIs ──
    const kpis = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

        const thisMonthInvoices = invoices.filter(i => {
            const d = new Date(i.created_at);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        const lastMonthInvoices = invoices.filter(i => {
            const d = new Date(i.created_at);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });

        const paidThisMonth = thisMonthInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const paidLastMonth = lastMonthInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const monthVariation = paidLastMonth > 0 ? ((paidThisMonth - paidLastMonth) / paidLastMonth * 100).toFixed(1) : null;

        const pendingInvoices = invoices.filter(i => i.status === 'PENDING');
        const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE');
        const totalPending = pendingInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const totalOverdue = overdueInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);

        return { paidThisMonth, monthVariation, totalPending, totalOverdue, pendingCount: pendingInvoices.length, overdueCount: overdueInvoices.length };
    }, [invoices]);

    const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors";

    // ── Render ──
    return (
        <div className="animate-in fade-in duration-500 space-y-6 relative">
            <header className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">ERP y Facturación Electrónica</h2>
                    <p className="text-slate-400 mt-1">Gestión Financiera, Cobranzas e Integración e-Kuatia (SIFEN)</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsCreateModalOpen(true)}
                        className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium hover:bg-emerald-500/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <FileCheck size={16} /> Emitir Factura (FDE)
                    </button>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glassmorphism p-5 rounded-2xl border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-slate-400 font-medium text-sm">Recaudación (Mes)</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><DollarSign size={20} /></div>
                    </div>
                    <span className="text-2xl font-bold text-white font-grotesk tracking-tighter block">{isLoading ? '-' : formatCurrency(kpis.paidThisMonth)}</span>
                    <p className={`text-sm flex items-center gap-1 mt-1.5 ${kpis.monthVariation && parseFloat(kpis.monthVariation) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {kpis.monthVariation ? (
                            <>{parseFloat(kpis.monthVariation) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {kpis.monthVariation}% vs Mes Ant.</>
                        ) : <span className="text-slate-500">Sin datos previos</span>}
                    </p>
                </div>

                <div className="glassmorphism p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-slate-400 font-medium text-sm">Cobro Pendiente</h3>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><CreditCard size={20} /></div>
                    </div>
                    <span className="text-2xl font-bold text-white font-grotesk tracking-tighter block">{isLoading ? '-' : formatCurrency(kpis.totalPending)}</span>
                    <p className="text-slate-400 text-sm mt-1.5">{kpis.pendingCount} facturas pendientes</p>
                </div>

                <div className={`glassmorphism p-5 rounded-2xl ${kpis.overdueCount > 0 ? 'border-orange-500/30' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-slate-400 font-medium text-sm">Cartera en Mora</h3>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${kpis.overdueCount > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}><AlertTriangle size={20} /></div>
                    </div>
                    <span className={`text-2xl font-bold font-grotesk tracking-tighter block ${kpis.overdueCount > 0 ? 'text-orange-400' : 'text-slate-300'}`}>{isLoading ? '-' : formatCurrency(kpis.totalOverdue)}</span>
                    <p className="text-slate-400 text-sm mt-1.5">{kpis.overdueCount} facturas vencidas</p>
                </div>

                <div className="glassmorphism p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-blue-900/20">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-slate-400 font-medium text-sm">Timbrado e-Kuatia</h3>
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Landmark size={20} /></div>
                    </div>
                    <span className="text-xl font-bold text-white font-grotesk tracking-tighter block truncate">
                        {companySettings?.timbrado_number || 'No configurado'}
                    </span>
                    <p className="text-slate-400 text-sm mt-1.5 flex items-center gap-1">
                        {companySettings?.timbrado_number ? (
                            <><Check size={14} className="text-emerald-400" /> Vigente hasta {companySettings.timbrado_end_date ? new Date(companySettings.timbrado_end_date).toLocaleDateString() : 'N/A'}</>
                        ) : (
                            <span className="text-orange-400">Configurar en Ajustes</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Tabs + Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                    {([
                        { key: 'facturas', label: 'Facturas', icon: <FileText size={14} /> },
                        { key: 'recibos', label: 'Recibos de Pago', icon: <Receipt size={14} /> },
                    ] as { key: TabView; label: string; icon: ReactNode }[]).map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === tab.key ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'facturas' && (
                    <div className="flex gap-3 flex-1 md:max-w-2xl">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder:text-slate-600"
                                placeholder="Buscar por cliente, RUC o nro. factura..." />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus)}
                            className="bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50">
                            <option value="ALL">Todos</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="PAID">Pagadas</option>
                            <option value="OVERDUE">Vencidas</option>
                            <option value="CANCELLED">Anuladas</option>
                        </select>
                        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
                            className="bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50">
                            <option value="30">Últimos 30 días</option>
                            <option value="90">Últimos 90 días</option>
                            <option value="365">Último año</option>
                            <option value="all">Histórico</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="glassmorphism rounded-2xl overflow-hidden">
                {activeTab === 'facturas' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-medium">Nro. Factura</th>
                                    <th className="px-6 py-4 font-medium">Cliente</th>
                                    <th className="px-6 py-4 font-medium">RUC</th>
                                    <th className="px-6 py-4 font-medium">Emisión</th>
                                    <th className="px-6 py-4 font-medium">Vencimiento</th>
                                    <th className="px-6 py-4 font-medium text-right">Subtotal</th>
                                    <th className="px-6 py-4 font-medium text-right">IVA 10%</th>
                                    <th className="px-6 py-4 font-medium text-right">Total</th>
                                    <th className="px-6 py-4 font-medium text-center">Estado</th>
                                    <th className="px-6 py-4 font-medium text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isLoading ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" size={16} />Cargando facturas...</td></tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-500">No se encontraron facturas.</td></tr>
                                ) : (
                                    filteredInvoices.map(fac => {
                                        const st = STATUS_LABELS[fac.status] || STATUS_LABELS.PENDING;
                                        const clientName = fac.clients?.name || fac.contracts?.clients?.name || 'N/A';
                                        const clientRuc = fac.clients?.ruc || fac.contracts?.clients?.ruc || '-';
                                        return (
                                            <tr key={fac.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 text-white font-mono text-xs font-bold">{fac.invoice_number || fac.id.substring(0, 8)}</td>
                                                <td className="px-6 py-4 text-slate-300 font-medium">{clientName}</td>
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{clientRuc}</td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{fac.issue_date ? new Date(fac.issue_date + 'T00:00:00').toLocaleDateString() : new Date(fac.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{fac.due_date ? new Date(fac.due_date + 'T00:00:00').toLocaleDateString() : '-'}</td>
                                                <td className="px-6 py-4 text-slate-300 text-right font-mono text-xs">{formatCurrency(Number(fac.subtotal || 0))}</td>
                                                <td className="px-6 py-4 text-slate-400 text-right font-mono text-xs">{formatCurrency(Number(fac.tax_amount || 0))}</td>
                                                <td className="px-6 py-4 text-white text-right font-mono font-bold">{formatCurrency(Number(fac.total_amount || 0))}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${st.cls}`}>
                                                        {st.icon} {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button onClick={() => { setSelectedInvoice(fac); setIsDetailModalOpen(true); }}
                                                            className="p-1.5 rounded-md bg-slate-800 hover:bg-primary/20 hover:text-primary text-slate-400 transition-colors" title="Ver Detalle">
                                                            <Eye size={14} />
                                                        </button>
                                                        {(fac.status === 'PENDING' || fac.status === 'OVERDUE') && (
                                                            <>
                                                                <button onClick={() => {
                                                                    setSelectedInvoice(fac);
                                                                    setPaymentAmount(String(fac.total_amount || 0));
                                                                    setPayerName(fac.clients?.name || fac.contracts?.clients?.name || '');
                                                                    setPayerRuc(fac.clients?.ruc || fac.contracts?.clients?.ruc || '');
                                                                    setIsPaymentModalOpen(true);
                                                                }}
                                                                    className="p-1.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-colors" title="Registrar Pago">
                                                                    <DollarSign size={14} />
                                                                </button>
                                                                <button onClick={() => handleCancelInvoice(fac.id)}
                                                                    className="p-1.5 rounded-md bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors" title="Anular">
                                                                    <Ban size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'recibos' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-medium">Nro. Recibo</th>
                                    <th className="px-6 py-4 font-medium">Factura</th>
                                    <th className="px-6 py-4 font-medium">Cliente</th>
                                    <th className="px-6 py-4 font-medium">Método</th>
                                    <th className="px-6 py-4 font-medium text-right">Monto</th>
                                    <th className="px-6 py-4 font-medium">Fecha Pago</th>
                                    <th className="px-6 py-4 font-medium">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" size={16} />Cargando recibos...</td></tr>
                                ) : receipts.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No hay recibos registrados.</td></tr>
                                ) : (
                                    receipts.map(rec => (
                                        <tr key={rec.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-mono text-xs font-bold">{rec.receipt_number}</td>
                                            <td className="px-6 py-4 text-primary font-mono text-xs">{rec.invoices?.invoice_number || '-'}</td>
                                            <td className="px-6 py-4 text-slate-300">{rec.payer_name || rec.invoices?.contracts?.clients?.name || '-'}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                <span className="bg-slate-800 px-2 py-1 rounded">{rec.payment_method}</span>
                                            </td>
                                            <td className="px-6 py-4 text-emerald-400 text-right font-mono font-bold">{formatCurrency(Number(rec.amount_paid || 0))}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">{rec.payment_date ? new Date(rec.payment_date + 'T00:00:00').toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate">{rec.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pending Contracts for Billing (bottom strip) */}
            {contracts.length > 0 && activeTab === 'facturas' && (
                <div className="glassmorphism rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white font-grotesk mb-4 flex items-center gap-2">
                        <Building2 size={16} className="text-primary" /> Contratos Activos — Facturación Pendiente
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {contracts.map(c => (
                            <button key={c.id} onClick={() => { setSelectedContractId(c.id); setIsCreateModalOpen(true); }}
                                className="shrink-0 bg-slate-800/50 border border-slate-700/50 hover:border-primary/30 hover:bg-primary/5 rounded-xl px-4 py-3 text-left transition-all group min-w-[220px]">
                                <p className="text-white text-sm font-medium group-hover:text-primary transition-colors">{c.clients?.name}</p>
                                <p className="text-slate-500 text-xs mt-0.5">RUC: {c.clients?.ruc || 'Sin RUC'}</p>
                                <p className="text-slate-600 text-[10px] mt-1.5">Vence: {new Date(c.end_date).toLocaleDateString()}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════ MODALS ══════════ */}

            {/* Create Invoice Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <FileCheck className="text-emerald-400" /> Emitir Factura Electrónica (FDE)
                            </h3>
                            <button onClick={() => { setIsCreateModalOpen(false); resetInvoiceForm(); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Timbrado Banner */}
                        <div className="px-6 pt-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-3 text-xs">
                                <Landmark size={16} className="text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-blue-300 font-medium">Timbrado: {companySettings?.timbrado_number || 'No configurado'}</p>
                                    <p className="text-slate-500">RUC Emisor: {companySettings?.ruc || 'Configurar en Ajustes'} | Nro: {padInvoiceNumber(companySettings?.next_invoice_number || 1)}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Contrato a Facturar *</label>
                                <select required value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)} className={inputClass}>
                                    <option value="" disabled>-- Seleccione un Contrato Activo --</option>
                                    {contracts.map(c => (
                                        <option key={c.id} value={c.id}>{c.clients?.name} — RUC: {c.clients?.ruc || 'S/N'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Condición de Venta</label>
                                    <select value={saleCondition} onChange={e => setSaleCondition(e.target.value)} className={inputClass}>
                                        <option value="CONTADO">Contado</option>
                                        <option value="CREDITO">Crédito</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Fecha de Vencimiento</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Monto Total (IVA incluido) — Gs. *</label>
                                <input required type="number" min="0" value={subtotalInput} onChange={e => setSubtotalInput(e.target.value)}
                                    className={inputClass} placeholder="Ej. 15.000.000" />
                            </div>

                            {/* IVA Auto-calculation */}
                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 border border-slate-700/30">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Monto Total (IVA incl.)</span>
                                    <span className="text-white font-mono">{formatCurrency(computedTax.total)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">IVA 10% (incluido)</span>
                                    <span className="text-primary font-mono">{formatCurrency(computedTax.tax)}</span>
                                </div>
                                <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm">
                                    <span className="text-white font-bold">Base Gravada</span>
                                    <span className="text-emerald-400 font-bold font-mono text-lg">{formatCurrency(computedTax.subtotal)}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsCreateModalOpen(false); resetInvoiceForm(); }} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !selectedContractId || !subtotalInput}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><FileCheck size={16} /> Emitir Documento (SET)</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invoice Detail Modal */}
            {isDetailModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <FileText className="text-primary" /> Detalle de Factura
                            </h3>
                            <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Header info */}
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs uppercase tracking-wider">Timbrado</span>
                                    <span className="text-white font-mono text-sm font-bold">{companySettings?.timbrado_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs uppercase tracking-wider">RUC Emisor</span>
                                    <span className="text-white font-mono text-sm">{companySettings?.ruc || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs uppercase tracking-wider">Razón Social</span>
                                    <span className="text-white text-sm">{companySettings?.name || 'Fortech S.A.'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Nro. Factura</p>
                                    <p className="text-white font-mono font-bold">{selectedInvoice.invoice_number || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Estado</p>
                                    {(() => { const st = STATUS_LABELS[selectedInvoice.status] || STATUS_LABELS.PENDING; return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${st.cls}`}>{st.icon} {st.label}</span>; })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Cliente</p>
                                    <p className="text-white font-medium">{selectedInvoice.clients?.name || selectedInvoice.contracts?.clients?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">RUC Cliente</p>
                                    <p className="text-white font-mono">{selectedInvoice.clients?.ruc || selectedInvoice.contracts?.clients?.ruc || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Fecha Emisión</p>
                                    <p className="text-white">{selectedInvoice.issue_date ? new Date(selectedInvoice.issue_date + 'T00:00:00').toLocaleDateString() : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Vencimiento</p>
                                    <p className="text-white">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date + 'T00:00:00').toLocaleDateString() : '-'}</p>
                                </div>
                            </div>

                            {/* Financial Breakdown */}
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Subtotal Gravado (10%)</span>
                                    <span className="text-white font-mono">{formatCurrency(Number(selectedInvoice.subtotal || 0))}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">IVA 10%</span>
                                    <span className="text-primary font-mono">{formatCurrency(Number(selectedInvoice.tax_amount || 0))}</span>
                                </div>
                                <div className="border-t border-emerald-500/20 pt-3 flex justify-between">
                                    <span className="text-white font-bold text-lg">TOTAL</span>
                                    <span className="text-emerald-400 font-bold font-mono text-xl">{formatCurrency(Number(selectedInvoice.total_amount || 0))}</span>
                                </div>
                            </div>

                            {selectedInvoice.payment_date && (
                                <div className="bg-emerald-500/10 rounded-lg p-3 flex items-center gap-2">
                                    <Check size={16} className="text-emerald-400" />
                                    <span className="text-emerald-400 text-sm">Pagada el {new Date(selectedInvoice.payment_date + 'T00:00:00').toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                {(selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'OVERDUE') && (
                                    <button onClick={() => {
                                        setPaymentAmount(String(selectedInvoice.total_amount || 0));
                                        setPayerName(selectedInvoice.clients?.name || selectedInvoice.contracts?.clients?.name || '');
                                        setPayerRuc(selectedInvoice.clients?.ruc || selectedInvoice.contracts?.clients?.ruc || '');
                                        setIsDetailModalOpen(false);
                                        setIsPaymentModalOpen(true);
                                    }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                                        <DollarSign size={16} /> Registrar Pago
                                    </button>
                                )}
                                <button onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment / Receipt Modal */}
            {isPaymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <Receipt className="text-emerald-400" /> Recibo de Dinero
                            </h3>
                            <button onClick={() => { setIsPaymentModalOpen(false); resetPaymentForm(); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Invoice reference */}
                        <div className="px-6 pt-4">
                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                                <p className="text-primary font-bold">Factura: {selectedInvoice.invoice_number || selectedInvoice.id.substring(0, 8)}</p>
                                <p className="text-slate-400">Total a cobrar: <span className="text-white font-mono font-bold">{formatCurrency(Number(selectedInvoice.total_amount || 0))}</span></p>
                            </div>
                        </div>

                        <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Recibido de (Nombre / Razón Social) *</label>
                                <input required type="text" value={payerName} onChange={e => setPayerName(e.target.value)}
                                    className={inputClass} placeholder="Nombre del pagador" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">RUC / CI del Pagador</label>
                                <input type="text" value={payerRuc} onChange={e => setPayerRuc(e.target.value)}
                                    className={inputClass} placeholder="Ej. 80012345-6" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Método de Pago *</label>
                                    <select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
                                        {PAYMENT_METHODS.map(pm => (<option key={pm.value} value={pm.value}>{pm.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Monto Recibido (Gs.) *</label>
                                    <input required type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                        className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Concepto / Notas</label>
                                <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                                    className={`${inputClass} h-20 resize-none`} placeholder="Pago correspondiente a servicios de seguridad, mes de..." />
                            </div>

                            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                                <p className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                                    <Receipt size={14} /> Recibo Nro: {padReceiptNumber(companySettings?.next_receipt_number || 1)}
                                </p>
                                <p className="text-slate-500 text-[10px] mt-0.5">Se generará automáticamente al confirmar el pago</p>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsPaymentModalOpen(false); resetPaymentForm(); }} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !payerName || !paymentAmount}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Confirmar Pago</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuloERP;
