import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';



export interface Profile {
    id: string;
    full_name: string;
    role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER' | 'STAFF';
    email: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
}

export interface AuthSessionContextType {
    session: Session | null;
    profile: Profile | null;
    isLoading: boolean;
}

export const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async (userId: string, mounted: boolean) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!mounted) return null;

            if (error) {
                // Silently ignore AbortError (common in React StrictMode)
                if (error.name === 'AbortError' || (error as any).message?.includes('AbortError') || (error as any).message?.includes('aborted')) {
                    return null;
                }
                console.error('AuthSessionProvider: Error fetching profile:', error);
                return null;
            }
            return data as Profile;
        } catch (err: any) {
            // Silently ignore AbortError
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                return null;
            }
            console.error('AuthSessionProvider: Profile fetch exception:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;

                // Session ended or refresh token invalid — clear and stop loading.
                if (event === 'SIGNED_OUT' || !newSession) {
                    setSession(null);
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }

                // Silent token refresh — just update session, profile hasn't changed.
                if (event === 'TOKEN_REFRESHED') {
                    setSession(newSession);
                    return;
                }

                // INITIAL_SESSION, SIGNED_IN, USER_UPDATED — fetch profile.
                setSession(newSession);
                setIsLoading(true);

                let retries = 3;
                let profileData = null;

                while (retries > 0 && mounted) {
                    profileData = await fetchProfile(newSession.user.id, mounted);
                    if (profileData !== null || !mounted) break;
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                }

                if (mounted) {
                    setProfile(profileData);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    return (
        <AuthSessionContext.Provider value={{ session, profile, isLoading }}>
            {children}
        </AuthSessionContext.Provider>
    );
};

export function useAuthSession(): AuthSessionContextType {
    const context = useContext(AuthSessionContext);
    if (context === undefined) {
        throw new Error('useAuthSession must be used within an AuthSessionProvider');
    }
    return context;
}
