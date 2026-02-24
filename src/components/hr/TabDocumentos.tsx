import { type FC, useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle2, Clock, ShieldAlert, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeDocument {
    id: string;
    guard_id: string;
    document_type: string;
    document_url: string;
    expiration_date: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
    created_at: string;
    guards: {
        first_name: string;
        last_name: string;
        employee_type: string;
    };
}

const TabDocumentos: FC = () => {
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [docType, setDocType] = useState('ANTECEDENTES_POLICIALES');
    const [expirationDate, setExpirationDate] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

            // Fetch Documents
            const { data: docsData, error } = await supabase
                .from('employee_documents')
                .select(`
                    *,
                    guards (first_name, last_name, employee_type)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (docsData) setDocuments(docsData as unknown as EmployeeDocument[]);

        } catch (error) {
            console.error("Error fetching documents data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !selectedEmployee) return;

        setIsUploading(true);
        try {
            // 1. Upload to Supabase Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${selectedEmployee}_${docType}_${new Date().getTime()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('employee_documents')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('employee_documents')
                .getPublicUrl(filePath);

            let status = 'ACTIVE';
            if (expirationDate && new Date(expirationDate) < new Date()) {
                status = 'EXPIRED';
            }

            // 3. Save Record in Database
            const { error: dbError } = await supabase
                .from('employee_documents')
                .insert([{
                    guard_id: selectedEmployee,
                    document_type: docType,
                    document_url: publicUrlData.publicUrl,
                    expiration_date: expirationDate || null,
                    status: status
                }]);

            if (dbError) throw dbError;

            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setExpirationDate('');
            fetchData();

            // Note: Use a real toast notification system here in production
            alert("Documento subido y registrado exitosamente.");

        } catch (error: any) {
            console.error("Error uploading document:", error);
            alert("Error al subir el documento: " + (error.message || "Error desconocido"));
        } finally {
            setIsUploading(false);
        }
    };

    const checkExpirationStatus = (dateString: string | null) => {
        if (!dateString) return { status: 'none', message: 'Sin vencimiento', color: 'text-slate-500', bg: 'bg-slate-800' };

        const expDate = new Date(dateString);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'expired', message: `Vencido hace ${Math.abs(diffDays)} días`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
        if (diffDays <= 30) return { status: 'warning', message: `Vence en ${diffDays} días`, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
        return { status: 'ok', message: `Vigente (vence en ${diffDays} días)`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    };

    const getDocTypeInfo = (type: string) => {
        const types: Record<string, { label: string, icon: any }> = {
            'ANTECEDENTES_POLICIALES': { label: 'Antecedentes Policiales', icon: ShieldAlert },
            'REGISTRO_CONDUCIR': { label: 'Registro de Conducir', icon: FileText },
            'PSICOTECNICO': { label: 'Test Psicotécnico', icon: FileText },
            'CARNET_PORTACION': { label: 'Carnet Portación', icon: ShieldAlert },
            'IDENTIDAD': { label: 'Cédula de Identidad', icon: FileText },
            'OTRO': { label: 'Otro Documento', icon: FileText }
        };
        return types[type] || types['OTRO'];
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white font-grotesk flex items-center gap-2">
                        <FileText className="text-primary" size={24} /> Documentos y Legal
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Control de vencimientos y repositorio digital del personal
                    </p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(19,91,236,0.3)] text-sm font-medium"
                >
                    <Upload size={16} /> Subir Documento
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : documents.length === 0 ? (
                <div className="glassmorphism p-12 text-center rounded-2xl border border-slate-700/50">
                    <FileText size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-white mb-2">No hay documentos</h3>
                    <p className="text-slate-400 text-sm">Aún no se han digitalizado documentos del personal en el sistema.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => {
                        const expStatus = checkExpirationStatus(doc.expiration_date);
                        const typeInfo = getDocTypeInfo(doc.document_type);
                        const Icon = typeInfo.icon;

                        return (
                            <div key={doc.id} className="glassmorphism rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all overflow-hidden flex flex-col">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50 shadow-inner">
                                            <Icon size={20} className="text-slate-300" />
                                        </div>
                                        {/* Status Badge */}
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${expStatus.bg} ${expStatus.color}`}>
                                            {expStatus.status === 'expired' && <AlertCircle size={10} />}
                                            {expStatus.status === 'warning' && <Clock size={10} />}
                                            {expStatus.status === 'ok' && <CheckCircle2 size={10} />}
                                            {expStatus.message}
                                        </div>
                                    </div>

                                    <h4 className="text-lg font-bold text-white mb-1 truncate" title={typeInfo.label}>
                                        {typeInfo.label}
                                    </h4>

                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                            {doc.guards?.first_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">
                                                {doc.guards?.first_name} {doc.guards?.last_name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                {doc.guards?.employee_type || 'EMPLEADO'}
                                            </p>
                                        </div>
                                    </div>

                                    {doc.expiration_date && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-400">
                                            <Clock size={12} /> Válido hasta: <span className="text-slate-200 font-mono">{doc.expiration_date}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center group">
                                    <a
                                        href={doc.document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:text-primary/80 font-medium px-2 py-1 transition-colors"
                                    >
                                        Ver Documento
                                    </a>
                                    {/* Action buttons could go here (e.g., delete/archive if authorized) */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Upload className="text-primary" size={20} /> Digitalizar Documento
                            </h3>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

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

                            {/* Tipo de Documento */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Documento</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                    required
                                >
                                    <option value="ANTECEDENTES_POLICIALES">Antecedentes Policiales</option>
                                    <option value="REGISTRO_CONDUCIR">Registro de Conducir</option>
                                    <option value="PSICOTECNICO">Test Psicotécnico</option>
                                    <option value="CARNET_PORTACION">Carnet de Portación de Armas</option>
                                    <option value="IDENTIDAD">Cédula de Identidad</option>
                                    <option value="OTRO">Otro Documento</option>
                                </select>
                            </div>

                            {/* Vencimiento */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Vencimiento <span className="text-slate-500">(Opcional)</span></label>
                                <input
                                    type="date"
                                    value={expirationDate}
                                    onChange={(e) => setExpirationDate(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <p className="text-[10px] text-slate-500 mt-1 mt-1">
                                    Importante: Si el documento vence, el sistema alertará 30 días antes.
                                </p>
                            </div>

                            {/* Archivo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Archivo (PDF, JPG, PNG)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading || !selectedFile}
                                    className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                                >
                                    {isUploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo...</> : 'Guardar Documento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabDocumentos;
