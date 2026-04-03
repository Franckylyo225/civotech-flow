import {
  LayoutDashboard,
  FileText,
  Truck,
  Receipt,
  ShoppingCart,
  Calendar,
  Users,
  Package,
  Wrench,
  BarChart3,
  Bell,
  Wallet,
  Settings,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "DG" | "COMMERCIAL" | "LOGISTIQUE" | "FINANCE" | "ACHATS" | "ASSISTANTE" | "MAINTENANCE" | "ADMIN";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const roleLabels: Record<UserRole, string> = {
  DG: "Direction Générale",
  COMMERCIAL: "Commercial",
  LOGISTIQUE: "Logistique",
  FINANCE: "Finance",
  ACHATS: "Achats",
  ASSISTANTE: "Assistante DG",
  MAINTENANCE: "Maintenance",
  ADMIN: "Administrateur",
};

export const roleNavItems: Record<UserRole, NavItem[]> = {
  DG: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet },
    { label: "Achats", path: "/achats", icon: ShoppingCart },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
    { label: "Calendrier", path: "/calendrier", icon: Calendar },
    { label: "Rapports", path: "/rapports", icon: BarChart3 },
    { label: "Paramètres", path: "/parametres", icon: Settings },
  ],
  COMMERCIAL: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
  ],
  LOGISTIQUE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
  ],
  FINANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet },
    { label: "Paiements", path: "/paiements", icon: BarChart3 },
    { label: "Fournisseurs", path: "/fournisseurs", icon: Users },
  ],
  ACHATS: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Demandes d'achat", path: "/achats", icon: ShoppingCart },
    { label: "Fournisseurs", path: "/fournisseurs", icon: Users },
  ],
  ASSISTANTE: [
    { label: "Calendrier DG", path: "/calendrier", icon: Calendar },
  ],
  MAINTENANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
  ],
  ADMIN: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet },
    { label: "Achats", path: "/achats", icon: ShoppingCart },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
    { label: "Rapports", path: "/rapports", icon: BarChart3 },
    { label: "Paramètres", path: "/parametres", icon: Settings },
  ],
};
