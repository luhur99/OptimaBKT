import { MadeWithDyad } from "@/components/made-with-elmony";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile"; // Import useProfile

const Index = () => {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading } = useAuthSession();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfile(); // Use useProfile

  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading) { // Wait for both auth and profile to load
      if (session && profile) {
        navigate('/dashboard', { replace: true }); // Redirect to dashboard if logged in and profile loaded
      } else {
        navigate('/login', { replace: true }); // Redirect to login if not logged in or profile failed to load
      }
    }
  }, [session, profile, isAuthLoading, isProfileLoading, navigate]); // Add profile and isProfileLoading to dependencies

  if (isAuthLoading || isProfileLoading) { // Show loading state if either auth or profile is loading
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-deep-charcoal text-foreground">
        <div className="text-center p-8 rounded-lg glassmorphism border border-neon-cyan/30 neon-glow">
          <h1 className="text-4xl font-bold mb-4 text-neon-cyan">Initializing System...</h1>
          <Skeleton className="h-6 w-48 mx-auto mt-4 bg-gray-700" />
        </div>
        <div className="mt-8">
          <MadeWithDyad />
        </div>
      </div>
    );
  }

  // This component will typically redirect before rendering anything significant
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep-charcoal text-foreground">
      <div className="text-center p-8 rounded-lg glassmorphism border border-neon-cyan/30 neon-glow">
        <h1 className="text-4xl font-bold mb-4 text-neon-cyan">Welcome to Your Command Center</h1>
        <p className="text-xl text-gray-300">
          Prepare for a futuristic experience.
        </p>
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;