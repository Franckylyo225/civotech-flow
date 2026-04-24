import { useState } from "react";
import { useTransactionsStore, useComptesStore, type TransactionRow, type TypeTransaction } from "@/hooks/use-tresorerie-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { Search, Plus, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

function fmt(v: number) { return v.toLocaleString("fr-FR"); }

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  ENCAISSEMENT: { label: "Encaissement", color: "text-emerald-600 bg-emerald-50" },
  DECAISSEMENT: { label: "Décaissement", color: "text-destructive bg-destructive/10" },
  TRANSFERT: { label: "Transfert", color: "text-blue-600 bg-blue-50" },
};

interface Props { canManage: boolean; }

export default function TransactionsTab({ canManage }: Props) {
  const { transactions, loading, create, fetch } = useTransactionsStore();
  const { comptes, fetch: fetchComptes } = useComptesStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCompte, setFilterCompte] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: "ENCAISSEMENT" as TypeTransaction,
    montant: "",
    date_transaction: new Date().toISOString().slice(0, 10),
    compte_source_id: "",
    compte_destination_id: "",
    description: "",
  });

  const filtered = transactions.filter(t => {
    if (filterType !== "ALL" && t.type !== filterType) return false;
    if (filterCompte !== "ALL" && t.compte_source_id !== filterCompte && t.compte_destination_id !== filterCompte) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.reference.toLowerCase().includes(s) || (t.description || "").toLowerCase().includes(s);
    }
    return true;
  });

  const comptesMap: Record<string, string> = {};
  comptes.forEach(c => { comptesMap[c.id] = c.nom; });

  const handleSubmit = async () => {
    if (!form.montant || Number(form.montant) <= 0) return;
    const ok = await create({
      type: form.type,
      montant: Number(form.montant),
      date_transaction: form.date_transaction,
      compte_source_id: form.compte_source_id || null,
      compte_destination_id: form.compte_destination_id || null,
      description: form.description,
    });
    if (ok) {
      setShowCreate(false);
      setForm({ type: "ENCAISSEMENT", montant: "", date_transaction: new Date().toISOString().slice(0, 10), compte_source_id: "", compte_destination_id: "", description: "" });
      fetchComptes();
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous types</SelectItem>
            <SelectItem value="ENCAISSEMENT">Encaissement</SelectItem>
            <SelectItem value="DECAISSEMENT">Décaissement</SelectItem>
            <SelectItem value="TRANSFERT">Transfert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCompte} onValueChange={setFilterCompte}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous comptes</SelectItem>
            {comptes.filter(c => c.actif).map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />Transaction
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border border-border shadow-none overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune transaction</TableCell></TableRow>
            ) : filtered.map(t => {
              const cfg = TYPE_CONFIG[t.type];
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                  <TableCell className="text-sm">{t.date_transaction}</TableCell>
                  <TableCell><Badge variant="outline" className={`border-0 text-[10px] ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {t.compte_source_id && <span>{comptesMap[t.compte_source_id] || "—"}</span>}
                    {t.type === "TRANSFERT" && " → "}
                    {t.compte_destination_id && t.type === "TRANSFERT" && <span>{comptesMap[t.compte_destination_id] || "—"}</span>}
                    {t.type === "ENCAISSEMENT" && t.compte_destination_id && <span>{comptesMap[t.compte_destination_id] || "—"}</span>}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]">{t.description || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold text-sm ${t.type === "ENCAISSEMENT" ? "text-emerald-600" : t.type === "DECAISSEMENT" ? "text-destructive" : "text-blue-600"}`}>
                    {t.type === "ENCAISSEMENT" ? "+" : t.type === "DECAISSEMENT" ? "-" : "↔"} {fmt(t.montant)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle transaction</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TypeTransaction, compte_source_id: "", compte_destination_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENCAISSEMENT">Encaissement</SelectItem>
                  <SelectItem value="DECAISSEMENT">Décaissement</SelectItem>
                  <SelectItem value="TRANSFERT">Transfert interne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (FCFA)</Label>
              <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date_transaction} onChange={e => setForm(f => ({ ...f, date_transaction: e.target.value }))} />
            </div>
            {(form.type === "DECAISSEMENT" || form.type === "TRANSFERT") && (
              <div>
                <Label>Compte source</Label>
                <Select value={form.compte_source_id} onValueChange={v => setForm(f => ({ ...f, compte_source_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {comptes.filter(c => c.actif).map(c => <SelectItem key={c.id} value={c.id}>{c.nom} ({c.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.type === "ENCAISSEMENT" || form.type === "TRANSFERT") && (
              <div>
                <Label>Compte destination</Label>
                <Select value={form.compte_destination_id} onValueChange={v => setForm(f => ({ ...f, compte_destination_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {comptes.filter(c => c.actif).map(c => <SelectItem key={c.id} value={c.id}>{c.nom} ({c.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.montant || Number(form.montant) <= 0}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
