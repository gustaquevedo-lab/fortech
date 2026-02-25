import { type FC, type ReactNode, useState, useEffect, useMemo } from 'react';
import {
    MapPin, Radio, ShieldAlert, CheckCircle, Clock, X, Loader2,
    Plus, Navigation, Route, Users, Play
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

// Asunción, Paraguay center
const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];

// Dark tile layer (CartoDB Dark Matter - 100% free)
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Custom marker icons using divIcon
const createPostIcon = (status: string) => L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.6);${status === 'SOS' ? 'background:#ef4444;animation:bounce 1s infinite;' :
        status === 'ACTIVE' ? 'background:#135bec;' : 'background:#475569;'
        }">${status === 'SOS' ? '🚨' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
});

const checkpointIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;border-radius:50%;background:#fb923c;border:2px solid rgba(255,255,255,0.5);box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
});

// Helper component to recenter map when data changes
const MapRecenter: FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
    return null;
};

const ROUND_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    SCHEDULED: { label: 'Programada', cls: 'bg-slate-700 text-slate-300', dot: 'bg-slate-400' },
    IN_PROGRESS: { label: 'En Progreso', cls: 'bg-primary/20 text-primary', dot: 'bg-primary animate-pulse' },
    COMPLETED: { label: 'Completada', cls: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
    MISSED: { label: 'No Realizada', cls: 'bg-red-500/20 text-red-400', dot: 'bg-red-400' },
};

const INCIDENT_TYPES: Record<string, { label: string; emoji: string; cls: string }> = {
    SOS: { label: 'EMERGENCIA SOS', emoji: '🚨', cls: 'bg-red-500 text-white' },
    ANOMALY: { label: 'Anomalía', emoji: '⚠️', cls: 'bg-orange-500/20 text-orange-400' },
    ROUND: { label: 'Ronda', emoji: '🔄', cls: 'bg-slate-700 text-slate-300' },
    ACCIDENT: { label: 'Accidente', emoji: '💥', cls: 'bg-red-500/20 text-red-400' },
};

type TabPanel = 'bitacora' | 'rondas' | 'asignaciones';

const OperacionesCampo: FC = () => {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [guards, setGuards] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const [checkpoints, setCheckpoints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabPanel>('bitacora');

    // Map state
    const [_selectedMarker, setSelectedMarker] = useState<any | null>(null);

    // Modal States
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Incident Form
    const [selectedGuardId, setSelectedGuardId] = useState('');
    const [incidentType, setIncidentType] = useState('ANOMALY');
    const [incidentLocation, setIncidentLocation] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [_incidentLat, setIncidentLat] = useState('');
    const [_incidentLng, setIncidentLng] = useState('');

    // Round Form
    const [roundGuardId, setRoundGuardId] = useState('');
    const [roundPostId, setRoundPostId] = useState('');
    const [roundScheduledTime, setRoundScheduledTime] = useState('');

    // Checkpoint Form
    const [cpName, setCpName] = useState('');
    const [cpPostId, setCpPostId] = useState('');
    const [cpLat, setCpLat] = useState('');
    const [cpLng, setCpLng] = useState('');
    const [activeAttendances, setActiveAttendances] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const [incRes, gRes, pRes, rRes, cpRes, attRes] = await Promise.all([
            supabase.from('incidents').select('*, guards(*)').order('timestamp', { ascending: false }).limit(30),
            supabase.from('guards').select('*').eq('status', 'ACTIVE').order('first_name', { ascending: true }),
            supabase.from('posts').select('*').order('name', { ascending: true }),
            supabase.from('patrol_rounds').select('*, guards(id, first_name, last_name), posts(id, name, lat, lng)').order('created_at', { ascending: false }).limit(50),
            supabase.from('patrol_checkpoints').select('*, posts(id, name)').order('order_index', { ascending: true }),
            supabase.from('attendance_logs').select('*, guards(*)').is('check_out', null),
        ]);
        if (incRes.data) setIncidents(incRes.data);
        if (gRes.data) setGuards(gRes.data);
        if (pRes.data) setPosts(pRes.data);
        if (rRes.data) setRounds(rRes.data);
        if (cpRes.data) setCheckpoints(cpRes.data);
        if (attRes.data) setActiveAttendances(attRes.data);
        setIsLoading(false);
    };

    // ── Handlers ──
    const handleReportIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('incidents').insert({
                guard_id: selectedGuardId,
                type: incidentType,
                location: incidentLocation,
                description: incidentDescription,
                status: incidentType === 'SOS' ? 'OPEN' : 'RESOLVED'
            });
            if (error) throw error;
            setIsIncidentModalOpen(false);
            setSelectedGuardId(''); setIncidentType('ANOMALY'); setIncidentLocation(''); setIncidentDescription('');
            setIncidentLat(''); setIncidentLng('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al reportar incidente.');
        } finally { setIsSubmitting(false); }
    };

    const handleResolveIncident = async (id: string) => {
        await supabase.from('incidents').update({ status: 'RESOLVED' }).eq('id', id);
        fetchData();
    };

    const handleCreateRound = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('patrol_rounds').insert({
                guard_id: roundGuardId,
                post_id: roundPostId || null,
                scheduled_time: roundScheduledTime || null,
                status: 'SCHEDULED'
            });
            if (error) throw error;
            setIsRoundModalOpen(false);
            setRoundGuardId(''); setRoundPostId(''); setRoundScheduledTime('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al crear ronda.');
        } finally { setIsSubmitting(false); }
    };

    const handleStartRound = async (roundId: string) => {
        await supabase.from('patrol_rounds').update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() }).eq('id', roundId);
        fetchData();
    };

    const handleCompleteRound = async (roundId: string) => {
        await supabase.from('patrol_rounds').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', roundId);
        fetchData();
    };

    const handleCreateCheckpoint = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('patrol_checkpoints').insert({
                name: cpName,
                post_id: cpPostId,
                lat: parseFloat(cpLat),
                lng: parseFloat(cpLng),
                order_index: checkpoints.filter(c => c.post_id === cpPostId).length
            });
            if (error) throw error;
            setIsCheckpointModalOpen(false);
            setCpName(''); setCpPostId(''); setCpLat(''); setCpLng('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error al crear checkpoint.');
        } finally { setIsSubmitting(false); }
    };

    // ── Stats ──
    const activeSosCount = incidents.filter(i => i.type === 'SOS' && i.status === 'OPEN').length;
    const todayStr = new Date().toDateString();
    const roundsToday = rounds.filter(r => new Date(r.created_at).toDateString() === todayStr);
    const roundsCompleted = roundsToday.filter(r => r.status === 'COMPLETED').length;
    const roundsInProgress = rounds.filter(r => r.status === 'IN_PROGRESS').length;
    const guardsOnDuty = new Set(rounds.filter(r => r.status === 'IN_PROGRESS').map(r => r.guard_id)).size;

    // Map markers data
    const mapMarkers = useMemo(() => {
        const markers: any[] = [];
        // Posts with location
        posts.filter(p => p.lat && p.lng).forEach(p => {
            const hasSOS = incidents.some(i => i.location?.includes(p.name) && i.type === 'SOS' && i.status === 'OPEN');

            // Check if there is an active attendance (guard checked in) for this post
            const activeAttendance = activeAttendances.find(a => a.post_id === p.id);
            // Alternatively, check if there's an active round
            const activeRound = rounds.find(r => r.post_id === p.id && r.status === 'IN_PROGRESS');

            const isActive = !!activeAttendance || !!activeRound;

            let guardName = null;
            if (activeAttendance && activeAttendance.guards) {
                guardName = `${activeAttendance.guards.first_name} ${activeAttendance.guards.last_name}`;
            } else if (activeRound && activeRound.guards) {
                guardName = `${activeRound.guards.first_name} ${activeRound.guards.last_name}`;
            }

            markers.push({
                type: 'post',
                id: p.id,
                lat: parseFloat(p.lat),
                lng: parseFloat(p.lng),
                name: p.name,
                address: p.address,
                status: hasSOS ? 'SOS' : isActive ? 'ACTIVE' : 'IDLE',
                guard: guardName
            });
        });
        // Checkpoints
        checkpoints.filter(c => c.lat && c.lng).forEach(c => {
            markers.push({
                type: 'checkpoint',
                id: c.id,
                lat: parseFloat(c.lat),
                lng: parseFloat(c.lng),
                name: c.name,
                postName: c.posts?.name
            });
        });
        return markers;
    }, [posts, rounds, incidents, checkpoints, activeAttendances]);

    const mapCenter = useMemo((): [number, number] => {
        const located = posts.filter(p => p.lat && p.lng);
        if (located.length === 0) return DEFAULT_CENTER;
        const avgLat = located.reduce((s, p) => s + parseFloat(p.lat), 0) / located.length;
        const avgLng = located.reduce((s, p) => s + parseFloat(p.lng), 0) / located.length;
        return [avgLat, avgLng];
    }, [posts]);

    const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary";

    return (
        <div className="animate-in fade-in duration-500 space-y-6 relative">
            <header className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Estación iSOC — Operaciones de Campo</h2>
                    <p className="text-slate-400 mt-1">Centro de Control de Seguridad con Geolocalización en Tiempo Real</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsRoundModalOpen(true)}
                        className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 shadow-[0_0_15px_rgba(19,91,236,0.2)] flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <Route size={16} /> Programar Ronda
                    </button>
                    <button onClick={() => setIsIncidentModalOpen(true)}
                        className="bg-red-500/20 text-red-500 border border-red-500/30 font-bold hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors">
                        <Radio size={16} /> Reportar Novedad / SOS
                    </button>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-white font-grotesk">{isLoading ? '-' : guards.length}</p>
                    <p className="text-slate-400 text-xs mt-1">Guardias Activos</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary font-grotesk">{guardsOnDuty}</p>
                    <p className="text-slate-400 text-xs mt-1">En Ronda Ahora</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-emerald-400 font-grotesk">{roundsCompleted}</p>
                    <p className="text-slate-400 text-xs mt-1">Rondas Completadas (Hoy)</p>
                </div>
                <div className="glassmorphism p-4 rounded-xl text-center">
                    <p className="text-2xl font-bold text-orange-400 font-grotesk">{roundsInProgress}</p>
                    <p className="text-slate-400 text-xs mt-1">Rondas en Progreso</p>
                </div>
                <div className={`glassmorphism p-4 rounded-xl text-center ${activeSosCount > 0 ? 'border border-red-500/40' : ''}`}>
                    <div className="relative inline-block">
                        {activeSosCount > 0 && <div className="absolute inset-0 bg-red-500/40 rounded-full animate-ping" />}
                        <p className={`text-2xl font-bold font-grotesk relative ${activeSosCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{activeSosCount}</p>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">🚨 Alertas SOS</p>
                </div>
            </div>

            {/* Main layout: Map + Side Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}>

                {/* Map */}
                <div className="lg:col-span-3 glassmorphism rounded-2xl overflow-hidden border border-slate-700/50 relative">
                    <MapContainer
                        center={mapCenter}
                        zoom={13}
                        scrollWheelZoom={true}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer url={DARK_TILE_URL} attribution={TILE_ATTRIBUTION} />
                        <MapRecenter center={mapCenter} />

                        {mapMarkers.map(m => (
                            <Marker
                                key={`${m.type}-${m.id}`}
                                position={[m.lat, m.lng]}
                                icon={m.type === 'post' ? createPostIcon(m.status) : checkpointIcon}
                                eventHandlers={{ click: () => setSelectedMarker(m) }}
                            >
                                <Popup>
                                    <div className="p-1 min-w-[180px]">
                                        <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                                        {m.type === 'post' && (
                                            <>
                                                {m.address && <p className="text-xs text-slate-600 mt-1">{m.address}</p>}
                                                <p className="text-xs mt-1">
                                                    Estado: <span className={`font-bold ${m.status === 'SOS' ? 'text-red-500' :
                                                        m.status === 'ACTIVE' ? 'text-blue-600' : 'text-slate-400'
                                                        }`}>{m.status === 'SOS' ? '🚨 ALERTA' : m.status === 'ACTIVE' ? '🟢 Activo' : '⚪ Inactivo'}</span>
                                                </p>
                                                {m.guard && <p className="text-xs mt-1">Guardia: <strong>{m.guard}</strong></p>}
                                            </>
                                        )}
                                        {m.type === 'checkpoint' && (
                                            <p className="text-xs text-slate-600 mt-1">Checkpoint — {m.postName}</p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{m.lat.toFixed(5)}, {m.lng.toFixed(5)}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* SOS live overlay */}
                    {activeSosCount > 0 && (
                        <div className="absolute top-4 right-4 bg-red-500/10 backdrop-blur border border-red-500/50 p-4 rounded-xl w-72 animate-in slide-in-from-right z-20">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                                    <ShieldAlert size={20} className="text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">🚨 ALERTA SOS ACTIVA</h4>
                                    <p className="text-red-400 text-xs">{activeSosCount} incidente(s) abierto(s)</p>
                                </div>
                            </div>
                            {incidents.filter(i => i.type === 'SOS' && i.status === 'OPEN').slice(0, 2).map(sos => (
                                <div key={sos.id} className="bg-red-500/10 rounded p-2 mt-2 text-xs">
                                    <p className="text-red-300 font-medium">{sos.description}</p>
                                    <p className="text-red-400/60 mt-1">{sos.guards?.first_name} {sos.guards?.last_name} — {sos.location}</p>
                                    <button onClick={() => handleResolveIncident(sos.id)}
                                        className="mt-2 w-full text-center py-1 bg-red-500/20 text-red-400 rounded text-[11px] font-bold hover:bg-red-500/30 transition-colors">
                                        ✔ Marcar Resuelto
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="glassmorphism rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-700/50">
                        {([
                            { key: 'bitacora', label: 'Bitácora', icon: <Radio size={13} /> },
                            { key: 'rondas', label: 'Rondas', icon: <Route size={13} /> },
                            { key: 'asignaciones', label: 'Puestos', icon: <Users size={13} /> },
                        ] as { key: TabPanel; label: string; icon: ReactNode }[]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {/* ── BITACORA ── */}
                        {activeTab === 'bitacora' && (
                            <>
                                {isLoading && incidents.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" />Cargando...</div>
                                ) : incidents.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">Sin incidencias registradas.</div>
                                ) : (
                                    incidents.map(inc => {
                                        const it = INCIDENT_TYPES[inc.type] || { label: inc.type, emoji: '📋', cls: 'bg-slate-700 text-slate-300' };
                                        return (
                                            <div key={inc.id}
                                                className={`p-3 rounded-xl border ${inc.type === 'SOS' && inc.status === 'OPEN' ? 'bg-red-500/10 border-red-500/30' :
                                                    inc.type === 'ANOMALY' ? 'bg-orange-500/5 border-orange-500/20' :
                                                        'bg-slate-800/30 border-slate-700/50'}`}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${it.cls}`}>{it.emoji} {it.label}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                        <Clock size={10} /> {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-white text-xs leading-tight mb-1">{inc.description}</p>
                                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                                    <p>👤 {inc.guards?.first_name} {inc.guards?.last_name}</p>
                                                    <p>📍 {inc.location}</p>
                                                </div>
                                                {inc.type === 'SOS' && inc.status === 'OPEN' && (
                                                    <button onClick={() => handleResolveIncident(inc.id)}
                                                        className="mt-2 w-full text-center py-1 bg-red-500/20 text-red-400 rounded text-[10px] font-bold hover:bg-red-500/30 transition-colors">
                                                        ✔ Marcar Resuelto
                                                    </button>
                                                )}
                                                {inc.type === 'SOS' && inc.status === 'RESOLVED' && (
                                                    <p className="mt-1 text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle size={10} /> Resuelto</p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* ── RONDAS ── */}
                        {activeTab === 'rondas' && (
                            <>
                                <button onClick={() => setIsRoundModalOpen(true)}
                                    className="w-full bg-primary/10 text-primary border border-primary/20 rounded-lg py-2 text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Nueva Ronda
                                </button>
                                {rounds.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">Sin rondas programadas.</div>
                                ) : (
                                    rounds.slice(0, 20).map(r => {
                                        const st = ROUND_STATUS[r.status] || ROUND_STATUS.SCHEDULED;
                                        return (
                                            <div key={r.id} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${st.cls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-xs space-y-0.5">
                                                    <p className="text-white font-medium">👤 {r.guards?.first_name} {r.guards?.last_name}</p>
                                                    {r.posts && <p className="text-slate-400">📍 {r.posts.name}</p>}
                                                    {r.scheduled_time && (
                                                        <p className="text-slate-500">⏰ {new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {r.status === 'SCHEDULED' && (
                                                        <button onClick={() => handleStartRound(r.id)}
                                                            className="flex-1 bg-primary/20 text-primary py-1 rounded text-[10px] font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-1">
                                                            <Play size={10} /> Iniciar
                                                        </button>
                                                    )}
                                                    {r.status === 'IN_PROGRESS' && (
                                                        <button onClick={() => handleCompleteRound(r.id)}
                                                            className="flex-1 bg-emerald-500/20 text-emerald-400 py-1 rounded text-[10px] font-bold hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1">
                                                            <CheckCircle size={10} /> Completar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* ── ASIGNACIONES / PUESTOS ── */}
                        {activeTab === 'asignaciones' && (
                            <>
                                <button onClick={() => setIsCheckpointModalOpen(true)}
                                    className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg py-2 text-xs font-medium hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Nuevo Checkpoint
                                </button>
                                {posts.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">Sin puestos registrados.</div>
                                ) : (
                                    posts.map(p => {
                                        const pCheckpoints = checkpoints.filter(c => c.post_id === p.id);
                                        const activeRound = rounds.find(r => r.post_id === p.id && r.status === 'IN_PROGRESS');
                                        return (
                                            <div key={p.id} className={`rounded-xl p-3 border space-y-2 ${activeRound ? 'bg-primary/5 border-primary/30' : 'bg-slate-800/30 border-slate-700/50'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                                                            <MapPin size={12} className={activeRound ? 'text-primary' : 'text-slate-500'} /> {p.name}
                                                        </h4>
                                                        {p.address && <p className="text-slate-500 text-[10px] mt-0.5 ml-5">{p.address}</p>}
                                                    </div>
                                                    {activeRound && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold animate-pulse">EN RONDA</span>
                                                    )}
                                                </div>
                                                {activeRound && (
                                                    <p className="text-primary text-[11px] ml-5">👤 {activeRound.guards?.first_name} {activeRound.guards?.last_name}</p>
                                                )}
                                                {pCheckpoints.length > 0 && (
                                                    <div className="ml-5 space-y-1">
                                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Checkpoints ({pCheckpoints.length})</p>
                                                        {pCheckpoints.map((cp, i) => (
                                                            <div key={cp.id} className="flex items-center gap-2 text-[11px]">
                                                                <span className="w-4 h-4 rounded-full bg-orange-400/20 text-orange-400 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                                                                <span className="text-slate-300">{cp.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {p.lat && p.lng && (
                                                    <p className="text-[9px] text-slate-600 font-mono ml-5">{parseFloat(p.lat).toFixed(5)}, {parseFloat(p.lng).toFixed(5)}</p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ MODALS ══ */}

            {/* Incident Modal */}
            {isIncidentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <Radio className="text-red-400" /> Reportar Novedad
                            </h3>
                            <button onClick={() => setIsIncidentModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleReportIncident} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Guardia Reportante *</label>
                                <select required value={selectedGuardId} onChange={e => setSelectedGuardId(e.target.value)} className={inputClass}>
                                    <option value="" disabled>-- Seleccione el Guardia --</option>
                                    {guards.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Tipo de Evento *</label>
                                <select required value={incidentType} onChange={e => setIncidentType(e.target.value)} className={inputClass}>
                                    <option value="ANOMALY">⚠️ Anomalía / Novedad Menor</option>
                                    <option value="ROUND">🔄 Ronda de Control Manual</option>
                                    <option value="SOS">🚨 EMERGENCIA - Alerta SOS</option>
                                    <option value="ACCIDENT">💥 Accidente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Ubicación *</label>
                                <input required type="text" value={incidentLocation} onChange={e => setIncidentLocation(e.target.value)}
                                    className={inputClass} placeholder="Ej. Sector Norte - Entrada Principal" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Descripción del Evento *</label>
                                <textarea required value={incidentDescription} onChange={e => setIncidentDescription(e.target.value)}
                                    className={`${inputClass} h-24 resize-none`} placeholder="Detalles sobre la novedad..." />
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !selectedGuardId}
                                    className={`px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 ${incidentType === 'SOS' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}>
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Emitir Reporte'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Round Modal */}
            {isRoundModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <Route className="text-primary" /> Programar Ronda
                            </h3>
                            <button onClick={() => setIsRoundModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateRound} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Guardia Asignado *</label>
                                <select required value={roundGuardId} onChange={e => setRoundGuardId(e.target.value)} className={inputClass}>
                                    <option value="" disabled>-- Seleccione el Guardia --</option>
                                    {guards.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Puesto / Zona</label>
                                <select value={roundPostId} onChange={e => setRoundPostId(e.target.value)} className={inputClass}>
                                    <option value="">-- Sin puesto específico --</option>
                                    {posts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Hora Programada</label>
                                <input type="datetime-local" value={roundScheduledTime} onChange={e => setRoundScheduledTime(e.target.value)} className={inputClass} />
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsRoundModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !roundGuardId}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Route size={16} /> Programar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Checkpoint Modal */}
            {isCheckpointModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                                <Navigation className="text-orange-400" /> Nuevo Checkpoint
                            </h3>
                            <button onClick={() => setIsCheckpointModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateCheckpoint} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Nombre del Checkpoint *</label>
                                <input required type="text" value={cpName} onChange={e => setCpName(e.target.value)}
                                    className={inputClass} placeholder="Ej. Puerta Norte, Estacionamiento B..." />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Puesto Asociado *</label>
                                <select required value={cpPostId} onChange={e => setCpPostId(e.target.value)} className={inputClass}>
                                    <option value="" disabled>-- Seleccione el Puesto --</option>
                                    {posts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Latitud *</label>
                                    <input required type="number" step="any" value={cpLat} onChange={e => setCpLat(e.target.value)}
                                        className={inputClass} placeholder="-25.2637" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Longitud *</label>
                                    <input required type="number" step="any" value={cpLng} onChange={e => setCpLng(e.target.value)}
                                        className={inputClass} placeholder="-57.5759" />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500">💡 Tip: Podés obtener las coordenadas haciendo clic derecho en Google Maps → "¿Qué hay aquí?"</p>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCheckpointModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !cpPostId}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Navigation size={16} /> Crear</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperacionesCampo;
