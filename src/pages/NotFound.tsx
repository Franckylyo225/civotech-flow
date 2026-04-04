import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Illustration */}
        <div className="relative mx-auto w-fit">
          <div className="rounded-2xl bg-primary/10 p-6">
            <MapPin className="h-16 w-16 text-primary" strokeWidth={1.5} />
          </div>
          <span className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-sm font-bold shadow-md">
            404
          </span>
        </div>

        {/* Texte */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
          <p className="text-muted-foreground text-sm">
            La page <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{location.pathname}</code> n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
