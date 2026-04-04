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
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "DG" | "COMMERCIAL" | "LOGISTIQUE" | "FINANCE" | "ACHATS" | "ASSISTANTE" | "MAINTENANCE" | "ADMIN";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  category?: string;
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
    { label: "Approbations", path: "/approbations", icon: ClipboardCheck },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet },
    { label: "Achats", path: "/achats", icon: ShoppingCart },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
    { label: "Calendrier", path: "/calendrier", icon: Calendar },
    { label: "Rapports", path: "/rapports", icon: BarChart3 },
    { label: "Paramètres", path: "/parametres", icon: Settings },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  COMMERCIAL: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  LOGISTIQUE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  FINANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet },
    { label: "Achats", path: "/achats", icon: ShoppingCart },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  ACHATS: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Demandes d'achat", path: "/achats", icon: ShoppingCart },
    { label: "Fournisseurs", path: "/fournisseurs", icon: Users },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  ASSISTANTE: [
    { label: "Calendrier DG", path: "/calendrier", icon: Calendar },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
  MAINTENANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
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
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle },
  ],
};
