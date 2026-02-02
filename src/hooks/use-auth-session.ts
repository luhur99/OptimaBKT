import { useContext, createContext } from 'react';
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

export const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export function useAuthSession(): AuthSessionContextType {
  const context = useContext(AuthSessionContext);
  if (context === undefined) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }
  return context;
}