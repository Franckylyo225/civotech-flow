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
  type LucideIcon,
} from "lucide-react";

export type UserRole = "DG" | "COMMERCIAL" | "LOGISTIQUE" | "FINANCE" | "ACHATS" | "ASSISTANTE";

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
};

export const roleNavItems: Record<UserRole, NavItem[]> = {
  DG: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText },
    { label: "Opérations", path: "/operations", icon: Truck },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Factures", path: "/factures", icon: Receipt },
    { label: "Achats", path: "/achats", icon: ShoppingCart },
    { label: "Parc Auto", path: "/parc-auto", icon: Package },
    { label: "Calendrier", path: "/calendrier", icon: Calendar },
    { label: "Utilisateurs", path: "/utilisateurs", icon: Users },
    { label: "Rapports", path: "/rapports", icon: BarChart3 },
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
    { label: "Parc Auto", path: "/parc-auto", icon: Package },
    { label: "Maintenance", path: "/maintenance", icon: Wrench },
    { label: "Chauffeurs", path: "/chauffeurs", icon: Users },
  ],
  FINANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Factures", path: "/factures", icon: Receipt },
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
};
