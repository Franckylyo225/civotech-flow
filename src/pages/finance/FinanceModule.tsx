import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import PlaceholderPage from "@/pages/placeholder/PlaceholderPage";
import DecaissementsTab from "./DecaissementsTab";

export default function FinanceModule() {
  const { user } = useAuth();
  const isDG = user?.role === "DG";
  const canManage = isDG || user?.role === "FINANCE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance & Comptabilité</h1>
        <p className="text-muted-foreground">Gérez les décaissements, factures et paiements.</p>
      </div>

      <Tabs defaultValue="decaissements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="decaissements" className="gap-1.5">
            <CreditCard className="h-4 w-4" />Décaissements
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5">
            <Receipt className="h-4 w-4" />Factures
          </TabsTrigger>
        </TabsList>
        <TabsContent value="decaissements">
          <DecaissementsTab canManage={canManage} isDG={isDG} />
        </TabsContent>
        <TabsContent value="factures">
          <PlaceholderPage title="Factures" description="Module de facturation à venir." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
