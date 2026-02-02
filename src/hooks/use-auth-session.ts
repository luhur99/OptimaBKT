import React, { useState, useEffect, useContext, createContext } from 'react';
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

interface AuthSessionContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

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
          if (sessionError.name !== 'AbortError') {
            // console.warn('Initial session fetch aborted.'); // Log as warning, not error
          } else {
            console.error('Error fetching initial session:', sessionError);
          }
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
            if (profileError.name !== 'AbortError') {
              // console.warn('Initial profile fetch aborted.'); // Log as warning, not error
            } else {
              console.error('Error fetching initial profile:', profileError);
            }
            setProfile(null);
            return;
          }
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // console.warn('An operation in initial fetch was aborted.'); // Log as warning, not error
        } else {
          console.error('Unexpected error during initial fetch:', error);
        }
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
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
              if (profileError.name !== 'AbortError') {
                // console.warn('Auth state change profile fetch aborted.'); // Log as warning, not error
              } else {
                console.error('Error fetching profile on auth state change:', profileError);
              }
              setProfile(null);
              return;
            }
            setProfile(profileData);
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              // console.warn('An operation in auth state change fetch was aborted.'); // Log as warning, not error
            } else {
              console.error('Unexpected error during auth state change profile fetch:', error);
            }
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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