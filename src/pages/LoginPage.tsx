import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="sidebar-gradient hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-sidebar-foreground">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sidebar-primary">
            <Truck className="h-10 w-10 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Civotech Flow</h1>
            <p className="text-sidebar-muted text-lg">Transport & Logistique</p>
          </div>
        </div>
        <p className="max-w-md text-center text-sidebar-foreground/80 text-lg leading-relaxed">
          Gérez vos opérations de transport, devis, factures et parc automobile depuis une plateforme unique.
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="mb-8 lg:hidden flex items-center gap-3 justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Truck className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Civotech Flow</h1>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
              <p className="mt-1 text-muted-foreground">Accédez à votre espace de travail</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@civotech.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-secondary p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Comptes de test :</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">DG</span> — dg@civotech.ci</p>
                <p><span className="font-medium text-foreground">Commercial</span> — commercial@civotech.ci</p>
                <p><span className="font-medium text-foreground">Logistique</span> — logistique@civotech.ci</p>
                <p><span className="font-medium text-foreground">Finance</span> — finance@civotech.ci</p>
                <p><span className="font-medium text-foreground">Achats</span> — achats@civotech.ci</p>
                <p><span className="font-medium text-foreground">Assistante</span> — assistante@civotech.ci</p>
                <p className="mt-1">Mot de passe : <span className="font-mono font-medium text-foreground">admin123</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
