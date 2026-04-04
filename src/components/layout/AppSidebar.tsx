import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { roleNavItems, type NavItem } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";
import logoImg from "@/assets/logo-civotech.png";

const PATH_COUNT_CONFIG: Record<string, { key: keyof ReturnType<typeof useSidebarCounts>["counts"]; roles: string[] }> = {
  "/approbations": { key: "approbations", roles: ["DG"] },
  "/devis": { key: "devis", roles: ["DG", "COMMERCIAL"] },
  "/operations": { key: "operations", roles: ["DG", "LOGISTIQUE"] },
  "/factures": { key: "factures", roles: ["DG", "FINANCE"] },
  "/achats": { key: "achats", roles: ["DG", "ACHATS"] },
  "/parc-auto": { key: "parcAuto", roles: ["DG", "LOGISTIQUE", "MAINTENANCE"] },
};

function groupNavItems(items: NavItem[]) {
  const groups: { category: string | null; items: NavItem[] }[] = [];
  let currentCategory: string | null | undefined = undefined;

  for (const item of items) {
    const cat = item.category ?? null;
    if (cat !== currentCategory) {
      groups.push({ category: cat, items: [item] });
      currentCategory = cat;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }
  return groups;
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { counts } = useSidebarCounts();

  if (!user) return null;

  const navItems = roleNavItems[user.role];
  const groups = groupNavItems(navItems);

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    const countConfig = PATH_COUNT_CONFIG[item.path];
    const count = countConfig && countConfig.roles.includes(user.role) ? counts[countConfig.key] : 0;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-muted hover:text-sidebar-heading"
        )}
      >
        <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-sidebar-primary")} />
        <span className="flex-1">{item.label}</span>
        {count > 0 && (
          <span className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            item.path === "/approbations"
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted-foreground/15 text-muted-foreground"
          )}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src={logoImg} alt="Civotech" className="h-8" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.category && (
              <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.category}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {user.prenom[0]}{user.nom[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.prenom} {user.nom}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
