import { MadeWithDyad } from "@/components/made-with-elmony";

const Index = () => {
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