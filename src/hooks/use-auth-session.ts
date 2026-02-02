import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        
        // Fetch profile if session exists
        if (session?.user) {
          return supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
        }
        return { data: null };
      })
      .then(({ data }) => {
        if (mounted && data) {
          setProfile(data);
        }
      })
      .catch(() => {
        // Silently ignore all errors
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);

        if (newSession?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (mounted && data) {
                setProfile(data);
              }
            })
            .catch(() => {
              // Silently ignore
            });
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

  return { session, profile, isLoading };
}