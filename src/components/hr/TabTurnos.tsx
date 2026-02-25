import { type FC, useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Users, Loader2, ChevronLeft, ChevronRight, X, Trash2, Edit2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_type: string;
}

interface Shift {
    id: string;
    guard_id: string;
    post_id: string | null;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
}

interface Post {
    id: string;
    name: string;
}

const TabTurnos: FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const [form, setForm] = useState({
        guard_id: '',
        post_id: '',
        date: '',
        start_time: '06:00',
        end_time: '18:00',
        status: 'SCHEDULED'
    });

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getWeekDays = (date: Date) => {
        const today = new Date(date);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(today.setDate(diff));

        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    };

    const weekDays = getWeekDays(currentDate);

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const startOfWeek = formatDate(weekDays[0]);
            const endOfWeek = formatDate(weekDays[6]);

            const [empRes, shiftsRes, postsRes] = await Promise.all([
                supabase.from('guards').select('id, first_name, last_name, employee_type').eq('status', 'ACTIVE'),
                supabase.from('shifts').select('*').gte('date', startOfWeek).lte('date', endOfWeek),
                supabase.from('posts').select('id, name')
            ]);

            if (empRes.data) setEmployees(empRes.data);
            if (shiftsRes.data) setShifts(shiftsRes.data);
            if (postsRes.data) setPosts(postsRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextWeek = () => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 7);
        setCurrentDate(next);
    };

    const prevWeek = () => {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 7);
        setCurrentDate(prev);
    };

    const openCreateModal = (guardId?: string, date?: string) => {
        setEditingShift(null);
        setForm({
            guard_id: guardId || '',
            post_id: '',
            date: date || formatDate(new Date()),
            start_time: '06:00',
            end_time: '18:00',
            status: 'SCHEDULED'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (shift: Shift) => {
        setEditingShift(shift);
        setForm({
            guard_id: shift.guard_id,
            post_id: shift.post_id || '',
            date: shift.date,
            start_time: shift.start_time.substring(0, 5),
            end_time: shift.end_time.substring(0, 5),
            status: shift.status || 'SCHEDULED'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingShift) {
                const { error, count } = await supabase.from('shifts').update({
                    guard_id: form.guard_id,
                    post_id: form.post_id || null,
                    date: form.date,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    status: form.status
                }).eq('id', editingShift.id).select();

                if (error) throw error;
                if (!count || count.length === 0) {
                    alert("No se pudo actualizar. Falta RLS policy UPDATE para 'shifts'.");
                }
            } else {
                const { error, count } = await supabase.from('shifts').insert({
                    guard_id: form.guard_id,
                    post_id: form.post_id || null,
                    date: form.date,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    status: form.status
                }).select();

                if (error) throw error;
                if (!count || count.length === 0) {
                    alert("No se pudo insertar. Falta RLS policy INSERT para 'shifts'.");
                }
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Error saving shift", error);
            alert("Error al guardar el turno: " + (error.message || JSON.stringify(error)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingShift) return;
        if (!confirm('¿Eliminar este turno permanentemente?')) return;
        setIsSubmitting(true);
        try {
            const { error, count } = await supabase.from('shifts').delete({ count: 'exact' }).eq('id', editingShift.id);
            if (error) throw error;
            if (count === 0) {
                alert('No se pudo eliminar el turno. Faltan permisos (RLS DELETE).');
            } else {
                setIsModalOpen(false);
                fetchData();
            }
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getShiftStatusColor = (status: string) => {
        switch (status) {
            case 'ATTENDED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            case 'MISSED': return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'SCHEDULED':
            default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        }
    };

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-white font-grotesk flex items-center gap-2">
                        <CalendarIcon className="text-primary" size={20} /> Planificación Semanal
                    </h3>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                        <button onClick={prevWeek} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm text-slate-300 font-medium px-2">
                            {formatDate(weekDays[0])} al {formatDate(weekDays[6])}
                        </span>
                        <button onClick={nextWeek} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <button onClick={() => openCreateModal()} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] text-sm font-medium">
                    <Plus size={16} /> Asignar Turno
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : (
                <div className="glassmorphism p-0 rounded-2xl overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-900/80 border-b border-slate-800">
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-900 z-10 w-48">Empleado</th>
                                    {weekDays.map((day, idx) => (
                                        <th key={idx} className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center min-w-[120px]">
                                            <div className="flex flex-col items-center">
                                                <span>{dayNames[idx]}</span>
                                                <span className="text-[10px] text-slate-500 mt-0.5">{day.getDate()}/{day.getMonth() + 1}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10 border-r border-slate-800/50">
                                            <div className="font-medium text-white text-sm truncate">{emp.first_name} {emp.last_name}</div>
                                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{emp.employee_type || 'GUARDIA'}</div>
                                        </td>
                                        {weekDays.map((day) => {
                                            const dateStr = formatDate(day);
                                            const dayShifts = shifts.filter(s => s.guard_id === emp.id && s.date === dateStr);

                                            return (
                                                <td key={dateStr} className="p-2 border-l border-slate-800/30 align-top">
                                                    <div className="flex flex-col gap-2 relative min-h-[4rem]">
                                                        {dayShifts.length > 0 ? (
                                                            <>
                                                                {dayShifts.map(shift => {
                                                                    const postName = posts.find(p => p.id === shift.post_id)?.name || 'Sin puesto';
                                                                    return (
                                                                        <div
                                                                            key={shift.id}
                                                                            onClick={() => openEditModal(shift)}
                                                                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all hover:scale-[1.02] ${getShiftStatusColor(shift.status)}`}
                                                                        >
                                                                            <div className="font-bold mb-1 flex justify-between items-center">
                                                                                <span>{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</span>
                                                                            </div>
                                                                            <div className="text-[10px] opacity-80 flex items-center gap-1 truncate">
                                                                                <MapPin size={10} className="shrink-0" />
                                                                                <span className="truncate">{postName}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <button onClick={() => openCreateModal(emp.id, dateStr)} className="h-6 w-full rounded border border-dashed border-slate-700/50 hover:border-primary/50 text-slate-500 hover:text-primary flex items-center justify-center transition-colors">
                                                                    <Plus size={12} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div onClick={() => openCreateModal(emp.id, dateStr)} className="absolute inset-0 rounded-lg border border-dashed border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-center text-slate-600/0 hover:text-primary/50 group">
                                                                <Plus size={16} className="transform scale-50 group-hover:scale-100 transition-transform" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {employees.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Users size={32} className="mx-auto mb-3 opacity-30" />
                            <p>No hay personal registrado.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Turno */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white font-grotesk">{editingShift ? 'Editar Turno' : 'Asignar Nuevo Turno'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Empleado *</label>
                                <select required value={form.guard_id} onChange={e => setForm({ ...form, guard_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="" disabled>Seleccione un empleado</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Puesto / Cliente</label>
                                <select value={form.post_id} onChange={e => setForm({ ...form, post_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                    <option value="">Sin Puesto Asignado (General)</option>
                                    {posts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Hora Inicio *</label>
                                    <input required type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Hora Fin *</label>
                                    <input required type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
                                </div>
                            </div>
                            {editingShift && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Estado del Turno</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                        <option value="SCHEDULED">Programado (Pendiente)</option>
                                        <option value="ATTENDED">Asistió</option>
                                        <option value="MISSED">Ausente</option>
                                    </select>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                                {editingShift ? (
                                    <button type="button" onClick={handleDelete} disabled={isSubmitting} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                ) : (
                                    <div />
                                )}
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabTurnos;
