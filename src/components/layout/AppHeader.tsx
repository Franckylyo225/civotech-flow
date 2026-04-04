import { useState, useRef, useEffect, useMemo } from "react";
import { Search, LogOut, User, Settings, HelpCircle } from "lucide-react";
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
import { roleNavItems, type UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(() => {
    const role = (user?.role as UserRole) || "DG";
    return roleNavItems[role] || [];
  }, [user?.role]);

  const results = useMemo(() => {
    if (!search.trim()) return navItems;
    const q = search.toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [search, navItems]);

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

  const handleSelect = (path: string) => {
    navigate(path);
    setSearch("");
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            placeholder="Rechercher..."
            className="w-64 pl-9 bg-muted border-0"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
          />
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
              {results.length > 0 ? results.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors",
                      i === selectedIndex && "bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                    {item.category && (
                      <span className="ml-auto text-[10px] text-muted-foreground">{item.category}</span>
                    )}
                  </button>
                );
              }) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">Aucun résultat</div>
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
