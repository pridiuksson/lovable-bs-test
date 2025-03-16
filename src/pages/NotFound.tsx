
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/50 p-6">
      <div className={cn(
        "max-w-md w-full text-center glass-morphism",
        "rounded-xl p-8 space-y-6",
        "animate-fade-in"
      )}>
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">404</h1>
        <div className="space-y-4">
          <p className="text-xl text-foreground">The page you're looking for doesn't exist</p>
          <p className="text-muted-foreground">
            You might have followed a broken link or entered a URL that doesn't exist on this site.
          </p>
        </div>
        <Button className="mt-6" onClick={() => window.location.href = "/"}>
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
