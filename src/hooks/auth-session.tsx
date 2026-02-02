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
            console.log(`AuthSessionProvider: Fetching profile for user ${userId}...`);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!mounted) return null;

            if (error) {
                if (error.name === 'AbortError' || (error as any).message?.includes('AbortError')) {
                    console.log('AuthSessionProvider: Profile fetch aborted.');
                    return null;
                }
                console.error('AuthSessionProvider: Error fetching profile:', error);
                return null;
            }
            console.log('AuthSessionProvider: Profile fetched successfully.');
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
            console.log('AuthSessionProvider: Starting initialization...');
            try {
                // Set a timeout for getSession as it can sometimes hang
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session fetch timed out')), 5000)
                );

                const { data: { session: initialSession }, error: sessionError } = await Promise.race([
                    sessionPromise,
                    timeoutPromise
                ]) as any;

                if (!mounted) return;

                if (sessionError) {
                    if (sessionError.name !== 'AbortError') {
                        console.error('AuthSessionProvider: Initial session error:', sessionError);
                    }
                    setSession(null);
                    setProfile(null);
                } else {
                    console.log('AuthSessionProvider: Initial session retrieved:', initialSession?.user?.id || 'No session');
                    setSession(initialSession);
                    if (initialSession?.user) {
                        const profileData = await fetchProfile(initialSession.user.id, mounted);
                        if (mounted) setProfile(profileData);
                    } else {
                        setProfile(null);
                    }
                }
            } catch (error: any) {
                console.warn('AuthSessionProvider: Initialization warning/error:', error.message || error);
                // Continue with null session if getSession fails/times out
                if (mounted) {
                    setSession(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    console.log('AuthSessionProvider: Initialization complete, setting isLoading to false.');
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;
                console.log(`AuthSessionProvider: Auth state change: ${event}`);

                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setProfile(null);
                    setIsLoading(false); // Ensure loading is off on sign out
                    return;
                }

                setSession(newSession);

                if (newSession?.user) {
                    const profileData = await fetchProfile(newSession.user.id, mounted);
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
