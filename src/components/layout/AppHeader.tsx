import { useState, useRef, useEffect } from "react";
import { Search, LogOut, User, Settings, HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "./NotificationDropdown";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const { results, loading } = useGlobalSearch(search);

  useEffect(() => setSelectedIndex(0), [results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        input?.focus();
        setShowResults(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (path: string) => {
    navigate(path);
    setSearch("");
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].path);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  // Group results by category
  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg">👋</span>
        <span className="text-base text-foreground">
          {getGreeting()}, <span className="font-semibold">{user?.prenom} {user?.nom}</span> !
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            placeholder="Rechercher... (Ctrl+K)"
            className="w-72 pl-9 bg-muted border-0"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
          />
          {showResults && search.trim().length >= 2 && (
            <div className="absolute top-full left-0 w-96 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche en cours...
                </div>
              ) : results.length > 0 ? (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {category}
                    </div>
                    {items.map((item) => {
                      flatIndex++;
                      const idx = flatIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.path)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors",
                            idx === selectedIndex && "bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <span className="font-medium">{item.label}</span>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  Aucun résultat pour "{search}"
                </div>
              )}
            </div>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/aide")}>
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Centre d'aide</TooltipContent>
        </Tooltip>

        <NotificationDropdown />

        {/* User avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              {user?.prenom[0]}{user?.nom[0]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/profil")}>
              <User className="h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/parametres")}>
              <Settings className="h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
