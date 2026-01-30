import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep-charcoal text-foreground">
      <div className="text-center p-8 rounded-lg glassmorphism border border-electric-violet/30">
        <h1 className="text-6xl font-bold mb-4 text-electric-violet">404</h1>
        <p className="text-2xl text-gray-300 mb-6">Oops! Command not found.</p>
        <a href="/" className="text-neon-cyan hover:text-electric-violet underline transition-colors">
          Return to Base
        </a>
      </div>
    </div>
  );
};

export default NotFound;