import { type FC, useState, useRef } from 'react';
import { X, Upload, User as UserIcon, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
    onClose: () => void;
}

const ProfileModal: FC<ProfileModalProps> = ({ onClose }) => {
    const { user, avatarUrl, refreshAvatar } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            setError('Por favor selecciona un archivo de imagen válido.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError('La imagen no debe pesar más de 2MB.');
            return;
        }

        setError(null);
        setIsUploading(true);
        setSuccess(false);

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`; // In the 'avatars' bucket

            // 1. Upload the image
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // 2. Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update the user_roles table with the new avatar_url
            const { error: dbError } = await supabase
                .from('user_roles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // 4. Refresh the context to show the new avatar
            await refreshAvatar();
            setSuccess(true);

            // Optional: Close modal after a delay
            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (err: any) {
            console.error('Error uploading avatar:', err);
            setError(err.message || 'Error al subir la imagen.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserIcon size={20} className="text-primary" />
                        Perfil de Usuario
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center justify-center relative">
                    {/* Avatar Display */}
                    <div className="relative group mb-6">
                        <div className="w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-800 flex items-center justify-center overflow-hidden shadow-xl">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar actual" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={64} className="text-slate-500" />
                            )}
                        </div>

                        {/* Hover Overlay for Upload */}
                        <label
                            className={`absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUploading ? 'pointer-events-none' : ''}`}
                        >
                            {isUploading ? (
                                <Loader2 className="animate-spin text-white mb-1" size={24} />
                            ) : (
                                <>
                                    <Upload className="text-white mb-1" size={24} />
                                    <span className="text-white text-xs font-medium">Subir foto</span>
                                </>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg, image/png, image/webp"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                disabled={isUploading}
                            />
                        </label>
                    </div>

                    <div className="text-center w-full">
                        <p className="text-white font-medium mb-1 truncate px-4">{user?.email}</p>
                        <p className="text-sm text-slate-400 mb-4">Haz clic en la imagen para cambiarla (Max 2MB)</p>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center mb-4 leading-tight">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center mb-4 flex items-center justify-center gap-2">
                                <Check size={16} /> ¡Foto actualizada!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
