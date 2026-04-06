import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import FournisseursTab from "./FournisseursTab";
import DemandesAchatTab from "./DemandesAchatTab";

export default function AchatsModule() {
  const { user } = useAuth();
  const isDG = user?.role === "DG";
  const canManage = isDG || user?.role === "ACHATS" || user?.role === "LOGISTIQUE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Achats & Fournisseurs</h1>
        <p className="text-muted-foreground">Gérez les demandes d'achat, devis fournisseurs et le référentiel.</p>
      </div>

      <Tabs defaultValue="demandes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demandes" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />Demandes d'achat
          </TabsTrigger>
          <TabsTrigger value="fournisseurs" className="gap-1.5">
            <Building2 className="h-4 w-4" />Fournisseurs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="demandes">
          <DemandesAchatTab canManage={canManage} isDG={isDG} />
        </TabsContent>
        <TabsContent value="fournisseurs">
          <FournisseursTab canManage={isDG || user?.role === "ACHATS"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
