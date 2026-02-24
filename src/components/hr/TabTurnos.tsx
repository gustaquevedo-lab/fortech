import { type FC, useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [, setShifts] = useState<Shift[]>([]);
    const [, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Get start and end of current week for filtering (simplified to just basic fetch for now)

            const [empRes, shiftsRes, postsRes] = await Promise.all([
                supabase.from('guards').select('id, first_name, last_name, employee_type').eq('status', 'ACTIVE'),
                supabase.from('shifts').select('*').order('date', { ascending: true }),
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

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-white font-grotesk flex items-center gap-2">
                        <CalendarIcon className="text-primary" size={20} /> Planificación Semanal
                    </h3>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                        <button onClick={prevWeek} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm text-slate-300 font-medium px-2">Semana Actual</span>
                        <button onClick={nextWeek} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] text-sm font-medium">
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
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 border-b border-slate-800">
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Empleado</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Lunes</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Martes</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Miércoles</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Jueves</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Viernes</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Sábado</th>
                                    <th className="p-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Domingo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-white text-sm">{emp.first_name} {emp.last_name}</div>
                                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{emp.employee_type || 'GUARDIA'}</div>
                                        </td>
                                        {/* Mocking placeholders for days */}
                                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                            <td key={day} className="p-2 border-l border-slate-800/30">
                                                <div className="h-16 w-full rounded-lg border border-dashed border-slate-700 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-center text-slate-600">
                                                    <Plus size={14} />
                                                </div>
                                            </td>
                                        ))}
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
        </div>
    );
};

export default TabTurnos;
