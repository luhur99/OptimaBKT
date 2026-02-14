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

        const getSessionWithTimeout = async (timeoutMs: number, retries: number, delayMs: number) => {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Session fetch timed out')), timeoutMs)
                    );

                    const { data: { session: initialSession }, error: sessionError } = await Promise.race([
                        sessionPromise,
                        timeoutPromise
                    ]) as any;

                    if (sessionError) {
                        throw sessionError;
                    }

                    return initialSession ?? null;
                } catch (error: any) {
                    const isAbort = error?.name === 'AbortError' || error?.message?.includes('aborted');
                    if (attempt >= retries && !isAbort) {
                        throw error;
                    }
                    if (attempt >= retries) {
                        return null;
                    }
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            return null;
        };

        const initializeAuth = async () => {
            try {
                const initialSession = await getSessionWithTimeout(6000, 1, 200);

                if (!mounted) return;

                if (!initialSession) {
                    // Only clear state if the auth listener hasn't already set a valid session
                    setSession(prev => prev || null);
                    setProfile(prev => prev || null);
                } else {
                    setSession(initialSession);
                    const profileData = await fetchProfile(initialSession.user.id, mounted);
                    if (mounted) {
                        setProfile(profileData);
                    }
                }
            } catch (error: any) {
                // Only log non-AbortError warnings
                if (error.name !== 'AbortError' && !error.message?.includes('aborted')) {
                    console.warn('AuthSessionProvider: Initialization warning/error:', error.message || error);
                }
                // Only clear if NOT already set by a listener (to avoid race conditions)
                if (mounted) {
                    setSession(prev => prev || null);
                    setProfile(prev => prev || null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        // Always re-initialize auth to ensure fresh session state
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;

                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }

                setSession(newSession);

                if (newSession?.user) {
                    // Keep isLoading=true while fetching profile so ProtectedRoute
                    // doesn't fire the "profile unavailable" toast prematurely.
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
                } else {
                    setProfile(null);
                    setIsLoading(false);
                }
            }
        );

        // Ultimate safety timeout (8 seconds)
        const ultimateTimeout = setTimeout(() => {
            if (mounted) {
                setIsLoading(current => current ? false : current);
            }
        }, 8000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(ultimateTimeout);
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
