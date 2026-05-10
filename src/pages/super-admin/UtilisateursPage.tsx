import UtilisateursTab from "@/pages/parametres/UtilisateursTab";
import { Users } from "lucide-react";

export default function SuperAdminUtilisateursPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Gestion des utilisateurs
        </h1>
        <p className="text-sm text-muted-foreground">Créer, modifier les rôles, désactiver et réinitialiser les mots de passe</p>
      </div>
      <UtilisateursTab />
    </div>
  );
}
