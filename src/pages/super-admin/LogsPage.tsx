import LogsTab from "@/pages/parametres/LogsTab";
import { Activity } from "lucide-react";

export default function SuperAdminLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Journal d'activité
        </h1>
        <p className="text-sm text-muted-foreground">Toutes les actions critiques effectuées sur la plateforme</p>
      </div>
      <LogsTab />
    </div>
  );
}
