import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt, Wallet, Building2, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import DecaissementsTab from "./DecaissementsTab";
import FacturesTab from "./FacturesTab";
import TresorerieDashboard from "./TresorerieDashboard";
import TransactionsTab from "./TransactionsTab";
import ComptesTab from "./ComptesTab";

export default function FinanceModule() {
  const { user } = useAuth();
  const isDG = user?.role === "DG";
  const canManage = isDG || user?.role === "FINANCE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Finance & Comptabilité</h1>
        <p className="text-muted-foreground">Gérez la trésorerie, les factures et décaissements.</p>
      </div>

      <Tabs defaultValue="tresorerie" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tresorerie" className="gap-1.5">
            <Wallet className="h-4 w-4" />Trésorerie
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5">
            <ArrowRightLeft className="h-4 w-4" />Transactions
          </TabsTrigger>
          <TabsTrigger value="comptes" className="gap-1.5">
            <Building2 className="h-4 w-4" />Comptes
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5">
            <Receipt className="h-4 w-4" />Factures
          </TabsTrigger>
          <TabsTrigger value="decaissements" className="gap-1.5">
            <CreditCard className="h-4 w-4" />Décaissements
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tresorerie">
          <TresorerieDashboard />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="comptes">
          <ComptesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="factures">
          <FacturesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="decaissements">
          <DecaissementsTab canManage={canManage} isDG={isDG} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
