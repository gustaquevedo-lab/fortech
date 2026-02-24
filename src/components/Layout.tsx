import { type ReactNode, type FC } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    Building2,
    Users,
    Activity,
    Package,
    FileText,
    ShoppingCart,
    DollarSign,
    LogOut,
    User,
    Settings,
    Edit2
} from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { useState } from 'react';

interface NavItem {
    to: string;
    name: string;
    icon: ReactNode;
    roles: UserRole[];
}

const Layout: FC = () => {
    const { role, user, avatarUrl, signOut, updateRole } = useAuth();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const navItems: NavItem[] = [
        { to: '/mi-portal', name: 'Portal del Empleado', icon: <User size={20} />, roles: ['GUARD', 'ADMIN', 'FINANCE', 'OPERATIONS'] },
        { to: '/', name: 'Panel Financiero', icon: <DollarSign size={20} />, roles: ['ADMIN', 'FINANCE'] },
        { to: '/hr', name: 'HR & Nómina', icon: <Users size={20} />, roles: ['ADMIN', 'OPERATIONS'] },
        { to: '/armeria', name: 'Inventario y Flota', icon: <Package size={20} />, roles: ['ADMIN', 'OPERATIONS'] },
        { to: '/operaciones', name: 'Operaciones de Campo', icon: <Activity size={20} />, roles: ['ADMIN', 'OPERATIONS'] },
        { to: '/crm', name: 'Portal CRM', icon: <Building2 size={20} />, roles: ['ADMIN', 'CLIENT'] },
        { to: '/contratos', name: 'Gestión de Contratos', icon: <FileText size={20} />, roles: ['ADMIN'] },
        { to: '/erp', name: 'ERP & Facturación', icon: <DollarSign size={20} />, roles: ['ADMIN', 'FINANCE'] },
        { to: '/compras', name: 'Compras y Gastos', icon: <ShoppingCart size={20} />, roles: ['ADMIN', 'FINANCE'] },
    ];

    const filteredNavItems = navItems.filter(item => {
        // If the user hasn't loaded or doesn't have a role, show nothing or everything?
        // Safest is to only show if their role matches.
        if (!role) return false;
        return item.roles.includes(role);
    });

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-slate-50">
            {/* Sidebar Navigation */}
            <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <img src="/fortech-logo.png" alt="Fortech Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white font-grotesk">Fortech</h1>
                    </div>

                    <nav className="space-y-2">
                        {filteredNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-primary/20 text-primary font-medium border border-primary/30 shadow-[0_0_15px_rgba(19,91,236,0.15)]'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`
                                }
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="p-6 border-t border-slate-800">
                    {role === 'ADMIN' && (
                        <div className="mb-4">
                            <NavLink
                                to="/usuarios"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${isActive
                                        ? 'bg-primary/20 text-primary font-medium border border-primary/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`
                                }
                            >
                                <Settings size={16} />
                                <span>Gestión Usuarios</span>
                            </NavLink>
                        </div>
                    )}

                    <div
                        className="flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors group"
                        onClick={() => setIsProfileOpen(true)}
                        title="Editar Perfil"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border-2 border-slate-700 overflow-hidden group-hover:border-primary/50 transition-colors relative">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Edit2 size={12} className="text-white" />
                            </div>
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 px-1.5 py-0.5 bg-slate-800 rounded inline-block">{role || 'GUEST'}</p>
                        </div>
                    </div>

                    {user?.email === 'gustaquevedo@gmail.com' && role !== 'ADMIN' && (
                        <div className="mb-4">
                            <button
                                onClick={async () => {
                                    await updateRole('ADMIN');
                                    window.location.reload(); // Refresh to catch all new permissions
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors animate-pulse"
                            >
                                <Package size={14} /> FORZAR MODO ADMIN
                            </button>
                        </div>
                    )}

                    {['ADMIN', 'FINANCE'].includes(role || '') && (
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-3 rounded-lg hover:bg-slate-800/50 mb-2 ${isActive ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(19,91,236,0.2)]' : ''
                                }`
                            }
                        >
                            <Settings size={20} />
                            <span>Configuración</span>
                        </NavLink>
                    )}

                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-colors w-full px-4 py-3 rounded-lg hover:bg-slate-800/50"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 pointer-events-none" />
                <div className="flex-1 overflow-y-auto p-8 relative z-10">
                    <Outlet />
                </div>
            </main>

            {/* Profile Modal - Pending Implementation */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full relative text-center">
                        <h2 className="text-xl font-bold text-white mb-2">¡Próximamente!</h2>
                        <p className="text-slate-400 mb-6">El módulo de avatares estará disponible en la próxima actualización.</p>
                        <button onClick={() => setIsProfileOpen(false)} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
