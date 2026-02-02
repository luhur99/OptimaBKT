import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER';
  email: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

interface AuthSession {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
}

export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(false); // Ref untuk melacak apakah komponen terpasang

  useEffect(() => {
    mounted.current = true; // Komponen terpasang
    const abortController = new AbortController(); // Inisialisasi AbortController

    const fetchSessionAndProfile = async (signal: AbortSignal) => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted.current) return;

        if (sessionError) {
          // Silently ignore AbortError, log other errors
          if (sessionError.name !== 'AbortError') {
            console.error('Error fetching initial session:', sessionError);
          }
          if (mounted.current) {
            setSession(null);
            setProfile(null);
          }
        } else {
          if (mounted.current) {
            setSession(initialSession);
          }
          if (initialSession) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialSession.user.id)
                .single({ signal });

              if (!mounted.current) return;

              if (profileError) {
                if (profileError.name !== 'AbortError') {
                  console.error('Error fetching initial profile:', profileError);
                }
                if (mounted.current) {
                  setProfile(null);
                }
              } else {
                if (mounted.current) {
                  setProfile(profileData);
                }
              }
            } catch (e: any) {
              if (e.name !== 'AbortError') {
                console.error('Unexpected error during initial profile fetch:', e);
              }
              if (mounted.current) {
                setProfile(null);
              }
            }
          } else {
            if (mounted.current) {
              setProfile(null);
            }
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Unexpected error during initial session/profile fetch:', e);
        }
        if (mounted.current) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchSessionAndProfile(abortController.signal);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted.current) return;

        if (mounted.current) {
          setSession(newSession);
        }
        if (newSession) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();

            if (!mounted.current) return;

            if (profileError) {
              if (profileError.name !== 'AbortError') {
                console.error('Error fetching profile on auth state change:', profileError);
              }
              if (mounted.current) {
                setProfile(null);
              }
            } else {
              if (mounted.current) {
                setProfile(profileData);
              }
            }
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              console.error('Unexpected error during profile fetch on auth state change:', e);
            }
            if (mounted.current) {
              setProfile(null);
            }
          }
        } else {
          if (mounted.current) {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      mounted.current = false;
      abortController.abort();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, profile, isLoading };
}