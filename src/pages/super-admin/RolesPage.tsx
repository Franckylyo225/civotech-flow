import RolesTab from "@/pages/parametres/RolesTab";
import { ShieldCheck } from "lucide-react";

export default function SuperAdminRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Rôles & Permissions
        </h1>
        <p className="text-sm text-muted-foreground">Configurer les rôles personnalisés et leurs permissions par module</p>
      </div>
      <RolesTab />
    </div>
  );
}
