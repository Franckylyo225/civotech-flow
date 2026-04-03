import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Wrench, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import VehiculesTab from "./VehiculesTab";
import MaintenanceTab from "./MaintenanceTab";
import ChauffeursTab from "./ChauffeursTab";
import ParcAlerts from "@/components/parc-auto/ParcAlerts";

export default function ParcAutoModule() {
  const { user } = useAuth();
  const canManage = user?.role === "DG" || user?.role === "LOGISTIQUE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion du Parc</h1>
        <p className="text-sm text-muted-foreground mt-1">Véhicules, maintenance et chauffeurs</p>
      </div>

      <Tabs defaultValue="vehicules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicules" className="gap-1.5">
            <Truck className="h-4 w-4" /> Véhicules
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5">
            <Wrench className="h-4 w-4" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="chauffeurs" className="gap-1.5">
            <Users className="h-4 w-4" /> Chauffeurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicules">
          <VehiculesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="chauffeurs">
          <ChauffeursTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
