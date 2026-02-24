import { type FC, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Users, Shield, Building, Edit2, AlertCircle, Save, X, UserPlus } from 'lucide-react';
import { type UserRole } from '../context/AuthContext';

interface UserData {
    id: string;
    email: string;
    role: UserRole;
    client_id: string | null;
}

const ModuloUsuarios: FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<UserRole>('GUARD');
    const [editClientId, setEditClientId] = useState<string | null>('');

    // Create User State
    const [isCreating, setIsCreating] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('GUARD');
    const [newClientId, setNewClientId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // First fetch the clients to populate the dropdown
            const { data: clientsRes } = await supabase.from('clients').select('id, name');
            if (clientsRes) {
                setClients(clientsRes);
            }

            // Call the secure RPC that joins auth.users and user_roles 
            // This is ONLY allowed if the caller is an ADMIN
            const { data: usersRes, error } = await supabase.rpc('get_all_users_admin');

            if (error) {
                console.error("Error fetching users via RPC:", error);
                // We'll proceed with empty array if error
            }

            if (usersRes) {
                setUsers(usersRes);
            }
        } catch (error) {
            console.error("Error fetching users data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user: UserData) => {
        setEditingUserId(user.id);
        setEditRole(user.role || 'GUARD');
        setEditClientId(user.client_id || '');
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleSaveRole = async (userId: string) => {
        try {
            // Using the test RPC or a dedicated one to update another user's role
            // Since set_test_user_role uses auth.uid(), we need a new RPC OR
            // We can just upsert directly into user_roles if ADMIN has RLS permissions to update other rows.

            // Let's assume ADMIN can update public.user_roles via RLS or we'll add an RLS policy for it.
            const targetClientId = editRole === 'CLIENT' && editClientId ? editClientId : null;

            const { error } = await supabase
                .from('user_roles')
                .upsert({
                    id: userId,
                    role: editRole,
                    client_id: targetClientId
                });

            if (error) {
                console.error("Error updating user role:", error);
                alert("Error actualizando rol: " + error.message);
                return;
            }

            // Refresh UI
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, role: editRole, client_id: targetClientId }
                    : u
            ));

            setEditingUserId(null);
        } catch (err) {
            console.error("Upsert exception:", err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setIsSubmitting(true);

        try {
            const targetClientId = newRole === 'CLIENT' && newClientId ? newClientId : null;

            // Invoke our secure Edge Function
            const { data, error } = await supabase.functions.invoke('create_user', {
                body: {
                    email: newEmail,
                    password: newPassword,
                    role: newRole,
                    client_id: targetClientId
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            // Refetch table
            await fetchData();

            // Close modal
            setIsCreating(false);
            setNewEmail('');
            setNewPassword('');
            setNewRole('GUARD');
            setNewClientId('');
        } catch (err: any) {
            console.error("Create user error:", err);
            setCreateError(err.message || 'Error al crear usuario.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'FINANCE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'OPERATIONS': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'CLIENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'; // GUARD/Null
        }
    };

    const getClientName = (clientId: string | null) => {
        if (!clientId) return 'N/A';
        const client = clients.find(c => c.id === clientId);
        return client ? client.name : 'Unknown';
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-slate-400 mt-1">Administración de cuentas, roles (RBAC) y accesos de clientes</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                    <UserPlus size={18} />
                    Nuevo Usuario
                </button>
            </header>

            <div className="glassmorphism rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50">
                                <th className="p-4 text-slate-400 font-medium text-sm w-1/4">Usuario (Email)</th>
                                <th className="p-4 text-slate-400 font-medium text-sm w-1/5">Rol de Sistema</th>
                                <th className="p-4 text-slate-400 font-medium text-sm w-1/4">Asignación Cliente</th>
                                <th className="p-4 text-slate-400 font-medium text-sm text-center w-1/6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                                        No se pudieron cargar los usuarios. Verifica si se ejecutó el RPC en Supabase.
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => {
                                    const isEditing = editingUserId === user.id;

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                                                        <Users size={16} />
                                                    </div>
                                                    <span className="text-slate-200 font-medium">{user.email}</span>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                {isEditing ? (
                                                    <select
                                                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                                                        value={editRole || ''}
                                                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                                                    >
                                                        <option value="ADMIN">ADMIN</option>
                                                        <option value="FINANCE">FINANZA</option>
                                                        <option value="OPERATIONS">OPERACIONES</option>
                                                        <option value="CLIENT">CLIENTE</option>
                                                        <option value="GUARD">GUARDIA</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role || 'GUARD')}`}>
                                                        <Shield size={10} className="mr-1.5" />
                                                        {user.role || 'GUARD'}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                {isEditing && editRole === 'CLIENT' ? (
                                                    <select
                                                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary w-full"
                                                        value={editClientId || ''}
                                                        onChange={(e) => setEditClientId(e.target.value)}
                                                    >
                                                        <option value="">-- Seleccionar Cliente --</option>
                                                        {clients.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        {(user.role === 'CLIENT' || (isEditing && editRole !== 'CLIENT')) && (
                                                            <>
                                                                <Building size={14} className="text-slate-500" />
                                                                <span className="text-sm">{getClientName(user.client_id)}</span>
                                                            </>
                                                        )}
                                                        {user.role !== 'CLIENT' && !isEditing && (
                                                            <span className="text-slate-600 text-sm italic">Interno Fortech</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleSaveRole(user.id)}
                                                            className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-400/10 rounded"
                                                            title="Guardar"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 rounded"
                                                            title="Cancelar"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="text-slate-400 hover:text-primary transition-colors p-1"
                                                        title="Editar Rol"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg flex items-start gap-3 mt-6">
                <Shield className="shrink-0 mt-0.5" size={18} />
                <div className="text-sm">
                    <p className="font-bold mb-1">Centro de Seguridad (ADMIN)</p>
                    <p>Cualquier cambio de rol tomará efecto automáticamente en la próxima solicitud del usuario. Si asignas un rol de CLIENTE, recuerda seleccionar obligatoriamente a qué empresa está asignado para aislar sus datos en el Portal de CRM.</p>
                </div>
            </div>

            {/* Modal for Creating User */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Crear Nuevo Usuario</h3>
                            <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-slate-300">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {createError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-sm mb-4">
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña Temporal</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Rol</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                                    value={newRole || ''}
                                    onChange={e => setNewRole(e.target.value as UserRole)}
                                >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="FINANCE">FINANZA</option>
                                    <option value="OPERATIONS">OPERACIONES</option>
                                    <option value="CLIENT">CLIENTE</option>
                                    <option value="GUARD">GUARDIA</option>
                                </select>
                            </div>

                            {newRole === 'CLIENT' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Empresa Cliente (Obligatorio)</label>
                                    <select
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                                        value={newClientId || ''}
                                        onChange={e => setNewClientId(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors text-sm flex items-center justify-center min-w-[100px]"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuloUsuarios;
