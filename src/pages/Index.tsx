"use client";

import { MadeWithDyad } from "@/components/made-with-elmony";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        navigate('/dashboard'); // Redirect to dashboard if logged in
      } else {
        navigate('/login'); // Redirect to login if not logged in
      }
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
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