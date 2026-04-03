import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { seedDatabase } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoImg from "@/assets/logo-civotech.png";
import loginBg from "@/assets/login-bg.jpg";

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
      {/* Left panel - login form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16 xl:px-24 bg-background">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-12">
            <img src={logoImg} alt="Civotech" className="h-10" />
          </div>

          {/* Welcome text */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-primary mb-2">Bienvenue !</h1>
            <p className="text-muted-foreground text-lg">
              Accédez à votre espace Civotech Flow
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Connexion par e-mail</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@civotech.ci"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg border-border bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-lg border-border bg-background text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-base font-semibold tracking-wide uppercase gap-2"
              disabled={loading || seeding}
            >
              {loading ? "Connexion..." : seeding ? "Initialisation..." : (
                <>Se connecter <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Quick login */}
          <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">Connexion rapide (démo) :</p>
            <div className="grid grid-cols-3 gap-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading || seeding}
                  className="text-xs px-3 py-2 rounded-lg border border-border bg-background hover:border-primary hover:text-primary text-foreground font-medium transition-all disabled:opacity-50"
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Mot de passe : <span className="font-mono font-semibold text-foreground">admin123</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - hero image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={loginBg}
          alt="Transport routier"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-10 text-primary-foreground">
          <p className="text-2xl font-bold leading-snug mb-2">
            « La logistique au service de votre croissance »
          </p>
          <p className="text-primary-foreground/70 text-base leading-relaxed max-w-lg">
            Gérez vos opérations de transport, devis, factures et parc automobile depuis une plateforme unique et moderne.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-semibold">Civotech Flow</span>
            <span className="text-primary-foreground/50">•</span>
            <span className="text-sm text-primary-foreground/60">Transport & Logistique</span>
          </div>
        </div>
      </div>
    </div>
  );
}
