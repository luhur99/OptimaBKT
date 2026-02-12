import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/auth-session';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const redirectPath = requestedPath && requestedPath !== '/login' ? requestedPath : '/dashboard';

  useEffect(() => {
    if (!isLoading && session) {
      navigate(redirectPath, { replace: true }); // Redirect to original page if present
    }
  }, [session, isLoading, navigate, redirectPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      showError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      showError(error.message || 'Login failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    navigate(redirectPath, { replace: true });
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-charcoal text-gray-400">
        Loading authentication status...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep-charcoal text-foreground p-4">
      <div className="w-full max-w-md p-8 rounded-lg glassmorphism border border-neon-cyan/30 neon-glow">
        <h1 className="text-3xl font-bold text-center mb-6 text-neon-cyan">Welcome Back, Commander.</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-electric-violet text-white hover:bg-electric-violet/80"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-xs text-center text-gray-500">
          Having trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
