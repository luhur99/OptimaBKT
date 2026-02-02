import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthSession {
  session: Session | null;
  isLoading: boolean;
}

export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setIsLoading(false); // This should always run
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setIsLoading(false); // This should also always run
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}