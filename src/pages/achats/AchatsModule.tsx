import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import PlaceholderPage from "@/pages/placeholder/PlaceholderPage";
import FournisseursTab from "./FournisseursTab";

export default function AchatsModule() {
  const { user } = useAuth();
  const canManage = user?.role === "DG" || user?.role === "ACHATS";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achats & Fournisseurs</h1>
        <p className="text-muted-foreground">Gérez les demandes d'achat et le référentiel fournisseurs.</p>
      </div>

      <Tabs defaultValue="fournisseurs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demandes" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />Demandes d'achat
          </TabsTrigger>
          <TabsTrigger value="fournisseurs" className="gap-1.5">
            <Building2 className="h-4 w-4" />Fournisseurs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="demandes">
          <PlaceholderPage title="Demandes d'achat" description="Ce module sera implémenté dans la prochaine phase du workflow maintenance-achats." />
        </TabsContent>
        <TabsContent value="fournisseurs">
          <FournisseursTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
