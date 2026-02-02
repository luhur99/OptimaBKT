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

    const getInitialSessionAndProfile = async (signal: AbortSignal) => {
      try {
        // Fetch session (tidak secara langsung mendukung AbortSignal, tapi kita tangani AbortError)
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (signal.aborted) {
          console.warn('Initial session fetch aborted.');
          return;
        }

        if (sessionError) {
          if (sessionError.name === 'AbortError') {
            console.warn('Initial session fetch aborted.');
            return;
          }
          console.error('Error fetching initial session:', sessionError);
          setSession(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          if (initialSession) {
            try {
              // Fetch profile (mendukung AbortSignal)
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialSession.user.id)
                .single({ signal }); // Meneruskan signal di sini

              if (signal.aborted) {
                console.warn('Initial profile fetch aborted.');
                return;
              }

              if (profileError) {
                if (profileError.name === 'AbortError') {
                  console.warn('Initial profile fetch aborted.');
                  return;
                }
                console.error('Error fetching initial profile:', profileError);
                setProfile(null);
              } else {
                setProfile(profileData);
              }
            } catch (e: any) {
              if (e.name === 'AbortError') {
                console.warn('Initial profile fetch aborted due to component unmount.');
              } else {
                console.error('Unexpected error during initial profile fetch:', e);
              }
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.warn('Initial session/profile fetch aborted due to component unmount.');
        } else {
          console.error('Unexpected error during initial session/profile fetch:', e);
        }
        setSession(null);
        setProfile(null);
      } finally {
        if (!signal.aborted) { // Hanya set isLoading ke false jika tidak dibatalkan
          setIsLoading(false);
        }
      }
    };

    getInitialSessionAndProfile(abortController.signal);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

        setSession(newSession);
        if (newSession) {
          try {
            // Gunakan AbortController baru untuk setiap fetch di dalam listener jika diperlukan,
            // atau pastikan operasi ini cepat dan tidak rentan AbortError.
            // Untuk kesederhanaan, kita tidak membuat AbortController baru di sini
            // karena onAuthStateChange adalah langganan, bukan fetch tunggal.
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single(); // Tidak meneruskan signal di sini karena ini adalah bagian dari callback listener

            if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

            if (profileError) {
              console.error('Error fetching profile on auth state change:', profileError);
              if (profileError.name === 'AbortError') {
                console.warn('Profile fetch on auth state change aborted.');
                return;
              }
              setProfile(null);
            } else {
              setProfile(profileData);
            }
          } catch (e: any) {
            if (e.name === 'AbortError') {
              console.warn('Profile fetch on auth state change aborted due to component unmount.');
            } else {
              console.error('Unexpected error during profile fetch on auth state change:', e);
            }
            if (!mounted.current) return;
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted.current = false; // Komponen di-unmount
      abortController.abort(); // Batalkan permintaan yang sedang berjalan
      authListener.subscription.unsubscribe(); // Cleanup untuk langganan
    };
  }, []); // Dependency array kosong

  return { session, profile, isLoading };
}