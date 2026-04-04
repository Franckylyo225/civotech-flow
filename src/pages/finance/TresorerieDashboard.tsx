import { useComptesStore, useTransactionsStore, type TransactionRow } from "@/hooks/use-tresorerie-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Building2, Banknote, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("fr-FR"); }

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  ENCAISSEMENT: { label: "Encaissement", color: "text-emerald-600 bg-emerald-50", icon: TrendingUp },
  DECAISSEMENT: { label: "Décaissement", color: "text-destructive bg-destructive/10", icon: TrendingDown },
  TRANSFERT: { label: "Transfert", color: "text-blue-600 bg-blue-50", icon: ArrowRightLeft },
};

export default function TresorerieDashboard() {
  const { comptes, loading: loadC, soldeBanque, soldeCaisse, soldeTotal } = useComptesStore();
  const { transactions, loading: loadT, totalEntrees, totalSorties } = useTransactionsStore();
  const loading = loadC || loadT;

  const comptesMap: Record<string, string> = {};
  comptes.forEach(c => { comptesMap[c.id] = c.nom; });

  const recent = transactions.slice(0, 10);

  const stats = [
    { label: "Solde total", value: fmt(soldeTotal), unit: "FCFA", icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    { label: "Solde banque", value: fmt(soldeBanque), unit: "FCFA", icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Solde caisse", value: fmt(soldeCaisse), unit: "FCFA", icon: Banknote, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total entrées", value: fmt(totalEntrees), unit: "FCFA", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total sorties", value: fmt(totalSorties), unit: "FCFA", icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(s => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-4">
              <div className={`rounded-lg ${s.bg} p-2 w-fit mb-2`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {loading ? "—" : s.value}
                <span className="text-xs font-normal text-muted-foreground ml-1">{s.unit}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comptes */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {comptes.filter(c => c.actif).map(c => (
          <Card key={c.id} className="border border-border shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{c.nom}</span>
                <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
              </div>
              <p className="text-xl font-bold text-foreground">{fmt(c.solde)} <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dernières transactions */}
      <Card className="border border-border shadow-none">
        <CardHeader><CardTitle className="text-base font-semibold">Dernières transactions</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune transaction</p>
          ) : recent.map((t: TransactionRow) => {
            const cfg = TYPE_CONFIG[t.type];
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className={`rounded-lg p-2 ${cfg.color.split(" ")[1]}`}>
                  <cfg.icon className={`h-4 w-4 ${cfg.color.split(" ")[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.reference}</span>
                    <Badge variant="outline" className={`border-0 text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-foreground truncate">{t.description || "—"}</p>
                  {t.compte_source_id && <span className="text-[10px] text-muted-foreground">De: {comptesMap[t.compte_source_id] || "—"}</span>}
                  {t.compte_destination_id && <span className="text-[10px] text-muted-foreground ml-2">Vers: {comptesMap[t.compte_destination_id] || "—"}</span>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === "ENCAISSEMENT" ? "text-emerald-600" : t.type === "DECAISSEMENT" ? "text-destructive" : "text-blue-600"}`}>
                    {t.type === "ENCAISSEMENT" ? "+" : t.type === "DECAISSEMENT" ? "-" : "↔"} {fmt(t.montant)} FCFA
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.date_transaction}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
