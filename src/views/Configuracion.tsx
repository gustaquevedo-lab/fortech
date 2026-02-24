import { type FC, useState, useEffect, useRef } from 'react';
import { Settings, Save, Upload, Building, Image as ImageIcon, Loader2, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const DEPARTAMENTOS_PY = [
    'Asunción (Capital)', 'Concepción', 'San Pedro', 'Cordillera', 'Guairá',
    'Caaguazú', 'Caazapá', 'Itapúa', 'Misiones', 'Paraguarí', 'Alto Paraná',
    'Central', 'Ñeembucú', 'Amambay', 'Canindeyú', 'Presidente Hayes',
    'Alto Paraguay', 'Boquerón'
];

export const Configuracion: FC = () => {
    const { role } = useAuth();
    const canEdit = role === 'ADMIN' || role === 'FINANCE';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        department: '',
        country: 'Paraguay',
        phone1: '',
        phone2: '',
        email: '',
        logo_url: '',
        ruc: '',
        timbrado_number: '',
        timbrado_start_date: '',
        timbrado_end_date: '',
        establecimiento: '001',
        punto_expedicion: '001',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('company_settings')
            .select('*')
            .eq('singleton_id', 1)
            .single();

        if (data) {
            setFormData({
                name: data.name || '',
                address: data.address || '',
                city: data.city || '',
                department: data.department || '',
                country: data.country || 'Paraguay',
                phone1: data.phone1 || '',
                phone2: data.phone2 || '',
                email: data.email || '',
                logo_url: data.logo_url || '',
                ruc: data.ruc || '',
                timbrado_number: data.timbrado_number || '',
                timbrado_start_date: data.timbrado_start_date || '',
                timbrado_end_date: data.timbrado_end_date || '',
                establecimiento: data.establecimiento || '001',
                punto_expedicion: data.punto_expedicion || '001',
            });
        }
        setIsLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;

        setIsSaving(true);
        const { error } = await supabase
            .from('company_settings')
            .update({
                name: formData.name,
                address: formData.address,
                city: formData.city,
                department: formData.department,
                country: formData.country,
                phone1: formData.phone1,
                phone2: formData.phone2,
                email: formData.email,
                logo_url: formData.logo_url,
                ruc: formData.ruc || null,
                timbrado_number: formData.timbrado_number || null,
                timbrado_start_date: formData.timbrado_start_date || null,
                timbrado_end_date: formData.timbrado_end_date || null,
                establecimiento: formData.establecimiento || '001',
                punto_expedicion: formData.punto_expedicion || '001',
            })
            .eq('singleton_id', 1);

        if (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar la configuración.');
        } else {
            alert('Configuración guardada exitosamente.');
        }
        setIsSaving(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !canEdit) return;

        setIsUploadingLogo(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('company_logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('company_logos')
                .getPublicUrl(filePath);

            // Update form data (Note: it's not saved to DB until they click Save)
            setFormData(prev => ({ ...prev, logo_url: publicUrl }));

        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error al subir el logo. Asegúrate de que el bucket exista y tengas permisos.');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white font-grotesk flex items-center gap-2">
                        <Settings className="text-primary" /> Configuración de la Empresa
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Información global utilizada para membretes, reportes, liquidaciones y recibos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Logo Section */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glassmorphism p-6 rounded-2xl border border-slate-700/50">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ImageIcon className="text-slate-400" size={20} /> Logotipo Institucional
                        </h3>

                        <div className="flex flex-col items-center gap-4">
                            <div className="w-48 h-48 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Company Logo" className="max-w-full max-h-full object-contain p-2" />
                                ) : (
                                    <Building size={48} className="text-slate-600" />
                                )}
                            </div>

                            <div className="w-full text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleLogoUpload}
                                    disabled={!canEdit || isUploadingLogo}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!canEdit || isUploadingLogo}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {formData.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                                </button>
                                <p className="text-xs text-slate-500 mt-2">Recomendado: Archivo PNG transparente, máx 2MB.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* General Info Section */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSave} className="glassmorphism p-6 rounded-2xl border border-slate-700/50 space-y-6">
                        <h3 className="text-lg font-bold text-white border-b border-slate-700/50 pb-4">
                            Datos Generales
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-1">Razón Social / Nombre Comercial *</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-1">Dirección Oficial</label>
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Ciudad</label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Departamento</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50 appearance-none"
                                >
                                    <option value="">Selecciona un departamento...</option>
                                    {DEPARTAMENTOS_PY.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">País</label>
                                <input
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            {/* Empty space filler for layout */}
                            <div className="hidden md:block"></div>

                            <h3 className="md:col-span-2 text-lg font-bold text-white border-b border-slate-700/50 pb-2 mt-2">
                                Contacto
                            </h3>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Teléfono Principal</label>
                                <input
                                    name="phone1"
                                    value={formData.phone1}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Teléfono Secundario</label>
                                <input
                                    name="phone2"
                                    value={formData.phone2}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-1">Correo Institucional (Email)</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                />
                            </div>

                            {/* Datos Tributarios */}
                            <h3 className="md:col-span-2 text-lg font-bold text-white border-b border-slate-700/50 pb-2 mt-2 flex items-center gap-2">
                                <Landmark size={18} className="text-primary" /> Datos Tributarios (e-Kuatia / SIFEN)
                            </h3>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">RUC de la Empresa *</label>
                                <input name="ruc" value={formData.ruc} onChange={handleChange} disabled={!canEdit} placeholder="Ej. 80099999-1"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nro. Timbrado</label>
                                <input name="timbrado_number" value={formData.timbrado_number} onChange={handleChange} disabled={!canEdit} placeholder="Ej. 17123456"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Vigencia Timbrado (Desde)</label>
                                <input type="date" name="timbrado_start_date" value={formData.timbrado_start_date} onChange={handleChange} disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50 [color-scheme:dark]" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Vigencia Timbrado (Hasta)</label>
                                <input type="date" name="timbrado_end_date" value={formData.timbrado_end_date} onChange={handleChange} disabled={!canEdit}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50 [color-scheme:dark]" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Establecimiento</label>
                                <input name="establecimiento" value={formData.establecimiento} onChange={handleChange} disabled={!canEdit} placeholder="001"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50" />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Punto de Expedición</label>
                                <input name="punto_expedicion" value={formData.punto_expedicion} onChange={handleChange} disabled={!canEdit} placeholder="001"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50" />
                            </div>
                        </div>

                        {canEdit && (
                            <div className="flex justify-end pt-6 border-t border-slate-700/50">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-[0_0_15px_rgba(19,91,236,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Guardar Configuración
                                </button>
                            </div>
                        )}
                    </form>
                </div>

            </div>
        </div>
    );
};
