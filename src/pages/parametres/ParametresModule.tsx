import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Users, Shield, Activity, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import EntrepriseTab from "./EntrepriseTab";
import UtilisateursTab from "./UtilisateursTab";
import RolesTab from "./RolesTab";
import LogsTab from "./LogsTab";
import AdminDashboardTab from "./AdminDashboardTab";

export default function ParametresModule() {
  const { user } = useAuth();
  const isDGorAdmin = user?.role === "DG";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">Configuration de l'entreprise, utilisateurs et sécurité</p>
      </div>

      <Tabs defaultValue={isDGorAdmin ? "admin" : "entreprise"} className="space-y-4">
        <TabsList>
          {isDGorAdmin && (
            <TabsTrigger value="admin" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
          )}
          <TabsTrigger value="entreprise" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Entreprise
          </TabsTrigger>
          {isDGorAdmin && (
            <TabsTrigger value="utilisateurs" className="gap-1.5">
              <Users className="h-4 w-4" /> Utilisateurs
            </TabsTrigger>
          )}
          {isDGorAdmin && (
            <TabsTrigger value="roles" className="gap-1.5">
              <Shield className="h-4 w-4" /> Rôles & Permissions
            </TabsTrigger>
          )}
          {isDGorAdmin && (
            <TabsTrigger value="logs" className="gap-1.5">
              <Activity className="h-4 w-4" /> Journal d'activité
            </TabsTrigger>
          )}
        </TabsList>

        {isDGorAdmin && (
          <TabsContent value="admin">
            <AdminDashboardTab />
          </TabsContent>
        )}
        <TabsContent value="entreprise">
          <EntrepriseTab canEdit={isDGorAdmin} />
        </TabsContent>
        {isDGorAdmin && (
          <TabsContent value="utilisateurs">
            <UtilisateursTab />
          </TabsContent>
        )}
        {isDGorAdmin && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}
        {isDGorAdmin && (
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
