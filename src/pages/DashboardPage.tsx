import { useAuth } from "@/lib/auth-context";
import DashboardDG from "./dashboard/DashboardDG";
import DashboardCommercial from "./dashboard/DashboardCommercial";
import DashboardLogistique from "./dashboard/DashboardLogistique";
import DashboardFinance from "./dashboard/DashboardFinance";
import DashboardAchats from "./dashboard/DashboardAchats";
import DashboardAssistante from "./dashboard/DashboardAssistante";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "COMMERCIAL":
      return <DashboardCommercial />;
    case "LOGISTIQUE":
      return <DashboardLogistique />;
    case "FINANCE":
      return <DashboardFinance />;
    case "ACHATS":
      return <DashboardAchats />;
    case "ASSISTANTE":
      return <DashboardAssistante />;
    case "MAINTENANCE":
      return <DashboardLogistique />;
    case "ADMIN_VENTES":
      return <DashboardCommercial />;
    default:
      // DG, ADMIN, and others
      return <DashboardDG />;
  }
}

