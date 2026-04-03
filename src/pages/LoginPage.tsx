import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Star, TrendingUp, Truck, Users } from "lucide-react";
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

const TESTIMONIALS = [
  {
    quote: "Civotech Flow a transformé notre gestion logistique. Nous avons réduit nos délais de livraison de 35%.",
    author: "Amadou K.",
    role: "Directeur Général, TransCorp CI",
    stars: 5,
  },
  {
    quote: "Une plateforme intuitive qui nous fait gagner un temps précieux au quotidien. Le suivi en temps réel est un vrai plus.",
    author: "Fatou D.",
    role: "Responsable Logistique, AfriLog",
    stars: 5,
  },
  {
    quote: "La gestion des devis et factures n'a jamais été aussi simple. Mon équipe l'a adopté en une semaine.",
    author: "Ibrahim T.",
    role: "Chef d'exploitation, RapidTrans",
    stars: 4,
  },
];

const STATS = [
  { icon: Truck, value: "2 500+", label: "Livraisons gérées" },
  { icon: Users, value: "150+", label: "Entreprises clientes" },
  { icon: TrendingUp, value: "35%", label: "Gain de productivité" },
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
  const [mounted, setMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Trigger mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Parallax on mouse move
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!imgRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      imgRef.current.style.transform = `scale(1.08) translate(${-x}px, ${-y}px)`;
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
    <div className="flex min-h-screen overflow-hidden">
      {/* Left panel - login form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16 xl:px-24 bg-background">
        <div
          className={`w-full max-w-md mx-auto transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Logo */}
          <div
            className={`mb-12 transition-all duration-500 delay-100 ease-out ${
              mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            }`}
          >
            <img src={logoImg} alt="Civotech" className="h-10" />
          </div>

          {/* Welcome text */}
          <div
            className={`mb-10 transition-all duration-600 delay-200 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <h1 className="text-4xl font-bold text-primary mb-2">Bienvenue !</h1>
            <p className="text-muted-foreground text-lg">
              Accédez à votre espace Civotech Flow
            </p>
          </div>

          {/* Divider */}
          <div
            className={`relative mb-8 transition-all duration-500 delay-300 ease-out ${
              mounted ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            }`}
          >
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Connexion par e-mail</span>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-5 transition-all duration-600 delay-[400ms] ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@civotech.ci"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg border-border bg-background text-foreground transition-shadow duration-200 focus:shadow-lg focus:shadow-primary/10"
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
                  className="h-12 rounded-lg border-border bg-background text-foreground pr-10 transition-shadow duration-200 focus:shadow-lg focus:shadow-primary/10"
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

            {error && <p className="text-sm text-destructive font-medium animate-[fade-in_0.3s_ease-out]">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-base font-semibold tracking-wide uppercase gap-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading || seeding}
            >
              {loading ? "Connexion..." : seeding ? "Initialisation..." : (
                <>Se connecter <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></>
              )}
            </Button>
          </form>

          {/* Quick login */}
          <div
            className={`mt-8 rounded-xl border border-border bg-muted/30 p-5 transition-all duration-600 delay-[550ms] ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground mb-3">Connexion rapide (démo) :</p>
            <div className="grid grid-cols-3 gap-2">
              {TEST_ACCOUNTS.map((acc, i) => (
                <button
                  key={acc.email}
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading || seeding}
                  style={{ transitionDelay: mounted ? `${600 + i * 50}ms` : "0ms" }}
                  className={`text-xs px-3 py-2 rounded-lg border border-border bg-background hover:border-primary hover:text-primary hover:shadow-md hover:shadow-primary/5 text-foreground font-medium transition-all duration-300 disabled:opacity-50 hover:scale-105 active:scale-95 ${
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
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

      {/* Right panel - hero image with parallax */}
      <div
        className={`hidden lg:block lg:w-1/2 relative overflow-hidden transition-all duration-1000 ease-out ${
          mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
        }`}
      >
        <img
          ref={imgRef}
          src={loginBg}
          alt="Transport routier"
          className="absolute inset-0 w-full h-full object-cover scale-[1.08] transition-transform duration-[80ms] ease-out will-change-transform"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-foreground/10" />

        {/* Stats bar */}
        <div
          className={`absolute top-8 left-8 right-8 flex gap-4 transition-all duration-700 delay-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"
          }`}
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="flex-1 rounded-xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-4 text-center"
            >
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary-foreground/80" />
              <p className="text-xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs text-primary-foreground/60">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial carousel */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-10 text-primary-foreground transition-all duration-800 delay-500 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="relative h-[180px]">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                  i === activeSlide
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s < t.stars ? "fill-warning text-warning" : "text-primary-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-lg font-medium leading-relaxed mb-4 italic">
                  « {t.quote} »
                </p>
                <div>
                  <p className="font-semibold text-sm">{t.author}</p>
                  <p className="text-xs text-primary-foreground/60">{t.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-4">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeSlide
                    ? "w-6 bg-primary-foreground"
                    : "w-2 bg-primary-foreground/40 hover:bg-primary-foreground/60"
                }`}
              />
            ))}
          </div>

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
