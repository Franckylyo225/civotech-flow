import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import DecaissementsTab from "./DecaissementsTab";
import FacturesTab from "./FacturesTab";

export default function FinanceModule() {
  const { user } = useAuth();
  const isDG = user?.role === "DG";
  const canManage = isDG || user?.role === "FINANCE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance & Comptabilité</h1>
        <p className="text-muted-foreground">Gérez les factures et décaissements.</p>
      </div>

      <Tabs defaultValue="factures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="factures" className="gap-1.5">
            <Receipt className="h-4 w-4" />Factures
          </TabsTrigger>
          <TabsTrigger value="decaissements" className="gap-1.5">
            <CreditCard className="h-4 w-4" />Décaissements
          </TabsTrigger>
        </TabsList>
        <TabsContent value="factures">
          <FacturesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="decaissements">
          <DecaissementsTab canManage={canManage} isDG={isDG} />
        </TabsContent>
      </Tabs>
    </div>
  );
