import { type FC, useState, useEffect, useMemo } from 'react';

// Helper: parse Paraguayan formatted number (1.500.000 → 1500000)
const parsePYG = (val: string): number => {
    const cleaned = val.replace(/\./g, '').replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
};
import { ShoppingCart, Clock, Truck, Plus, DollarSign, Activity, X, Loader2, Search, Edit3, Trash2, Upload, Download, Building, CheckCircle2, XCircle, Eye, Wallet, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Combustible', 'Equipamiento', 'Uniformes', 'Mantenimiento', 'Seguros', 'Armamento', 'Servicios', 'Alquiler', 'Impuestos', 'Otros'];
const CAT_COLORS: Record<string, string> = { Combustible: '#3b82f6', Equipamiento: '#10b981', Uniformes: '#f59e0b', Mantenimiento: '#8b5cf6', Seguros: '#ec4899', Armamento: '#ef4444', Servicios: '#06b6d4', Alquiler: '#a855f7', Impuestos: '#f97316', Otros: '#64748b' };
const STATUS_MAP: Record<string, { l: string, c: string }> = { PENDING: { l: 'Pendiente', c: 'bg-orange-500/20 text-orange-400' }, APPROVED: { l: 'Aprobado', c: 'bg-emerald-500/20 text-emerald-400' }, REJECTED: { l: 'Rechazado', c: 'bg-red-500/20 text-red-400' }, PAID: { l: 'Pagado', c: 'bg-primary/20 text-primary' } };
type Tab = 'ordenes' | 'proveedores' | 'presupuesto' | 'caja';

const ModuloCompras: FC = () => {
    const [tab, setTab] = useState<Tab>('ordenes');
    const [orders, setOrders] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [pettyCash, setPettyCash] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Order modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderType, setOrderType] = useState('EXPENSE');
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [itemsCount, setItemsCount] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Combustible');
    const [orderDate, setOrderDate] = useState('');
    const [notes, setNotes] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [clientId, setClientId] = useState('');
    const [contractId, setContractId] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Reject modal
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Supplier modal
    const [isSupModalOpen, setIsSupModalOpen] = useState(false);
    const [editingSup, setEditingSup] = useState<any>(null);
    const [supName, setSupName] = useState('');
    const [supRuc, setSupRuc] = useState('');
    const [supPhone, setSupPhone] = useState('');
    const [supEmail, setSupEmail] = useState('');
    const [supBank, setSupBank] = useState('');
    const [supAccount, setSupAccount] = useState('');
    const [supAddress, setSupAddress] = useState('');
    const [supCategory, setSupCategory] = useState('');

    // Petty cash modal
    const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
    const [pettyDesc, setPettyDesc] = useState('');
    const [pettyAmount, setPettyAmount] = useState('');
    const [pettyType, setPettyType] = useState<'IN' | 'OUT'>('OUT');

    // Budget
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetPeriod, setBudgetPeriod] = useState('');
    const [budgets, setBudgets] = useState<any[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [oR, vR, sR, cR, ctR, pR, bR] = await Promise.all([
                supabase.from('expense_orders').select('*, vehicles:vehicle_id(id,brand,model,plate_number)').order('order_date', { ascending: false }).then(r => r),
                supabase.from('vehicles').select('id,brand,model,plate_number,type').order('brand').then(r => r),
                supabase.from('suppliers').select('*').order('name').then(r => r),
                supabase.from('clients').select('id,name,ruc').order('name').then(r => r),
                supabase.from('contracts').select('id,contract_number,client_id').then(r => r),
                supabase.from('petty_cash').select('*').order('created_at', { ascending: false }).then(r => r),
                supabase.from('budgets').select('*').order('period', { ascending: false }).then(r => r),
            ]);
            setOrders(oR.data || []); setVehicles(vR.data || []); setSuppliers(sR.data || []);
            setClients(cR.data || []); setContracts(ctR.data || []); setPettyCash(pR.data || []); setBudgets(bR.data || []);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const resetOrderForm = () => { setEditingOrder(null); setOrderType('EXPENSE'); setSupplierId(''); setSupplierName(''); setItemsCount(''); setAmount(''); setCategory('Combustible'); setOrderDate(''); setNotes(''); setVehicleId(''); setClientId(''); setContractId(''); setReceiptFile(null); };

    const openEditOrder = (o: any) => { setEditingOrder(o); setOrderType(o.type || 'EXPENSE'); setSupplierId(o.supplier_id || ''); setSupplierName(o.supplier_name || ''); setItemsCount(String(o.items_count || '')); setAmount(new Intl.NumberFormat('es-PY').format(o.amount || 0)); setCategory(o.category || 'Combustible'); setOrderDate(o.order_date || ''); setNotes(o.notes || ''); setVehicleId(o.vehicle_id || ''); setClientId(o.client_id || ''); setContractId(o.contract_id || ''); setIsModalOpen(true); };

    const handleSaveOrder = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const numAmt = parsePYG(amount);
            let receiptUrl = editingOrder?.receipt_url || null;
            if (receiptFile) {
                const ext = receiptFile.name.split('.').pop();
                const path = `receipts/${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from('expense_receipts').upload(path, receiptFile);
                if (!upErr) { const { data: urlData } = supabase.storage.from('expense_receipts').getPublicUrl(path); receiptUrl = urlData.publicUrl; }
            }
            const resolvedSupplier = supplierId ? suppliers.find(s => s.id === supplierId)?.name || supplierName : supplierName;
            const row = { type: orderType, supplier_id: supplierId || null, supplier_name: resolvedSupplier, items_count: parseInt(itemsCount) || 1, amount: numAmt, category, order_date: orderDate, notes: notes || null, vehicle_id: vehicleId || null, client_id: clientId || null, contract_id: contractId || null, receipt_url: receiptUrl, status: editingOrder?.status || 'PENDING' };
            if (editingOrder) { await supabase.from('expense_orders').update(row).eq('id', editingOrder.id); }
            else { await supabase.from('expense_orders').insert([row]); }
            setIsModalOpen(false); resetOrderForm(); fetchData();
        } catch (e) { console.error(e); alert('Error al guardar.'); } finally { setIsSubmitting(false); }
    };

    const handleDeleteOrder = async (id: string) => { if (!confirm('¿Eliminar esta orden?')) return; await supabase.from('expense_orders').delete().eq('id', id); fetchData(); };
    const handleApprove = async (id: string) => { await supabase.from('expense_orders').update({ status: 'APPROVED' }).eq('id', id); fetchData(); };
    const handleReject = async () => { if (!rejectId) return; await supabase.from('expense_orders').update({ status: 'REJECTED', reject_reason: rejectReason }).eq('id', rejectId); setRejectId(null); setRejectReason(''); fetchData(); };
    const handleMarkPaid = async (id: string) => { await supabase.from('expense_orders').update({ status: 'PAID' }).eq('id', id); fetchData(); };

    // Suppliers
    const resetSupForm = () => { setEditingSup(null); setSupName(''); setSupRuc(''); setSupPhone(''); setSupEmail(''); setSupBank(''); setSupAccount(''); setSupAddress(''); setSupCategory(''); };
    const openEditSup = (s: any) => { setEditingSup(s); setSupName(s.name); setSupRuc(s.ruc || ''); setSupPhone(s.phone || ''); setSupEmail(s.email || ''); setSupBank(s.bank_name || ''); setSupAccount(s.bank_account || ''); setSupAddress(s.address || ''); setSupCategory(s.category || ''); setIsSupModalOpen(true); };
    const handleSaveSup = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const row = { name: supName, ruc: supRuc || null, phone: supPhone || null, email: supEmail || null, bank_name: supBank || null, bank_account: supAccount || null, address: supAddress || null, category: supCategory || null };
            if (editingSup) { await supabase.from('suppliers').update(row).eq('id', editingSup.id); }
            else { await supabase.from('suppliers').insert([row]); }
            setIsSupModalOpen(false); resetSupForm(); fetchData();
        } catch (e) { console.error(e); alert('Error.'); } finally { setIsSubmitting(false); }
    };
    const handleDeleteSup = async (id: string) => { if (!confirm('¿Eliminar proveedor?')) return; await supabase.from('suppliers').delete().eq('id', id); fetchData(); };

    // Petty cash
    const handleSavePetty = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const a = parsePYG(pettyAmount);
            await supabase.from('petty_cash').insert([{ description: pettyDesc, amount: pettyType === 'OUT' ? -Math.abs(a) : Math.abs(a), type: pettyType }]);
            setIsPettyModalOpen(false); setPettyDesc(''); setPettyAmount(''); fetchData();
        } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
    };

    // Budget
    const handleSaveBudget = async () => {
        if (!budgetPeriod || !budgetAmount) return;
        const a = parsePYG(budgetAmount);
        await supabase.from('budgets').upsert([{ period: budgetPeriod, amount: a }], { onConflict: 'period' });
        setBudgetAmount(''); setBudgetPeriod(''); fetchData();
    };

    // Report
    const generateReport = async () => {
        const { data: co } = await supabase.from('company_settings').select('*').single();
        const c = co || { name: 'Fortech S.A.' };
        const now = new Date();
        const rows = filteredOrders.map(o => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px">${o.order_date ? fmt(o.order_date) : '-'}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${o.supplier_name}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${o.category}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace">${cur(o.amount)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${STATUS_MAP[o.status]?.l || o.status}</td></tr>`).join('');
        const total = filteredOrders.reduce((s, o) => s + o.amount, 0);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Compras</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;padding:40px;font-size:13px;color:#1e293b}h1{font-size:18px}h2{font-size:15px;color:#135bec;margin:20px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f8fafc;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #e2e8f0}.header{display:flex;justify-content:space-between;border-bottom:3px solid #135bec;padding-bottom:16px;margin-bottom:24px}.footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;color:#94a3b8;font-size:10px}@media print{body{padding:20px}}</style></head><body><div class="header"><div><h1>${(c as any).name || 'Fortech'}</h1><p style="color:#64748b;font-size:12px">Reporte de Compras y Gastos</p></div><div style="text-align:right;font-size:12px;color:#475569"><p><strong>${now.toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p></div></div><h2>Órdenes (${filteredOrders.length})</h2><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Categoría</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="padding:8px 10px;font-weight:700;border-top:2px solid #e2e8f0">TOTAL</td><td style="padding:8px 10px;text-align:right;font-weight:700;border-top:2px solid #e2e8f0;font-family:monospace">${cur(total)}</td><td style="border-top:2px solid #e2e8f0"></td></tr></tfoot></table><div class="footer"><p>Generado por ${(c as any).name || 'Fortech'} — Sistema Fortech · ${now.toLocaleString('es-PY')}</p></div></body></html>`;
        const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    };

    const cur = (v: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(v);
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
    const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary";

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
            if (typeFilter !== 'ALL' && (o.type || 'EXPENSE') !== typeFilter) return false;
            if (dateFrom && o.order_date < dateFrom) return false;
            if (dateTo && o.order_date > dateTo) return false;
            if (search) { const s = search.toLowerCase(); return (o.supplier_name || '').toLowerCase().includes(s) || (o.category || '').toLowerCase().includes(s) || String(o.amount).includes(s); }
            return true;
        });
    }, [orders, statusFilter, typeFilter, dateFrom, dateTo, search]);

    const kpis = useMemo(() => {
        const total = orders.reduce((s, o) => s + o.amount, 0);
        const pending = orders.filter(o => o.status === 'PENDING');
        const pendAmt = pending.reduce((s, o) => s + o.amount, 0);
        const approved = orders.filter(o => o.status === 'APPROVED' || o.status === 'PAID').reduce((s, o) => s + o.amount, 0);
        const uniqueSup = new Set(orders.map(o => o.supplier_name)).size;
        const catGroups = orders.reduce((a, o) => { a[o.category] = (a[o.category] || 0) + o.amount; return a; }, {} as Record<string, number>);
        const chartData = Object.entries(catGroups).map(([c, a]) => ({ category: c, amount: (a as number) / 1000000, color: CAT_COLORS[c] || '#64748b' })).sort((a, b) => b.amount - a.amount);
        const currentPeriod = new Date().toISOString().slice(0, 7);
        const currentBudget = budgets.find(b => b.period === currentPeriod);
        const budgetVal = currentBudget?.amount || 0;
        const execPct = budgetVal > 0 ? Math.min(Math.round((total / budgetVal) * 100), 150) : 0;
        const pettyBalance = pettyCash.reduce((s, p) => s + p.amount, 0);
        return { total, pendingCount: pending.length, pendAmt, approved, uniqueSup, chartData, budgetVal, execPct, pettyBalance };
    }, [orders, budgets, pettyCash]);

    const pieData = useMemo(() => {
        const byType = orders.reduce((a, o) => { const t = o.type || 'EXPENSE'; a[t] = (a[t] || 0) + o.amount; return a; }, {} as Record<string, number>);
        return [
            { name: 'Gastos', value: byType['EXPENSE'] || 0, fill: '#f59e0b' },
            { name: 'Órdenes de Compra', value: byType['PURCHASE_ORDER'] || 0, fill: '#135bec' },
        ].filter(d => d.value > 0);
    }, [orders]);

    if (isLoading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <header className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Compras y Gastos</h2>
                    <p className="text-slate-400 mt-1">Gestión ERP — Proveedores, Presupuestos y Control de Egresos</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={generateReport} className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"><Download size={14} />Exportar PDF</button>
                    <button onClick={() => { resetOrderForm(); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all text-sm"><Plus size={14} />Nueva Orden</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                {([['ordenes', 'Órdenes', ShoppingCart], ['proveedores', 'Proveedores', Users], ['presupuesto', 'Presupuesto', DollarSign], ['caja', 'Caja Chica', Wallet]] as [Tab, string, any][]).map(([k, l, I]) => (
                    <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${tab === k ? 'bg-primary/20 text-primary shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}><I size={14} />{l}</button>
                ))}
            </div>

            {/* ══ TAB: ÓRDENES ══ */}
            {tab === 'ordenes' && (<div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glassmorphism p-5 rounded-2xl"><div className="flex justify-between items-start mb-3"><h3 className="text-slate-400 text-sm font-medium">Gasto Total</h3><div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><DollarSign size={18} /></div></div><span className="text-2xl font-bold text-white font-grotesk block truncate">{cur(kpis.total)}</span><p className="text-slate-400 text-xs mt-1">Presupuesto: {kpis.budgetVal > 0 ? cur(kpis.budgetVal) : 'No definido'}</p></div>
                    <div className="glassmorphism p-5 rounded-2xl"><div className="flex justify-between items-start mb-3"><h3 className="text-slate-400 text-sm font-medium">Pendientes</h3><div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Clock size={18} /></div></div><span className="text-2xl font-bold text-orange-400 font-grotesk">{kpis.pendingCount}</span><p className="text-orange-400/70 text-xs mt-1">{cur(kpis.pendAmt)}</p></div>
                    <div className="glassmorphism p-5 rounded-2xl"><div className="flex justify-between items-start mb-3"><h3 className="text-slate-400 text-sm font-medium">Proveedores</h3><div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Truck size={18} /></div></div><span className="text-2xl font-bold text-white font-grotesk">{kpis.uniqueSup}</span><p className="text-emerald-400 text-xs mt-1">Activos en el sistema</p></div>
                    <div className="glassmorphism p-5 rounded-2xl"><div className="flex justify-between items-start mb-3"><h3 className="text-slate-400 text-sm font-medium">Ejecución Presupuesto</h3><div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Activity size={18} /></div></div><span className="text-2xl font-bold text-white font-grotesk">{kpis.budgetVal > 0 ? `${kpis.execPct}%` : '—'}</span>{kpis.budgetVal > 0 && <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2"><div className={`h-1.5 rounded-full ${kpis.execPct > 90 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(kpis.execPct, 100)}%` }} /></div>}</div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, categoría..." className={`${inputCls} pl-9`} /></div>
                    <div className="flex gap-1">{[['ALL', 'Todos'], ['PENDING', 'Pendientes'], ['APPROVED', 'Aprobados'], ['REJECTED', 'Rechazados'], ['PAID', 'Pagados']].map(([v, l]) => <button key={v} onClick={() => setStatusFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === v ? 'bg-primary/20 text-primary border-primary/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{l}</button>)}</div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"><option value="ALL">Tipo: Todos</option><option value="EXPENSE">Gastos</option><option value="PURCHASE_ORDER">Órdenes de Compra</option></select>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 [color-scheme:dark]" title="Desde" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 [color-scheme:dark]" title="Hasta" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Orders Table */}
                    <div className="xl:col-span-2 glassmorphism p-5 rounded-2xl flex flex-col max-h-[520px]">
                        <h3 className="text-base font-bold text-white font-grotesk mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-primary" />Órdenes ({filteredOrders.length})</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <table className="w-full text-left"><thead><tr className="border-b border-slate-700/50 text-slate-400 text-xs"><th className="pb-2 px-2 font-medium">Proveedor</th><th className="pb-2 font-medium">Cat.</th><th className="pb-2 font-medium">Fecha</th><th className="pb-2 font-medium text-right">Monto</th><th className="pb-2 font-medium text-center">Tipo</th><th className="pb-2 font-medium text-center">Estado</th><th className="pb-2 font-medium text-center">Acc.</th></tr></thead>
                                <tbody className="text-sm">{filteredOrders.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-500">No hay órdenes que coincidan.</td></tr> : filteredOrders.map(o => {
                                    const st = STATUS_MAP[o.status] || STATUS_MAP.PENDING; return (
                                        <tr key={o.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 px-2 max-w-[180px]"><span className="text-slate-300 font-medium block truncate text-xs">{o.supplier_name}</span>{o.vehicles && <span className="text-primary/60 text-[10px] flex items-center gap-1"><Truck size={9} />{o.vehicles.plate_number}</span>}{o.client_id && <span className="text-slate-600 text-[10px]">CC: {clients.find(c => c.id === o.client_id)?.name?.slice(0, 20) || '—'}</span>}</td>
                                            <td className="py-3"><span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{o.category}</span></td>
                                            <td className="py-3 text-slate-400 text-xs">{fmt(o.order_date)}</td>
                                            <td className="py-3 text-white text-right font-mono text-xs">{cur(o.amount)}</td>
                                            <td className="py-3 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${(o.type || 'EXPENSE') === 'PURCHASE_ORDER' ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-500'}`}>{(o.type || 'EXPENSE') === 'PURCHASE_ORDER' ? 'OC' : 'Gasto'}</span></td>
                                            <td className="py-3 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.c}`}>{st.l}</span></td>
                                            <td className="py-3 px-2 text-center"><div className="flex items-center justify-center gap-1">
                                                {o.receipt_url && <a href={o.receipt_url} target="_blank" className="text-slate-500 hover:text-white"><Eye size={13} /></a>}
                                                {o.status === 'PENDING' && <><button onClick={() => handleApprove(o.id)} className="text-emerald-500 hover:text-emerald-300" title="Aprobar"><CheckCircle2 size={13} /></button><button onClick={() => { setRejectId(o.id); setRejectReason(''); }} className="text-red-500 hover:text-red-300" title="Rechazar"><XCircle size={13} /></button></>}
                                                {o.status === 'APPROVED' && <button onClick={() => handleMarkPaid(o.id)} className="text-primary hover:text-primary/70 text-[9px] font-bold" title="Marcar pagado">Pagar</button>}
                                                <button onClick={() => openEditOrder(o)} className="text-slate-500 hover:text-white"><Edit3 size={13} /></button>
                                                <button onClick={() => handleDeleteOrder(o.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={13} /></button>
                                            </div></td>
                                        </tr>);
                                })}</tbody></table>
                        </div>
                    </div>

                    {/* Chart + Pie */}
                    <div className="glassmorphism p-5 rounded-2xl flex flex-col max-h-[520px]">
                        <h3 className="text-base font-bold text-white font-grotesk mb-3 flex items-center gap-2"><Activity size={18} className="text-primary" />Por Categoría</h3>
                        <div className="flex-1 w-full min-h-[200px]">{kpis.chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={kpis.chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} /><XAxis type="number" stroke="#475569" fontSize={11} tickFormatter={v => `${v}M`} /><YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} width={80} /><RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} formatter={(v: any) => [`${v.toFixed(1)}M Gs.`, 'Monto']} /><Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18}>{kpis.chartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer> : <p className="text-slate-500 text-sm text-center py-8">Sin datos</p>}</div>
                        {pieData.length > 0 && <div className="mt-3 pt-3 border-t border-slate-800"><h4 className="text-xs text-slate-400 font-bold mb-2">OC vs Gastos</h4><div className="h-[100px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" paddingAngle={4}>{pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: 11 }} /></PieChart></ResponsiveContainer></div><div className="flex gap-3 justify-center mt-1">{pieData.map(d => <span key={d.name} className="text-[10px] text-slate-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />{d.name}</span>)}</div></div>}
                    </div>
                </div>
            </div>)}

            {/* ══ TAB: PROVEEDORES ══ */}
            {tab === 'proveedores' && (<div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white font-grotesk">Maestro de Proveedores ({suppliers.length})</h3><button onClick={() => { resetSupForm(); setIsSupModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"><Plus size={14} />Nuevo Proveedor</button></div>
                <div className="glassmorphism p-5 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left"><thead><tr className="border-b border-slate-700/50 text-slate-400 text-xs"><th className="pb-2 font-medium">Nombre</th><th className="pb-2 font-medium">RUC</th><th className="pb-2 font-medium">Teléfono</th><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium">Banco</th><th className="pb-2 font-medium">Rubro</th><th className="pb-2 font-medium text-center">Acc.</th></tr></thead>
                        <tbody className="text-sm">{suppliers.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-500">No hay proveedores registrados.</td></tr> : suppliers.map(s => <tr key={s.id} className="border-b border-slate-800/80 hover:bg-slate-800/30"><td className="py-3 text-white font-medium text-xs">{s.name}</td><td className="py-3 text-slate-400 text-xs font-mono">{s.ruc || '-'}</td><td className="py-3 text-slate-400 text-xs">{s.phone || '-'}</td><td className="py-3 text-slate-400 text-xs">{s.email || '-'}</td><td className="py-3 text-slate-400 text-xs">{s.bank_name ? `${s.bank_name} ${s.bank_account || ''}` : '-'}</td><td className="py-3 text-slate-400 text-xs">{s.category || '-'}</td><td className="py-3 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => openEditSup(s)} className="text-slate-500 hover:text-white"><Edit3 size={13} /></button><button onClick={() => handleDeleteSup(s.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={13} /></button></div></td></tr>)}</tbody></table>
                </div>
            </div>)}

            {/* ══ TAB: PRESUPUESTO ══ */}
            {tab === 'presupuesto' && (<div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glassmorphism p-5 rounded-2xl"><h3 className="text-base font-bold text-white font-grotesk mb-4">Definir Presupuesto Mensual</h3>
                        <div className="flex gap-3 items-end"><div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Periodo (YYYY-MM)</label><input type="month" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></div><div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Monto (Gs.)</label><input value={budgetAmount} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setBudgetAmount(v ? new Intl.NumberFormat('es-PY').format(parseInt(v)) : ''); }} className={inputCls} placeholder="250.000.000" /></div><button onClick={handleSaveBudget} className="bg-primary text-white px-4 py-2 rounded-lg text-sm h-[38px]">Guardar</button></div>
                        <div className="mt-4 space-y-2">{budgets.slice(0, 6).map(b => <div key={b.period} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-3 py-2"><span className="text-white text-sm font-mono">{b.period}</span><span className="text-white text-sm font-mono">{cur(b.amount)}</span></div>)}</div>
                    </div>
                    <div className="glassmorphism p-5 rounded-2xl"><h3 className="text-base font-bold text-white font-grotesk mb-4">Ejecución por Categoría</h3>
                        {kpis.chartData.length > 0 ? <div className="space-y-3">{kpis.chartData.map(c => { const pct = kpis.budgetVal > 0 ? Math.round((c.amount * 1000000 / kpis.budgetVal) * 100) : 0; return <div key={c.category}><div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{c.category}</span><span className="text-white font-mono">{cur(c.amount * 1000000)}</span></div><div className="w-full bg-slate-800 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: c.color }} /></div></div> })}</div> : <p className="text-slate-500 text-sm text-center py-8">Sin gastos registrados</p>}
                    </div>
                </div>
            </div>)}

            {/* ══ TAB: CAJA CHICA ══ */}
            {tab === 'caja' && (<div className="space-y-4">
                <div className="flex justify-between items-center"><div><h3 className="text-lg font-bold text-white font-grotesk">Caja Chica</h3><p className="text-sm text-slate-400">Saldo actual: <span className={`font-bold font-mono ${kpis.pettyBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cur(kpis.pettyBalance)}</span></p></div><button onClick={() => setIsPettyModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"><Plus size={14} />Movimiento</button></div>
                <div className="glassmorphism p-5 rounded-2xl">
                    <table className="w-full text-left"><thead><tr className="border-b border-slate-700/50 text-slate-400 text-xs"><th className="pb-2 font-medium">Fecha</th><th className="pb-2 font-medium">Descripción</th><th className="pb-2 font-medium text-center">Tipo</th><th className="pb-2 font-medium text-right">Monto</th></tr></thead>
                        <tbody className="text-sm">{pettyCash.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">Sin movimientos.</td></tr> : pettyCash.map(p => <tr key={p.id} className="border-b border-slate-800/80"><td className="py-3 text-slate-400 text-xs">{fmt(p.created_at)}</td><td className="py-3 text-white text-xs">{p.description}</td><td className="py-3 text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.amount >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.amount >= 0 ? 'Ingreso' : 'Egreso'}</span></td><td className={`py-3 text-right font-mono text-xs ${p.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cur(Math.abs(p.amount))}</td></tr>)}</tbody></table>
                </div>
            </div>)}

            {/* ══ MODAL: ORDEN ══ */}
            {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"><div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10"><h3 className="text-lg font-bold text-white font-grotesk">{editingOrder ? 'Editar Orden' : 'Nueva Orden'}</h3><button onClick={() => { setIsModalOpen(false); resetOrderForm(); }} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
                <form onSubmit={handleSaveOrder} className="p-5 space-y-4">
                    <div className="flex gap-2">{['EXPENSE', 'PURCHASE_ORDER'].map(t => <button key={t} type="button" onClick={() => setOrderType(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${orderType === t ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{t === 'EXPENSE' ? '💸 Gasto Directo' : '📋 Orden de Compra'}</button>)}</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className="text-xs text-slate-400 mb-1 block">Proveedor *</label>{suppliers.length > 0 ? <select value={supplierId} onChange={e => { setSupplierId(e.target.value); if (e.target.value) { setSupplierName(suppliers.find(s => s.id === e.target.value)?.name || ''); } }} className={inputCls}><option value="">-- Seleccionar o escribir abajo --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.ruc ? `(${s.ruc})` : ''}</option>)}</select> : null}{!supplierId && <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className={`${inputCls} mt-1`} placeholder="Nombre del proveedor" required={!supplierId} />}</div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Categoría *</label><select required value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Fecha *</label><input type="date" required value={orderDate} onChange={e => setOrderDate(e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Monto (Gs.) *</label><input required value={amount} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setAmount(v ? new Intl.NumberFormat('es-PY').format(parseInt(v)) : ''); }} className={inputCls} placeholder="1.500.000" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Cantidad Items</label><input type="number" value={itemsCount} onChange={e => setItemsCount(e.target.value)} className={inputCls} placeholder="1" min="1" /></div>
                    </div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Notas</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} placeholder="Detalles..." /></div>
                    {/* Centro de costos */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3"><p className="col-span-2 text-xs text-slate-500 font-bold flex items-center gap-1"><Building size={12} />Centro de Costos (opcional)</p>
                        <div><label className="text-[10px] text-slate-500 mb-1 block">Cliente</label><select value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}><option value="">—</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div><label className="text-[10px] text-slate-500 mb-1 block">Contrato</label><select value={contractId} onChange={e => setContractId(e.target.value)} className={inputCls}><option value="">—</option>{contracts.filter(c => !clientId || c.client_id === clientId).map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}</select></div>
                    </div>
                    {/* Vehicle */}
                    {(category === 'Combustible' || category === 'Mantenimiento') && vehicles.length > 0 && <div className="bg-slate-800/30 border border-primary/20 rounded-lg p-3"><label className="text-xs text-primary mb-1 block flex items-center gap-1"><Truck size={12} />Vehículo</label><select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputCls}><option value="">—</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.plate_number ? `(${v.plate_number})` : ''}</option>)}</select></div>}
                    {/* Receipt */}
                    <div><label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Upload size={12} />Comprobante (foto/PDF)</label><input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 file:text-xs file:cursor-pointer" /></div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800"><button type="button" onClick={() => { setIsModalOpen(false); resetOrderForm(); }} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancelar</button><button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}</button></div>
                </form>
            </div></div>)}

            {/* ══ MODAL: RECHAZAR ══ */}
            {rejectId && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"><div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white font-grotesk mb-4 flex items-center gap-2"><XCircle className="text-red-400" />Rechazar Orden</h3>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Motivo del rechazo..." />
                <div className="flex justify-end gap-3 mt-4"><button onClick={() => setRejectId(null)} className="px-4 py-2 text-slate-300 text-sm">Cancelar</button><button onClick={handleReject} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Rechazar</button></div>
            </div></div>)}

            {/* ══ MODAL: PROVEEDOR ══ */}
            {isSupModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"><div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-slate-800"><h3 className="text-lg font-bold text-white font-grotesk">{editingSup ? 'Editar' : 'Nuevo'} Proveedor</h3><button onClick={() => { setIsSupModalOpen(false); resetSupForm(); }} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
                <form onSubmit={handleSaveSup} className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div className="col-span-2"><label className="text-xs text-slate-400 mb-1 block">Nombre *</label><input required value={supName} onChange={e => setSupName(e.target.value)} className={inputCls} /></div><div><label className="text-xs text-slate-400 mb-1 block">RUC</label><input value={supRuc} onChange={e => setSupRuc(e.target.value)} className={inputCls} /></div><div><label className="text-xs text-slate-400 mb-1 block">Teléfono</label><input value={supPhone} onChange={e => setSupPhone(e.target.value)} className={inputCls} /></div><div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={supEmail} onChange={e => setSupEmail(e.target.value)} className={inputCls} /></div><div><label className="text-xs text-slate-400 mb-1 block">Rubro</label><input value={supCategory} onChange={e => setSupCategory(e.target.value)} className={inputCls} placeholder="Ej: Combustible" /></div><div><label className="text-xs text-slate-400 mb-1 block">Banco</label><input value={supBank} onChange={e => setSupBank(e.target.value)} className={inputCls} /></div><div><label className="text-xs text-slate-400 mb-1 block">N° Cuenta</label><input value={supAccount} onChange={e => setSupAccount(e.target.value)} className={inputCls} /></div><div className="col-span-2"><label className="text-xs text-slate-400 mb-1 block">Dirección</label><input value={supAddress} onChange={e => setSupAddress(e.target.value)} className={inputCls} /></div></div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800"><button type="button" onClick={() => { setIsSupModalOpen(false); resetSupForm(); }} className="px-4 py-2 text-slate-300 text-sm">Cancelar</button><button type="submit" disabled={isSubmitting} className="bg-primary text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}</button></div>
                </form>
            </div></div>)}

            {/* ══ MODAL: CAJA CHICA ══ */}
            {isPettyModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"><div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-slate-800"><h3 className="text-lg font-bold text-white font-grotesk">Movimiento Caja Chica</h3><button onClick={() => setIsPettyModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
                <form onSubmit={handleSavePetty} className="p-5 space-y-3">
                    <div className="flex gap-2">{(['OUT', 'IN'] as const).map(t => <button key={t} type="button" onClick={() => setPettyType(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${pettyType === t ? (t === 'OUT' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400') : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{t === 'OUT' ? 'Egreso' : 'Ingreso/Reposición'}</button>)}</div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Descripción *</label><input required value={pettyDesc} onChange={e => setPettyDesc(e.target.value)} className={inputCls} placeholder="Ej: Compra útiles oficina" /></div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Monto (Gs.) *</label><input required value={pettyAmount} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setPettyAmount(v ? new Intl.NumberFormat('es-PY').format(parseInt(v)) : ''); }} className={inputCls} /></div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800"><button type="button" onClick={() => setIsPettyModalOpen(false)} className="px-4 py-2 text-slate-300 text-sm">Cancelar</button><button type="submit" disabled={isSubmitting} className="bg-primary text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">Guardar</button></div>
                </form>
            </div></div>)}
        </div>
    );
};

export default ModuloCompras;
