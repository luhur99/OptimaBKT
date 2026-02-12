import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

declare global {
    interface Window {
        __authInitDone?: boolean;
        __authCachedSession?: Session | null;
        __authCachedProfile?: Profile | null;
    }
}

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
            console.log('AuthSessionProvider: Starting initialization...');
            try {
                const initialSession = await getSessionWithTimeout(15000, 2, 500);

                if (!mounted) return;

                console.log('AuthSessionProvider: Initial session retrieved:', initialSession?.user?.id || 'No session');
                setSession(initialSession);
                if (initialSession?.user) {
                    const profileData = await fetchProfile(initialSession.user.id, mounted);
                    if (mounted) {
                        setProfile(profileData);
                        if (typeof window !== 'undefined') {
                            window.__authCachedSession = initialSession;
                            window.__authCachedProfile = profileData;
                        }
                    }
                } else {
                    setProfile(null);
                    if (typeof window !== 'undefined') {
                        window.__authCachedSession = initialSession;
                        window.__authCachedProfile = null;
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
                    console.log('AuthSessionProvider: Initialization complete, setting isLoading to false.');
                    setIsLoading(false);
                }
            }
        };

        // Always re-initialize auth to ensure fresh session state
        // Window cache is only used as a brief optimization, not as source of truth
        if (typeof window !== 'undefined') {
            window.__authInitDone = true;
        }
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;

                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setProfile(null);
                    setIsLoading(false); // Ensure loading is off on sign out
                    if (typeof window !== 'undefined') {
                        window.__authCachedSession = null;
                        window.__authCachedProfile = null;
                    }
                    return;
                }

                setSession(newSession);

                if (newSession?.user) {
                    // Retry profile fetch up to 3 times if aborted
                    let retries = 3;
                    let profileData = null;

                    while (retries > 0 && mounted) {
                        profileData = await fetchProfile(newSession.user.id, mounted);
                        if (profileData !== null || !mounted) break;
                        retries--;
                        if (retries > 0) {
                            // Wait a bit before retrying
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }

                    if (mounted) {
                        setProfile(profileData);
                        setIsLoading(false);
                        if (typeof window !== 'undefined') {
                            window.__authCachedSession = newSession;
                            window.__authCachedProfile = profileData;
                        }
                    }
                } else {
                    setProfile(null);
                    setIsLoading(false);
                    if (typeof window !== 'undefined') {
                        window.__authCachedSession = newSession;
                        window.__authCachedProfile = null;
                    }
                }
            }
        );

        // Ultimate safety timeout (15 seconds)
        const ultimateTimeout = setTimeout(() => {
            if (mounted) {
                setIsLoading(current => {
                    if (current) {
                        console.warn('AuthSessionProvider: Ultimate safety timeout reached. Forcing loading to false.');
                        return false;
                    }
                    return current;
                });
            }
        }, 15000);

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
