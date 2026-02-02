import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/use-auth-session';
import DashboardLayout from '@/layouts/DashboardLayout'; // Import DashboardLayout
import { useProfile } from '@/hooks/use-profile'; // Import useProfile

function LoginPage() {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading } = useAuthSession();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfile(); // Use useProfile

  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading) { // Wait for both auth and profile to load
      if (session && profile) { // Only redirect if both session and profile are loaded
        navigate('/dashboard', { replace: true }); // Redirect to dashboard if already logged in
      }
    }
  }, [session, profile, isAuthLoading, isProfileLoading, navigate]);

  // If still loading auth or profile, show a loading indicator
  if (isAuthLoading || isProfileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Loading authentication status...
        </div>
      </DashboardLayout>
    );
  }

  // If there's a profile error but session exists, it means profile couldn't be fetched.
  // This might happen if the user is authenticated but their profile entry is missing/corrupt.
  // We can log this but still show the login form, or redirect to a specific error page.
  if (profileError && session) {
    console.error("LoginPage: Profile fetch error for existing session:", profileError);
    // Optionally show a toast here
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