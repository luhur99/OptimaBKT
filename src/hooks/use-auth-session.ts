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
        if (!mounted.current) return; // Cek mounted setelah operasi async

        if (sessionError) {
          if (sessionError.name === 'AbortError') {
            console.warn('Initial session fetch aborted.');
            return; // Abaikan AbortError
          }
          console.error('Error fetching initial session:', sessionError);
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
              // Fetch profile (mendukung AbortSignal)
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialSession.user.id)
                .single({ signal }); // Meneruskan signal di sini

              if (!mounted.current) return; // Cek mounted setelah operasi async

              if (profileError) {
                if (profileError.name === 'AbortError') {
                  console.warn('Initial profile fetch aborted.');
                  return; // Abaikan AbortError
                }
                console.error('Error fetching initial profile:', profileError);
                if (mounted.current) {
                  setProfile(null);
                }
              } else {
                if (mounted.current) {
                  setProfile(profileData);
                }
              }
            } catch (e: any) { // Catch untuk pengambilan profil
              if (e.name === 'AbortError') {
                console.warn('Initial profile fetch aborted due to component unmount.');
              } else {
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
      } catch (e: any) { // Catch untuk pengambilan sesi awal
        if (e.name === 'AbortError') {
          console.warn('Initial session/profile fetch aborted due to component unmount.');
        } else {
          console.error('Unexpected error during initial session/profile fetch:', e);
        }
        if (mounted.current) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        // Selalu set isLoading ke false jika komponen masih terpasang
        // Ini memastikan status loading selesai, terlepas dari apakah fetch berhasil atau dibatalkan.
        if (mounted.current) {
          setIsLoading(false);
        }
      }
    };

    getInitialSessionAndProfile(abortController.signal);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

        if (mounted.current) {
          setSession(newSession);
        }
        if (newSession) {
          try {
            // Untuk fetch di dalam listener, kita tidak menggunakan AbortController yang sama
            // karena ini adalah bagian dari callback langganan.
            // Namun, kita tetap menangani AbortError jika terjadi dari operasi fetch internal Supabase.
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();

            if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

            if (profileError) {
              console.error('Error fetching profile on auth state change:', profileError);
              // Periksa apakah profileError adalah objek dan memiliki properti 'name'
              if (profileError && typeof profileError === 'object' && 'name' in profileError && profileError.name === 'AbortError') {
                console.warn('Profile fetch on auth state change aborted.');
                return; // Abaikan AbortError
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
            if (e.name === 'AbortError') {
              console.warn('Profile fetch on auth state change aborted due to component unmount.');
            } else {
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
      mounted.current = false; // Komponen di-unmount
      abortController.abort(); // Batalkan permintaan yang sedang berjalan
      authListener.subscription.unsubscribe(); // Cleanup untuk langganan
    };
  }, []); // Dependency array kosong

  return { session, profile, isLoading };
}