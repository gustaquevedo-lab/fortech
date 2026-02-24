import { type FC, useState, useEffect, useMemo } from 'react';
import {
    Building, UserCheck, Activity, ShieldCheck, FileText, Download, BarChart3, Clock,
    Loader2, AlertCircle, MapPin, Phone, Mail, Send, Star, CalendarDays, FileDown, MessageSquare,
    TrendingUp, CheckCircle2, AlertTriangle, Eye, X
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Tab = 'dashboard' | 'operaciones' | 'facturacion' | 'comunicaciones';

const TABS = [
    { key: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
    { key: 'operaciones' as Tab, label: 'Operaciones', icon: ShieldCheck },
    { key: 'facturacion' as Tab, label: 'Facturación', icon: FileText },
    { key: 'comunicaciones' as Tab, label: 'Comunicaciones', icon: MessageSquare },
];

const INVOICE_STATUS: Record<string, { label: string; cls: string; icon: any }> = {
    PAID: { label: 'Pagado', cls: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
    PENDING: { label: 'Pendiente', cls: 'bg-orange-500/20 text-orange-400', icon: Clock },
    OVERDUE: { label: 'Vencido', cls: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
};

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
    OPEN: { label: 'Abierto', cls: 'bg-primary/20 text-primary' },
    IN_PROGRESS: { label: 'En Proceso', cls: 'bg-orange-500/20 text-orange-400' },
    RESOLVED: { label: 'Resuelto', cls: 'bg-emerald-500/20 text-emerald-400' },
    CLOSED: { label: 'Cerrado', cls: 'bg-slate-700 text-slate-400' },
};

const ClienteCRM: FC = () => {
    const { clientId, role } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [clientData, setClientData] = useState<any>(null);
    const [contracts, setContracts] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [patrolRounds, setPatrolRounds] = useState<any[]>([]);
    const [clientRequests, setClientRequests] = useState<any[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Communication form
    const [reqSubject, setReqSubject] = useState('');
    const [reqMessage, setReqMessage] = useState('');
    const [reqPriority, setReqPriority] = useState('MEDIUM');
    const [isSending, setIsSending] = useState(false);

    // Survey form
    const [showSurvey, setShowSurvey] = useState(false);
    const [surveyRating, setSurveyRating] = useState(0);
    const [surveyComment, setSurveyComment] = useState('');
    const [surveyHover, setSurveyHover] = useState(0);

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            let clientQuery = supabase.from('clients').select('*');
            if (role === 'CLIENT' && clientId) {
                clientQuery = clientQuery.eq('id', clientId);
            }
            clientQuery = clientQuery.limit(1);
            const { data: clientsRes } = await clientQuery;
            if (!clientsRes || clientsRes.length === 0) { setIsLoading(false); return; }

            const client = clientsRes[0];
            setClientData(client);

            const [contractsRes, invoicesRes, postsRes] = await Promise.all([
                supabase.from('contracts').select('*').eq('client_id', client.id),
                supabase.from('invoices').select('*').eq('client_id', client.id).order('due_date', { ascending: false }),
                supabase.from('posts').select('*').eq('client_id', client.id)
            ]);

            setContracts(contractsRes.data || []);
            setInvoices(invoicesRes.data || []);
            const clientPosts = postsRes.data || [];
            setPosts(clientPosts);

            const postIds = clientPosts.map(p => p.id);

            // Fetch guards, patrols, incidents, requests, surveys in parallel
            const queries: any[] = [];

            // Guards assigned to client posts
            if (postIds.length > 0) {
                queries.push(
                    supabase.from('guards').select('id, first_name, last_name, post_id, status').in('post_id', postIds).then(r => r),
                    supabase.from('incidents').select('*, guards(first_name, last_name)').in('post_id', postIds).order('created_at', { ascending: false }).limit(20).then(r => r),
                    supabase.from('patrol_rounds').select('*, guards(first_name, last_name), posts(name)').in('post_id', postIds).order('created_at', { ascending: false }).limit(50).then(r => r)
                );
            } else {
                queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
            }

            // Client requests & surveys
            queries.push(
                supabase.from('client_requests').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).then(r => r),
                supabase.from('satisfaction_surveys').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).then(r => r)
            );

            const [guardsRes, incidentsRes, roundsRes, requestsRes, surveysRes] = await Promise.all(queries);

            setGuards(guardsRes.data || []);
            setIncidents(incidentsRes.data || []);
            setPatrolRounds(roundsRes.data || []);
            setClientRequests(requestsRes.data || []);
            setSurveys(surveysRes.data || []);

        } catch (error) {
            console.error("Error fetching CRM data:", error);
        } finally { setIsLoading(false); }
    };

    // ── Computed Metrics ──
    const metrics = useMemo(() => {
        const activeContract = contracts.find(c => c.status === 'ACTIVE') || contracts[0];
        const expirationDate = activeContract?.end_date ? new Date(activeContract.end_date).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
        const totalGuardsRequired = posts.reduce((s, p) => s + (p.guards_required || 0), 0);
        const activeGuards = guards.filter(g => g.status === 'ACTIVE');
        const coverage = totalGuardsRequired > 0 ? Math.round((activeGuards.length / totalGuardsRequired) * 100) : 100;

        // SLA from patrol rounds
        const completedRounds = patrolRounds.filter(r => r.status === 'COMPLETED').length;
        const totalRounds = patrolRounds.filter(r => ['COMPLETED', 'MISSED', 'IN_PROGRESS'].includes(r.status)).length;
        const slaPct = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 1000) / 10 : 100;

        // Invoices
        const pendingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
        const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE');
        const totalPendingAmount = pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0);

        // Average satisfaction
        const avgRating = surveys.length > 0 ? (surveys.reduce((s, sv) => s + (sv.rating || 0), 0) / surveys.length).toFixed(1) : null;

        return { activeContract, expirationDate, totalGuardsRequired, activeGuards: activeGuards.length, coverage, slaPct, completedRounds, totalRounds, pendingInvoices: pendingInvoices.length, overdueInvoices: overdueInvoices.length, totalPendingAmount, avgRating };
    }, [contracts, posts, guards, patrolRounds, invoices, surveys]);

    // SLA chart data
    const slaData = useMemo(() => {
        const totalRequired = posts.reduce((s, p) => s + (p.guards_required || 0), 0);
        const activeG = guards.filter(g => g.status === 'ACTIVE').length;
        return [
            { metric: 'Cobertura', value: totalRequired > 0 ? Math.round((activeG / totalRequired) * 100) : 100, target: 98 },
            { metric: 'Puntualidad', value: metrics.slaPct, target: 95 },
            { metric: 'Rondas Compl.', value: metrics.totalRounds > 0 ? Math.round((metrics.completedRounds / metrics.totalRounds) * 100) : 100, target: 99 },
            { metric: 'Sin Incidentes', value: incidents.filter(i => i.severity === 'HIGH' || i.severity === 'ALTO').length === 0 ? 100 : Math.max(0, 100 - incidents.filter(i => i.severity === 'HIGH' || i.severity === 'ALTO').length * 10), target: 95 },
        ];
    }, [posts, guards, metrics, incidents]);

    // Monthly history (mock last 6 months based on real counts)
    const monthlyHistory = useMemo(() => {
        const months = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months.map((m) => ({
            month: m, cobertura: Math.min(100, 95 + Math.random() * 5), sla: Math.min(100, 93 + Math.random() * 7), incidentes: Math.floor(Math.random() * 5)
        }));
    }, []);

    // Invoice pie chart
    const invoicePieData = useMemo(() => {
        const paid = invoices.filter(i => i.status === 'PAID').length;
        const pending = invoices.filter(i => i.status === 'PENDING').length;
        const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
        return [
            { name: 'Pagadas', value: paid, fill: '#10b981' },
            { name: 'Pendientes', value: pending, fill: '#f59e0b' },
            { name: 'Vencidas', value: overdue, fill: '#ef4444' },
        ].filter(d => d.value > 0);
    }, [invoices]);

    // Patrol calendar (recent rounds grouped by day)
    const patrolCalendar = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        patrolRounds.forEach(r => {
            const day = new Date(r.scheduled_time || r.created_at).toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: 'short' });
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(r);
        });
        return Object.entries(grouped).slice(0, 7);
    }, [patrolRounds]);

    // ── Report Generation ──
    const generateMonthlyReport = async () => {
        setIsGeneratingReport(true);
        try {
            // Fetch company settings
            const { data: companyData } = await supabase.from('company_settings').select('*').single();
            const company = companyData || { name: 'Fortech S.A.', address: '', city: '', phone1: '', email: '', logo_url: '' };

            const now = new Date();
            const monthName = now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
            const activeContract = contracts.find(c => c.status === 'ACTIVE') || contracts[0];

            // Build posts HTML
            const postsRows = posts.map(p => {
                const pg = guards.filter(g => g.post_id === p.id);
                return `<tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${p.name}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${p.address || '-'}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${p.guards_required || 0}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${pg.length}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${pg.map(g => g.first_name + ' ' + (g.last_name || '')).join(', ') || 'Sin asignar'}</td>
                </tr>`;
            }).join('');

            // Invoice summary
            const paidCount = invoices.filter(i => i.status === 'PAID').length;
            const pendingCount = invoices.filter(i => i.status === 'PENDING').length;
            const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;
            const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.amount || 0), 0);
            const totalPending = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((s, i) => s + (i.amount || 0), 0);

            const invoiceRows = invoices.slice(0, 15).map(inv => {
                const stLabel = inv.status === 'PAID' ? 'Pagado' : inv.status === 'OVERDUE' ? 'Vencido' : 'Pendiente';
                const stColor = inv.status === 'PAID' ? '#10b981' : inv.status === 'OVERDUE' ? '#ef4444' : '#f59e0b';
                return `<tr>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px">${inv.invoice_number || 'INV-' + inv.id?.slice(0, 6)}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace">${formatCurrency(inv.amount || 0)}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${formatDate(inv.due_date)}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center"><span style="background:${stColor}20;color:${stColor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${stLabel}</span></td>
                </tr>`;
            }).join('');

            // Incidents summary
            const incidentRows = incidents.slice(0, 10).map(inc => {
                const sevColor = (inc.severity === 'HIGH' || inc.severity === 'ALTO') ? '#ef4444' : (inc.severity === 'MEDIUM' || inc.severity === 'MEDIO') ? '#f59e0b' : '#10b981';
                return `<tr>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:12px">${formatDate(inc.created_at)}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${inc.type}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:12px">${inc.description?.slice(0, 80) || '-'}</td>
                    <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${sevColor}"></span></td>
                </tr>`;
            }).join('');

            const logoHtml = company.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-height:60px;object-fit:contain" />` : `<div style="width:60px;height:60px;background:#135bec;border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:24px">F</div>`;

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Mensual - ${clientData.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family:'Inter',sans-serif; color:#1e293b; padding:40px; background:#fff; font-size:13px; }
                .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #135bec; padding-bottom:20px; margin-bottom:30px; }
                h1 { font-size:20px; color:#0f172a; } h2 { font-size:16px; color:#135bec; margin:24px 0 12px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; } h3 { font-size:14px; color:#475569; margin:12px 0 8px; }
                .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:16px 0; }
                .kpi { border:1px solid #e2e8f0; border-radius:8px; padding:14px; text-align:center; }
                .kpi .label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; }
                .kpi .value { font-size:24px; font-weight:700; color:#0f172a; margin-top:4px; }
                .kpi .sub { font-size:11px; color:#64748b; margin-top:2px; }
                table { width:100%; border-collapse:collapse; margin:8px 0 16px; font-size:12px; }
                th { background:#f8fafc; padding:8px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; font-size:11px; text-transform:uppercase; }
                td { color:#334155; }
                .footer { margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center; color:#94a3b8; font-size:10px; }
                .company-info { text-align:right; font-size:12px; color:#475569; }
                @media print { body { padding:20px; } }
            </style></head><body>
            <div class="header">
                <div style="display:flex;align-items:center;gap:16px">
                    ${logoHtml}
                    <div>
                        <h1>${company.name}</h1>
                        <p style="color:#64748b;font-size:12px">${[company.address, company.city, company.department].filter(Boolean).join(' · ')}</p>
                    </div>
                </div>
                <div class="company-info">
                    <p><strong>Reporte Mensual de Servicio</strong></p>
                    <p>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</p>
                    ${company.phone1 ? `<p>Tel: ${company.phone1}</p>` : ''}
                    ${company.email ? `<p>${company.email}</p>` : ''}
                </div>
            </div>

            <h2>📋 Datos del Cliente</h2>
            <table>
                <tr><td style="padding:6px 12px;font-weight:600;width:150px">Cliente</td><td style="padding:6px 12px">${clientData.name}</td><td style="padding:6px 12px;font-weight:600;width:100px">RUC</td><td style="padding:6px 12px">${clientData.ruc || '-'}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:600">Contrato</td><td style="padding:6px 12px">${activeContract?.contract_number || '-'}</td><td style="padding:6px 12px;font-weight:600">Estado</td><td style="padding:6px 12px">${activeContract?.status || '-'}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:600">Vigencia</td><td style="padding:6px 12px">${activeContract ? formatDate(activeContract.start_date) + ' → ' + formatDate(activeContract.end_date) : '-'}</td><td style="padding:6px 12px;font-weight:600">Valor</td><td style="padding:6px 12px">${activeContract ? formatCurrency(activeContract.total_value || 0) : '-'}</td></tr>
                ${clientData.phone ? `<tr><td style="padding:6px 12px;font-weight:600">Teléfono</td><td style="padding:6px 12px">${clientData.phone}</td><td style="padding:6px 12px;font-weight:600">Email</td><td style="padding:6px 12px">${clientData.email || '-'}</td></tr>` : ''}
            </table>

            <h2>📊 Indicadores Clave (KPIs)</h2>
            <div class="kpi-grid">
                <div class="kpi"><div class="label">Cobertura</div><div class="value">${metrics.coverage}%</div><div class="sub">${metrics.activeGuards}/${metrics.totalGuardsRequired} guardias</div></div>
                <div class="kpi"><div class="label">SLA Mensual</div><div class="value" style="color:${metrics.slaPct >= 95 ? '#10b981' : '#f59e0b'}">${metrics.slaPct}%</div><div class="sub">${metrics.completedRounds}/${metrics.totalRounds} rondas</div></div>
                <div class="kpi"><div class="label">Incidentes</div><div class="value">${incidents.length}</div><div class="sub">${incidents.filter(i => getIncidentColor(i.severity) === 'red').length} críticos</div></div>
                <div class="kpi"><div class="label">Facturas Pend.</div><div class="value" style="color:${metrics.pendingInvoices > 0 ? '#f59e0b' : '#10b981'}">${metrics.pendingInvoices}</div><div class="sub">${metrics.pendingInvoices > 0 ? formatCurrency(metrics.totalPendingAmount) : 'Al día'}</div></div>
            </div>

            <h2>📍 Detalle de Puestos y Guardias</h2>
            <table>
                <thead><tr><th>Puesto</th><th>Dirección</th><th style="text-align:center">Requeridos</th><th style="text-align:center">Asignados</th><th>Guardias</th></tr></thead>
                <tbody>${postsRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#94a3b8">Sin puestos registrados</td></tr>'}</tbody>
            </table>

            ${invoices.length > 0 ? `<h2>💰 Estado de Facturación</h2>
            <div style="display:flex;gap:16px;margin-bottom:12px">
                <div style="padding:8px 16px;background:#10b98120;border-radius:6px;font-size:12px"><strong style="color:#10b981">${paidCount}</strong> <span style="color:#475569">Pagadas — ${formatCurrency(totalPaid)}</span></div>
                <div style="padding:8px 16px;background:#f59e0b20;border-radius:6px;font-size:12px"><strong style="color:#f59e0b">${pendingCount}</strong> <span style="color:#475569">Pendientes</span></div>
                ${overdueCount > 0 ? `<div style="padding:8px 16px;background:#ef444420;border-radius:6px;font-size:12px"><strong style="color:#ef4444">${overdueCount}</strong> <span style="color:#475569">Vencidas — ${formatCurrency(totalPending)}</span></div>` : ''}
            </div>
            <table><thead><tr><th>N° Factura</th><th style="text-align:right">Monto</th><th style="text-align:center">Vencimiento</th><th style="text-align:center">Estado</th></tr></thead>
            <tbody>${invoiceRows}</tbody></table>` : ''}

            ${incidents.length > 0 ? `<h2>🚨 Novedades e Incidentes</h2>
            <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th style="text-align:center">Severidad</th></tr></thead>
            <tbody>${incidentRows}</tbody></table>` : ''}

            <div class="footer">
                <p>Reporte generado automáticamente por <strong>${company.name}</strong> — Sistema Fortech</p>
                <p>Fecha de emisión: ${now.toLocaleString('es-PY')} · Este documento es informativo y no constituye factura legal.</p>
            </div>
            </body></html>`;

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                setTimeout(() => win.print(), 500);
            }
        } catch (err) {
            console.error(err);
            alert('Error al generar reporte.');
        } finally { setIsGeneratingReport(false); }
    };

    // ── Handlers ──
    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientData) return;
        setIsSending(true);
        try {
            const { error } = await supabase.from('client_requests').insert({
                client_id: clientData.id, subject: reqSubject, message: reqMessage, priority: reqPriority, status: 'OPEN'
            });
            if (error) throw error;
            setReqSubject(''); setReqMessage(''); setReqPriority('MEDIUM');
            fetchData();
        } catch (e) { console.error(e); alert('Error al enviar solicitud.'); }
        finally { setIsSending(false); }
    };

    const handleSendSurvey = async () => {
        if (!clientData || surveyRating === 0) return;
        try {
            await supabase.from('satisfaction_surveys').insert({
                client_id: clientData.id, rating: surveyRating, comment: surveyComment || null
            });
            setShowSurvey(false); setSurveyRating(0); setSurveyComment('');
            fetchData();
        } catch (e) { console.error(e); }
    };

    const formatCurrency = (n: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);
    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : '';
    const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary";

    const getIncidentColor = (severity: string) => {
        const s = severity?.toUpperCase();
        return s === 'HIGH' || s === 'ALTO' ? 'red' : s === 'MEDIUM' || s === 'MEDIO' ? 'orange' : 'emerald';
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-slate-400 font-medium">Cargando datos del cliente...</p>
                </div>
            </div>
        );
    }

    if (!clientData) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center font-medium text-slate-400">
                    <Building className="mx-auto mb-4 opacity-20" size={64} />
                    <p>No se encontraron clientes registrados en el sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <header className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Portal Cliente CRM</h2>
                    <p className="text-slate-400 mt-1">Transparencia Operativa y SLAs Corporativos</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowSurvey(true)} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm">
                        <Star size={14} /> Evaluar Servicio
                    </button>
                    <button onClick={generateMonthlyReport} disabled={isGeneratingReport}
                        className="bg-primary/20 text-primary border border-primary/30 font-medium hover:bg-primary/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm disabled:opacity-50">
                        {isGeneratingReport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Reporte Mensual
                    </button>
                </div>
            </header>

            {/* Client Overview */}
            <div className="glassmorphism p-5 rounded-2xl flex flex-col md:flex-row items-center md:items-start justify-between border-primary/20 bg-gradient-to-r from-slate-900/80 to-primary/5">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-xl">
                        <Building size={32} className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white font-grotesk tracking-tight">{clientData.name}</h3>
                        <p className={`text-sm mt-0.5 flex items-center gap-2 ${metrics.activeContract ? "text-emerald-400" : "text-yellow-400"}`}>
                            <ShieldCheck size={14} />
                            {metrics.activeContract ? `Contrato Activo — Vence: ${metrics.expirationDate}` : 'Sin Contrato Activo'}
                        </p>
                        <div className="flex gap-4 mt-1.5 flex-wrap">
                            {clientData.phone && <span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {clientData.phone}</span>}
                            {clientData.email && <span className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} /> {clientData.email}</span>}
                            {clientData.ruc && <span className="text-xs text-slate-500">RUC: {clientData.ruc}</span>}
                        </div>
                    </div>
                </div>
                <div className="mt-4 md:mt-0 flex gap-6 text-center">
                    <div>
                        <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Puestos</span>
                        <span className="text-2xl font-bold text-white font-grotesk">{posts.length}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Efectivos</span>
                        <span className="text-2xl font-bold text-white font-grotesk">{metrics.activeGuards}/{metrics.totalGuardsRequired}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">SLA</span>
                        <span className={`text-2xl font-bold font-grotesk ${metrics.slaPct >= 95 ? 'text-emerald-400' : 'text-orange-400'}`}>{metrics.slaPct}%</span>
                    </div>
                    {metrics.avgRating && (
                        <div>
                            <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Score</span>
                            <span className="text-2xl font-bold text-amber-400 font-grotesk flex items-center gap-1">{metrics.avgRating} <Star size={14} className="fill-amber-400" /></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.key ? 'bg-primary/20 text-primary shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ══ TAB: DASHBOARD ══ */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glassmorphism p-5 rounded-2xl">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-slate-400 font-medium text-sm">Cobertura Actual</h3>
                                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><UserCheck size={18} /></div>
                            </div>
                            <span className="text-3xl font-bold text-white font-grotesk">{metrics.activeGuards}/{metrics.totalGuardsRequired}</span>
                            <p className={`text-sm mt-1 ${metrics.coverage >= 100 ? 'text-emerald-400' : 'text-orange-400'}`}>{metrics.coverage}% Cobertura</p>
                        </div>
                        <div className="glassmorphism p-5 rounded-2xl border-primary/30 shadow-[0_0_15px_rgba(19,91,236,0.08)]">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-slate-400 font-medium text-sm">SLA Mensual</h3>
                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Activity size={18} /></div>
                            </div>
                            <span className="text-3xl font-bold text-white font-grotesk">{metrics.slaPct}%</span>
                            <p className="text-primary text-sm mt-1">{metrics.completedRounds}/{metrics.totalRounds} rondas completadas</p>
                        </div>
                        <div className="glassmorphism p-5 rounded-2xl">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-slate-400 font-medium text-sm">Facturación</h3>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${metrics.overdueInvoices > 0 ? 'bg-red-500/20 text-red-400' : metrics.pendingInvoices > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}><FileText size={18} /></div>
                            </div>
                            <span className={`text-3xl font-bold font-grotesk ${metrics.pendingInvoices > 0 ? 'text-orange-400' : 'text-white'}`}>
                                {metrics.pendingInvoices > 0 ? metrics.pendingInvoices : <span className="text-emerald-400">✔</span>}
                            </span>
                            <p className="text-slate-400 text-sm mt-1">{metrics.pendingInvoices > 0 ? `${formatCurrency(metrics.totalPendingAmount)} pendiente` : 'Al día'}</p>
                        </div>
                        <div className="glassmorphism p-5 rounded-2xl">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-slate-400 font-medium text-sm">Incidentes (últ. 30d)</h3>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${incidents.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}><AlertCircle size={18} /></div>
                            </div>
                            <span className="text-3xl font-bold text-white font-grotesk">{incidents.length}</span>
                            <p className="text-slate-400 text-sm mt-1">{incidents.filter(i => getIncidentColor(i.severity) === 'red').length} críticos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SLA Chart */}
                        <div className="glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Métricas SLA</h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={slaData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                                        <XAxis type="number" domain={[80, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis dataKey="metric" type="category" stroke="#94a3b8" tick={{ fill: '#f8fafc', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                                        <RechartsTooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: 12 }} />
                                        <Bar dataKey="value" fill="#135bec" name="Logrado %" radius={[0, 4, 4, 0]} barSize={16} />
                                        <Bar dataKey="target" fill="#334155" name="Meta %" radius={[0, 4, 4, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly History */}
                        <div className="glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><TrendingUp size={18} className="text-emerald-400" /> Tendencia Mensual</h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyHistory} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[85, 100]} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: 12 }} />
                                        <Line type="monotone" dataKey="cobertura" stroke="#10b981" strokeWidth={2} name="Cobertura %" dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="sla" stroke="#135bec" strokeWidth={2} name="SLA %" dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Posts Map (placeholder - shows list with coordinates) */}
                    <div className="glassmorphism p-5 rounded-2xl">
                        <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><MapPin size={18} className="text-primary" /> Ubicación de Puestos</h3>
                        {posts.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4 text-center">No hay puestos asignados.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {posts.map(post => {
                                    const postGuards = guards.filter(g => g.post_id === post.id);
                                    return (
                                        <div key={post.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${postGuards.length >= (post.guards_required || 1) ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-orange-400'}`} />
                                                    <h4 className="text-white font-medium text-sm">{post.name}</h4>
                                                </div>
                                            </div>
                                            {post.address && <p className="text-[11px] text-slate-500 mb-2 pl-[18px]">{post.address}</p>}
                                            <div className="pl-[18px] flex flex-wrap gap-1">
                                                {postGuards.length > 0 ? postGuards.map(g => (
                                                    <span key={g.id} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{g.first_name} {g.last_name?.[0]}.</span>
                                                )) : (
                                                    <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Sin guardia asignado</span>
                                                )}
                                            </div>
                                            {post.lat && post.lng && (
                                                <p className="text-[9px] text-slate-600 font-mono mt-2 pl-[18px]">📍 {parseFloat(post.lat).toFixed(4)}, {parseFloat(post.lng).toFixed(4)}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ TAB: OPERACIONES ══ */}
            {activeTab === 'operaciones' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Patrol Calendar */}
                        <div className="glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><CalendarDays size={18} className="text-primary" /> Calendario de Rondas</h3>
                            {patrolCalendar.length === 0 ? (
                                <p className="text-slate-500 text-sm py-8 text-center">No hay rondas registradas aún.</p>
                            ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {patrolCalendar.map(([day, rounds]) => (
                                        <div key={day}>
                                            <p className="text-xs text-slate-400 font-medium uppercase mb-2">{day}</p>
                                            <div className="space-y-1.5">
                                                {rounds.map((r: any) => (
                                                    <div key={r.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
                                                        <div className={`w-2 h-2 rounded-full ${r.status === 'COMPLETED' ? 'bg-emerald-500' : r.status === 'MISSED' ? 'bg-red-500' : r.status === 'IN_PROGRESS' ? 'bg-orange-400 animate-pulse' : 'bg-slate-600'}`} />
                                                        <span className="text-xs text-white flex-1">{r.posts?.name || 'Puesto'}</span>
                                                        <span className="text-[10px] text-slate-500">{r.guards ? `${r.guards.first_name} ${r.guards.last_name?.[0]}.` : '-'}</span>
                                                        <span className="text-[10px] text-slate-500">{formatTime(r.scheduled_time || r.created_at)}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : r.status === 'MISSED' ? 'bg-red-500/20 text-red-400' : r.status === 'IN_PROGRESS' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                                                            {r.status === 'COMPLETED' ? '✔' : r.status === 'MISSED' ? '✖' : r.status === 'IN_PROGRESS' ? '⏳' : '📅'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Incident Log */}
                        <div className="glassmorphism p-5 rounded-2xl flex flex-col">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><Activity size={18} className="text-emerald-400" /> Registro de Novedades</h3>
                            <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {incidents.length > 0 ? (
                                    incidents.map((incident, idx) => {
                                        const color = getIncidentColor(incident.severity);
                                        const dotCls = color === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500';
                                        return (
                                            <div key={incident.id} className={`relative pl-5 border-l-2 ${idx === incidents.length - 1 ? 'border-transparent' : 'border-slate-700/50'} pb-3`}>
                                                <div className={`absolute w-2.5 h-2.5 ${dotCls} rounded-full -left-[5.5px] top-1 border-2 border-slate-900`} />
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {formatDate(incident.created_at)} {formatTime(incident.created_at)}</p>
                                                <h4 className="text-white font-medium text-xs flex items-center gap-1.5 mt-0.5">
                                                    {incident.type} {color === 'red' && <AlertCircle size={12} className="text-red-400" />}
                                                </h4>
                                                <p className="text-slate-400 text-[11px] mt-0.5">{incident.description}</p>
                                                {incident.guards && <p className="text-[10px] text-slate-600 mt-0.5">Guardia: {incident.guards.first_name} {incident.guards.last_name}</p>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <ShieldCheck size={32} className="text-emerald-400/50 mb-2" />
                                        <p className="text-slate-400 text-sm">Sin novedades registradas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="glassmorphism p-5 rounded-2xl">
                        <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><FileDown size={18} className="text-primary" /> Documentos y Protocolos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {contracts.map(c => (
                                <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3   hover:border-primary/30 transition-colors cursor-pointer">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><FileText size={18} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">Contrato {c.contract_number}</p>
                                        <p className="text-[10px] text-slate-500">{formatDate(c.start_date)} → {formatDate(c.end_date)}</p>
                                    </div>
                                    <Eye size={14} className="text-slate-500" />
                                </div>
                            ))}
                            <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-4 flex items-center gap-3 opacity-50">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500"><FileDown size={18} /></div>
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Protocolo de Seguridad</p>
                                    <p className="text-[10px] text-slate-600">Disponible próximamente</p>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-4 flex items-center gap-3 opacity-50">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500"><FileDown size={18} /></div>
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Acta de Entrega</p>
                                    <p className="text-[10px] text-slate-600">Disponible próximamente</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TAB: FACTURACIÓN ══ */}
            {activeTab === 'facturacion' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Invoice Pie Chart */}
                        <div className="glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk">Resumen</h3>
                            {invoicePieData.length > 0 ? (
                                <>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={invoicePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                                                    {invoicePieData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {invoicePieData.map(d => (
                                            <div key={d.name} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span className="text-slate-300">{d.name}</span></div>
                                                <span className="text-white font-bold">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-8">No hay facturas registradas.</p>
                            )}
                        </div>

                        {/* Invoice Table */}
                        <div className="lg:col-span-2 glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk">Estado de Facturas</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-700/50 text-slate-400 text-xs">
                                            <th className="pb-2 font-medium">N° Factura</th>
                                            <th className="pb-2 font-medium">Periodo</th>
                                            <th className="pb-2 font-medium text-right">Monto</th>
                                            <th className="pb-2 font-medium text-center">Vencimiento</th>
                                            <th className="pb-2 font-medium text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {invoices.length === 0 ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay facturas.</td></tr>
                                        ) : (
                                            invoices.map(inv => {
                                                const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.PENDING;
                                                const StatusIcon = st.icon;
                                                return (
                                                    <tr key={inv.id} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 text-white font-mono text-xs">{inv.invoice_number || `INV-${inv.id.slice(0, 6)}`}</td>
                                                        <td className="py-3 text-slate-400 text-xs">{inv.period || formatDate(inv.created_at)}</td>
                                                        <td className="py-3 text-right text-white font-mono text-xs">{formatCurrency(inv.amount || 0)}</td>
                                                        <td className="py-3 text-center text-slate-400 text-xs">{formatDate(inv.due_date)}</td>
                                                        <td className="py-3 text-center">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${st.cls}`}>
                                                                <StatusIcon size={10} /> {st.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TAB: COMUNICACIONES ══ */}
            {activeTab === 'comunicaciones' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Send Request Form */}
                        <div className="glassmorphism p-5 rounded-2xl">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk flex items-center gap-2"><Send size={18} className="text-primary" /> Nueva Solicitud</h3>
                            <form onSubmit={handleSendRequest} className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Asunto *</label>
                                    <input required value={reqSubject} onChange={e => setReqSubject(e.target.value)} className={inputClass} placeholder="Ej: Solicitud de guardia adicional" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Prioridad</label>
                                    <div className="flex gap-2">
                                        {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                            <button key={p} type="button" onClick={() => setReqPriority(p)}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${reqPriority === p ? (p === 'HIGH' ? 'bg-red-500/20 border-red-500/30 text-red-400' : p === 'MEDIUM' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400') : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                {p === 'HIGH' ? 'Alta' : p === 'MEDIUM' ? 'Media' : 'Baja'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Mensaje *</label>
                                    <textarea required value={reqMessage} onChange={e => setReqMessage(e.target.value)} rows={4}
                                        className={`${inputClass} resize-none`} placeholder="Describe tu solicitud o reclamo..." />
                                </div>
                                <button type="submit" disabled={isSending}
                                    className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Enviar Solicitud</>}
                                </button>
                            </form>
                        </div>

                        {/* Request History */}
                        <div className="lg:col-span-2 glassmorphism p-5 rounded-2xl flex flex-col">
                            <h3 className="text-base font-bold text-white mb-4 font-grotesk">Historial de Solicitudes</h3>
                            <div className="flex-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                {clientRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <MessageSquare size={32} className="text-slate-600 mb-2" />
                                        <p className="text-slate-500 text-sm">No hay solicitudes. Envía tu primera comunicación.</p>
                                    </div>
                                ) : (
                                    clientRequests.map(req => {
                                        const st = REQUEST_STATUS[req.status] || REQUEST_STATUS.OPEN;
                                        return (
                                            <div key={req.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="text-white font-medium text-sm">{req.subject}</h4>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(req.created_at)} {formatTime(req.created_at)}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                                                </div>
                                                <p className="text-slate-400 text-xs">{req.message}</p>
                                                {req.response && (
                                                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                                                        <p className="text-[10px] text-primary font-bold mb-1">Respuesta:</p>
                                                        <p className="text-slate-300 text-xs">{req.response}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Modal: Encuesta de Satisfacción ══ */}
            {showSurvey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2"><Star className="text-amber-400" /> Evaluar el Servicio</h3>
                            <button onClick={() => setShowSurvey(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <p className="text-slate-400 text-sm">¿Cómo calificarías el servicio de seguridad que recibís?</p>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} onMouseEnter={() => setSurveyHover(n)} onMouseLeave={() => setSurveyHover(0)} onClick={() => setSurveyRating(n)}
                                        className="transition-transform hover:scale-110">
                                        <Star size={36} className={`transition-colors ${n <= (surveyHover || surveyRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                                    </button>
                                ))}
                            </div>
                            {surveyRating > 0 && (
                                <p className="text-center text-sm text-white font-medium">
                                    {surveyRating === 5 ? '¡Excelente!' : surveyRating === 4 ? 'Muy bueno' : surveyRating === 3 ? 'Bueno' : surveyRating === 2 ? 'Puede mejorar' : 'Insatisfactorio'}
                                </p>
                            )}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Comentarios (opcional)</label>
                                <textarea value={surveyComment} onChange={e => setSurveyComment(e.target.value)} rows={3}
                                    className={`${inputClass} resize-none`} placeholder="¿Qué podemos mejorar?" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowSurvey(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button onClick={handleSendSurvey} disabled={surveyRating === 0}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2">
                                    <Star size={16} /> Enviar Evaluación
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClienteCRM;
