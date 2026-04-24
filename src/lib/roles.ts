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
  Megaphone,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "DG" | "COMMERCIAL" | "LOGISTIQUE" | "FINANCE" | "ACHATS" | "ASSISTANTE" | "MAINTENANCE" | "ADMIN_VENTES" | "ADMIN";

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
  ADMIN_VENTES: "Administration des Ventes",
  ADMIN: "Administrateur",
};

export const roleNavItems: Record<UserRole, NavItem[]> = {
  DG: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Calendrier", path: "/calendrier", icon: Calendar },
    { label: "Approbations", path: "/approbations", icon: ClipboardCheck },
    { label: "Devis", path: "/devis", icon: FileText, category: "SERVICES" },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Administration Ventes", path: "/administration-ventes", icon: ClipboardList, category: "SERVICES" },
    { label: "Clients", path: "/clients", icon: Users, category: "SERVICES" },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet, category: "SERVICES" },
    { label: "Achats", path: "/achats", icon: ShoppingCart, category: "SERVICES" },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Rapports", path: "/rapports", icon: BarChart3, category: "GÉNÉRAL" },
    { label: "Paramètres", path: "/parametres", icon: Settings, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  COMMERCIAL: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText, category: "SERVICES" },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Clients", path: "/clients", icon: Users, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  LOGISTIQUE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  FINANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet, category: "SERVICES" },
    { label: "Achats", path: "/achats", icon: ShoppingCart, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  ACHATS: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Demandes d'achat", path: "/achats", icon: ShoppingCart, category: "SERVICES" },
    { label: "Fournisseurs", path: "/fournisseurs", icon: Users, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  ASSISTANTE: [
    { label: "Calendrier DG", path: "/calendrier", icon: Calendar },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  MAINTENANCE: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  ADMIN_VENTES: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Administration Ventes", path: "/administration-ventes", icon: ClipboardList, category: "SERVICES" },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
  ADMIN: [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devis", path: "/devis", icon: FileText, category: "SERVICES" },
    { label: "Opérations", path: "/operations", icon: Truck, category: "SERVICES" },
    { label: "Clients", path: "/clients", icon: Users, category: "SERVICES" },
    { label: "Finance & Comptabilité", path: "/factures", icon: Wallet, category: "SERVICES" },
    { label: "Achats", path: "/achats", icon: ShoppingCart, category: "SERVICES" },
    { label: "Gestion du Parc", path: "/parc-auto", icon: Package, category: "SERVICES" },
    { label: "Annonces", path: "/annonces", icon: Megaphone, category: "GÉNÉRAL" },
    { label: "Rapports", path: "/rapports", icon: BarChart3, category: "GÉNÉRAL" },
    { label: "Paramètres", path: "/parametres", icon: Settings, category: "GÉNÉRAL" },
    { label: "Centre d'aide", path: "/aide", icon: HelpCircle, category: "GÉNÉRAL" },
  ],
};
