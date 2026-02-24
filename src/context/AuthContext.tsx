import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'ADMIN' | 'FINANCE' | 'OPERATIONS' | 'CLIENT' | 'GUARD' | null;

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: UserRole;
    clientId: string | null;
    avatarUrl: string | null;
    requiresPasswordChange: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
    updateRole: (newRole: UserRole, clientId?: string | null) => Promise<void>; // For prototyping
    refreshAvatar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    clientId: null,
    avatarUrl: null,
    requiresPasswordChange: false,
    isLoading: true,
    signOut: async () => { },
    updateRole: async () => { },
    refreshAvatar: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial fetch
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setRole(null);
                setClientId(null);
                setAvatarUrl(null);
                setRequiresPasswordChange(false);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role, client_id, requires_password_change, avatar_url')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching role:', error);
            }

            if (data) {
                setRole(data.role as UserRole);
                setClientId(data.client_id);
                setAvatarUrl(data.avatar_url);
                setRequiresPasswordChange(!!data.requires_password_change);
            } else {
                // No role assigned yet. Default to something safe or leave as null.
                setRole(null);
                setAvatarUrl(null);
                setRequiresPasswordChange(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateRole = async (newRole: UserRole, cliId: string | null = null) => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Use the RPC function we created to assign a role
            const { error } = await supabase.rpc('set_test_user_role', {
                target_role: newRole,
                target_client_id: cliId
            });
            if (error) throw error;
            setRole(newRole);
            setClientId(cliId);
        } catch (error) {
            console.error('Error setting test role:', error);
            alert('Error updating role.');
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshAvatar = async () => {
        if (user) {
            await fetchUserRole(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, role, clientId, avatarUrl, requiresPasswordChange, isLoading, signOut, updateRole, refreshAvatar }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
