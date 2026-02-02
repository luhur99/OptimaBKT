import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from './use-auth-session'; // Import the simplified auth session

interface Profile {
  id: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'OPERASIONAL_DIV' | 'SALES_DIV' | 'TECHNICIAN' | 'ACCOUNTING' | 'USER';
  email: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { session, isLoading: isAuthLoading } = useAuthSession();

  return useQuery<Profile, Error>({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error('User not authenticated.');
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!session && !isAuthLoading, // Only run query if session exists and auth is not loading
    // react-query's default options (from App.tsx) will handle staleTime, refetchOnWindowFocus, etc.
  });
}