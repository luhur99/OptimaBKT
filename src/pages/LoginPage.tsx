import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/use-auth-session';
import DashboardLayout from '@/layouts/DashboardLayout'; // Import DashboardLayout

function LoginPage() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/dashboard'); // Redirect to dashboard if already logged in
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Loading authentication status...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep-charcoal text-foreground p-4">
      <div className="w-full max-w-md p-8 rounded-lg glassmorphism border border-neon-cyan/30 neon-glow">
        <h1 className="text-3xl font-bold text-center mb-6 text-neon-cyan">Welcome Back, Commander.</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers unless specified
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--neon-cyan))',
                  brandAccent: 'hsl(var(--electric-violet))',
                  inputBackground: 'hsl(var(--midnight-blue))',
                  inputBorder: 'hsl(var(--gray-700))',
                  inputPlaceholder: 'hsl(var(--gray-500))',
                  inputText: 'hsl(var(--gray-300))',
                  defaultButtonBackground: 'hsl(var(--electric-violet))',
                  defaultButtonHoverBackground: 'hsl(var(--electric-violet)/80)',
                  defaultButtonBorder: 'hsl(var(--electric-violet)/50)',
                  defaultButtonText: 'hsl(var(--white))',
                },
              },
            },
          }}
          theme="dark" // Use dark theme for consistency
          redirectTo={window.location.origin + '/dashboard'} // Redirect to dashboard after successful login
        />
      </div>
    </div>
  );
}

export default LoginPage;