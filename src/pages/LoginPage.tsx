import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { seedDatabase } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import logoImg from "@/assets/logo-civotech.png";

const TEST_ACCOUNTS = [
  { label: "DG", email: "dg@civotech.ci", role: "DG", nom: "Koné", prenom: "Amadou" },
  { label: "Commercial", email: "commercial@civotech.ci", role: "COMMERCIAL", nom: "Diallo", prenom: "Fatou" },
  { label: "Logistique", email: "logistique@civotech.ci", role: "LOGISTIQUE", nom: "Touré", prenom: "Ibrahim" },
  { label: "Finance", email: "finance@civotech.ci", role: "FINANCE", nom: "Bamba", prenom: "Aïcha" },
  { label: "Achats", email: "achats@civotech.ci", role: "ACHATS", nom: "Coulibaly", prenom: "Moussa" },
  { label: "Assistante", email: "assistante@civotech.ci", role: "ASSISTANTE", nom: "Yao", prenom: "Marie" },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setSeeding(true);
      try {
        await seedDatabase();
        for (const acc of TEST_ACCOUNTS) {
          try {
            await signup(acc.email, "admin123", acc.nom, acc.prenom, acc.role as any);
          } catch {
            // Account already exists
          }
        }
      } catch (e) {
        console.log("Seed/setup error:", e);
      }
      if (!cancelled) setSeeding(false);
    }
    init();
    return () => { cancelled = true; };
  }, [signup]);

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

  const handleQuickLogin = async (testEmail: string) => {
    setEmail(testEmail);
    setPassword("admin123");
    setError("");
    setLoading(true);
    try {
      await login(testEmail, "admin123");
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
        <div className="flex flex-col items-center gap-6 mb-8">
          <img src={logoImg} alt="Civotech" className="h-16" />
          <div className="text-center">
            <h1 className="text-4xl font-bold">Civotech Flow</h1>
            <p className="text-sidebar-muted text-lg mt-1">Transport & Logistique</p>
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
              <img src={logoImg} alt="Civotech" className="h-10" />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
              <p className="mt-1 text-muted-foreground">Accédez à votre espace de travail</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email" type="email" placeholder="votre.email@civotech.ci"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive font-medium">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading || seeding}>
                {loading ? "Connexion en cours..." : seeding ? "Initialisation..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-secondary p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Connexion rapide :</p>
              <div className="grid grid-cols-3 gap-2">
                {TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={loading || seeding}
                    className="text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary text-foreground font-medium transition-colors disabled:opacity-50"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Mot de passe : <span className="font-mono font-medium text-foreground">admin123</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
