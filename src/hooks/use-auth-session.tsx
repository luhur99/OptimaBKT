import React, { useState, useEffect, useContext, createContext } from 'react';
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

    useEffect(() => {
        let mounted = true;

        const fetchSessionAndProfile = async () => {
            try {
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

                if (!mounted) return;

                if (sessionError) {
                    console.error('AuthSessionProvider: Error fetching session:', sessionError);
                    setSession(null);
                    setProfile(null);
                    return;
                }

                setSession(initialSession);

                if (initialSession?.user) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', initialSession.user.id)
                        .maybeSingle();

                    if (!mounted) return;

                    if (profileError) {
                        console.error('AuthSessionProvider: Error fetching profile:', profileError);
                        setProfile(null);
                        return;
                    }
                    setProfile(profileData);
                } else {
                    setProfile(null);
                }
            } catch (error: any) {
                console.error('AuthSessionProvider: Unexpected error:', error);
                if (mounted) {
                    setSession(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSessionAndProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mounted) return;

                setSession(newSession);

                if (newSession?.user) {
                    try {
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', newSession.user.id)
                            .maybeSingle();

                        if (!mounted) return;

                        if (profileError) {
                            console.error('AuthSessionProvider: Error fetching profile on change:', profileError);
                            setProfile(null);
                            return;
                        }
                        setProfile(profileData);
                    } catch (error: any) {
                        console.error('AuthSessionProvider: Profile refresh error:', error);
                        if (mounted) setProfile(null);
                    }
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
                        console.warn('AuthSessionProvider: Safety timeout reached. Forcing loading to false.');
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
    }, []);

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
