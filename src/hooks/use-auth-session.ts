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

    const getInitialSessionAndProfile = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

        if (sessionError) {
          console.error('Error fetching initial session:', sessionError);
          if (sessionError.name === 'AbortError') {
            console.warn('Initial session fetch aborted.');
            return; // Abaikan AbortError
          }
          setSession(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          if (initialSession) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialSession.user.id)
                .single();

              if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

              if (profileError) {
                console.error('Error fetching initial profile:', profileError);
                if (profileError.name === 'AbortError') {
                  console.warn('Initial profile fetch aborted.');
                  return; // Abaikan AbortError
                }
                setProfile(null);
              } else {
                setProfile(profileData);
              }
            } catch (e: any) { // Catch untuk pengambilan profil
              if (e.name === 'AbortError') {
                console.warn('Initial profile fetch aborted due to component unmount.');
              } else {
                console.error('Unexpected error during initial profile fetch:', e);
              }
              if (!mounted.current) return;
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (e: any) { // Catch untuk pengambilan sesi awal
        if (e.name === 'AbortError') {
          console.warn('Initial session/profile fetch aborted due to component unmount.');
        } else {
          console.error('Unexpected error during initial session/profile fetch:', e);
        }
        if (!mounted.current) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted.current) {
          setIsLoading(false); // Pastikan isLoading diatur ke false setelah upaya pemuatan awal
        }
      }
    };

    getInitialSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

        setSession(newSession);
        if (newSession) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();

            if (!mounted.current) return; // Mencegah pembaruan status jika komponen sudah di-unmount

            if (profileError) {
              console.error('Error fetching profile on auth state change:', profileError);
              if (profileError.name === 'AbortError') {
                console.warn('Profile fetch on auth state change aborted.');
                return; // Abaikan AbortError
              }
              setProfile(null);
            } else {
              setProfile(profileData);
            }
          } catch (e: any) { // Catch untuk pengambilan profil di listener
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
        // Penting: JANGAN atur isLoading di sini. isLoading adalah untuk pemuatan *awal*.
        // Perubahan status otentikasi berikutnya tidak boleh mengatur ulang indikator pemuatan untuk seluruh aplikasi.
      }
    );

    return () => {
      mounted.current = false; // Komponen di-unmount
      authListener.subscription.unsubscribe(); // Cleanup untuk langganan
    };
  }, []); // Dependency array kosong

  return { session, profile, isLoading };
}