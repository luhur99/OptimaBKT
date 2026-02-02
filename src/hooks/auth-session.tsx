import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    full_name: string;
    role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER';
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
                // Ignore AbortError for profile fetch too
                if (error.name === 'AbortError' || (error as any).message?.includes('AbortError')) {
                    return null;
                }
                console.error('AuthSessionProvider: Error fetching profile:', error);
                return null;
            }
            return data as Profile;
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('AuthSessionProvider: Profile fetch exception:', err);
            }
            return null;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

                if (!mounted) return;

                if (sessionError) {
                    if (sessionError.name !== 'AbortError') {
                        console.error('AuthSessionProvider: Initial session error:', sessionError);
                    }
                    setSession(null);
                    setProfile(null);
                } else {
                    setSession(initialSession);
                    if (initialSession?.user) {
                        const profileData = await fetchProfile(initialSession.user.id, mounted);
                        if (mounted) setProfile(profileData);
                    } else {
                        setProfile(null);
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('AuthSessionProvider: Initialization error:', error);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;

                // Handle sign out immediately
                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setProfile(null);
                    return;
                }

                setSession(newSession);

                if (newSession?.user) {
                    // Only fetch profile if it's a significant event or if we don't have it yet
                    // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED are good times to refresh
                    const profileData = await fetchProfile(newSession.user.id, mounted);
                    if (mounted) setProfile(profileData);
                } else {
                    setProfile(null);
                }
            }
        );

        // Safety timeout (10 seconds)
        const safetyTimeout = setTimeout(() => {
            if (mounted) {
                setIsLoading(current => {
                    if (current) {
                        console.warn('AuthSessionProvider: Forced loading to false after timeout.');
                        return false;
                    }
                    return current;
                });
            }
        }, 10000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
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
