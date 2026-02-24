import { type FC, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

const ChangePassword: FC = () => {
    const { session, signOut } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (newPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Update auth password
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // Update user_roles table to toggle requires_password_change flag
            if (session?.user?.id) {
                const { error: dbError } = await supabase
                    .from('user_roles')
                    .update({ requires_password_change: false })
                    .eq('id', session.user.id);

                if (dbError) throw dbError;
            }

            setSuccess(true);

            // Redirect after a moment
            setTimeout(() => {
                // Easiest is to force a reload entirely so AuthContext fetches fresh data.
                window.location.href = '/';
            }, 2000);

        } catch (error: any) {
            console.error("Change Password error:", error);
            setErrorMsg(error.message || 'Error inesperado al intentar cambiar la contraseña.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
                <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                    <CheckCircle2 size={64} className="mx-auto text-emerald-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña Actualizada!</h2>
                        <p className="text-slate-400">Tu cuenta ahora está segura. Redirigiendo al sistema...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 mix-blend-screen pointer-events-none" />

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 space-y-8 relative z-10 shadow-2xl">
                <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                        <ShieldAlert size={32} className="text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold font-grotesk text-white tracking-tight">Cambio de Contraseña Requerido</h2>
                    <p className="text-slate-400 mt-2 text-sm">
                        Por motivos de seguridad, debes actualizar la contraseña temporal generada por el administrador antes de acceder al sistema.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm text-center">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            placeholder="Repite tu nueva contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Guardar y Continuar'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                        Cancelar y cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
