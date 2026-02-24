import { type FC, useState, useEffect } from 'react';
import { AlertOctagon, Plus, CheckCircle2, ShieldAlert, FileWarning, Search, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeRecord {
    id: string;
    guard_id: string;
    record_type: 'WARNING' | 'MERIT' | 'INCIDENT';
    description: string;
    date: string;
    created_at: string;
    guards: {
        first_name: string;
        last_name: string;
        employee_type: string;
    };
}

const TabDisciplina: FC = () => {
    const [records, setRecords] = useState<EmployeeRecord[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [recordType, setRecordType] = useState<'WARNING' | 'MERIT' | 'INCIDENT'>('WARNING');
    const [description, setDescription] = useState('');
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);

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

            // Fetch Records
            const { data: recordsData, error } = await supabase
                .from('employee_records')
                .select(`
                    *,
                    guards (first_name, last_name, employee_type)
                `)
                .order('date', { ascending: false });

            if (error) throw error;
            if (recordsData) setRecords(recordsData as unknown as EmployeeRecord[]);

        } catch (error) {
            console.error("Error fetching records data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !description || !incidentDate) return;

        setIsSaving(true);
        try {
            const { error: dbError } = await supabase
                .from('employee_records')
                .insert([{
                    guard_id: selectedEmployee,
                    record_type: recordType,
                    description: description,
                    date: incidentDate
                }]);

            if (dbError) throw dbError;

            setIsModalOpen(false);
            setDescription('');
            setIncidentDate(new Date().toISOString().split('T')[0]);
            fetchData();

            alert("Registro disciplinario/mérito guardado exitosamente.");

        } catch (error: any) {
            console.error("Error creating record:", error);
            alert(error.message || "Error al registrar.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredRecords = records.filter(rec =>
        rec.guards?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.guards?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRecordTypeInfo = (type: string) => {
        switch (type) {
            case 'WARNING':
                return { label: 'Amonestación / Llamado de Atención', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: FileWarning };
            case 'INCIDENT':
                return { label: 'Acta de Infracción / Falta Grave', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertOctagon };
            case 'MERIT':
                return { label: 'Reconocimiento / Mérito', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
            default:
                return { label: 'Registro', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', icon: ShieldAlert };
        }
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                        <AlertOctagon className="text-primary" size={24} /> Desempeño y Disciplina
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Historial de actas de infracción, llamadas de atención y reconocimientos
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en el historial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] text-sm font-medium shrink-0"
                    >
                        <Plus size={16} /> Nuevo Registro
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="glassmorphism p-12 text-center rounded-2xl border border-slate-700/50">
                    <AlertOctagon size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-white mb-2">No hay registros</h3>
                    <p className="text-slate-400 text-sm">El historial disciplinario del personal está limpio o no coincide con la búsqueda.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRecords.map((record) => {
                        const typeInfo = getRecordTypeInfo(record.record_type);
                        const Icon = typeInfo.icon;

                        return (
                            <div key={record.id} className={`glassmorphism rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all p-5 flex flex-col md:flex-row gap-4 md:items-center relative overflow-hidden`}>
                                {/* Decorative line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeInfo.bg.replace('/10', '').replace(' border-', ' bg-').split(' ')[0]}`}></div>

                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50">
                                    <Icon size={20} className={typeInfo.color} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-lg font-bold text-white leading-tight">
                                            {record.guards?.first_name} {record.guards?.last_name}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {new Date(record.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${typeInfo.color}`}>
                                        {typeInfo.label}
                                    </p>
                                    <div className="bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300 italic border border-slate-800">
                                        "{record.description}"
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Nuevo Registro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileWarning className="text-primary" size={20} /> Nuevo Registro
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRecord} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

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

                            {/* Tipo de Registro */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Registro</label>
                                <select
                                    value={recordType}
                                    onChange={(e) => setRecordType(e.target.value as 'WARNING' | 'MERIT' | 'INCIDENT')}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                    required
                                >
                                    <option value="WARNING">Llamado de Atención (Leve)</option>
                                    <option value="INCIDENT">Acta de Infracción (Falta Grave)</option>
                                    <option value="MERIT">Reconocimiento (Buen Desempeño)</option>
                                </select>
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Fecha del Suceso</label>
                                <input
                                    type="date"
                                    value={incidentDate}
                                    onChange={(e) => setIncidentDate(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                    required
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción de los hechos</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalle exactamente lo ocurrido..."
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm h-32 resize-none"
                                    required
                                />
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
                                    {isSaving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Archivar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabDisciplina;
