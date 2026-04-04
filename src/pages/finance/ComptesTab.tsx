import { useState } from "react";
import { useComptesStore, type CompteRow, type TypeCompte } from "@/hooks/use-tresorerie-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Building2, Banknote, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

function fmt(v: number) { return v.toLocaleString("fr-FR"); }

interface Props { canManage: boolean; }

export default function ComptesTab({ canManage }: Props) {
  const { comptes, loading, create, update } = useComptesStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: "", type: "BANQUE" as TypeCompte, solde: "" });

  const handleCreate = async () => {
    if (!form.nom) return;
    const ok = await create({ nom: form.nom, type: form.type, solde: Number(form.solde) || 0 });
    if (ok) { setShowCreate(false); setForm({ nom: "", type: "BANQUE", solde: "" }); }
  };

  const handleToggle = async (c: CompteRow) => {
    await update(c.id, { actif: !c.actif });
  };

  const startEdit = (c: CompteRow) => {
    setEditId(c.id);
    setForm({ nom: c.nom, type: c.type, solde: "" });
  };

  const handleEdit = async () => {
    if (!editId || !form.nom) return;
    const ok = await update(editId, { nom: form.nom });
    if (ok) { setEditId(null); setForm({ nom: "", type: "BANQUE", solde: "" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Gérez vos comptes bancaires et caisses.</p>
        {canManage && (
          <Button onClick={() => { setForm({ nom: "", type: "BANQUE", solde: "" }); setShowCreate(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />Nouveau compte
          </Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Chargement…</p>
        ) : comptes.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucun compte. Créez votre premier compte.</p>
        ) : comptes.map(c => (
          <Card key={c.id} className={`border border-border shadow-none ${!c.actif ? "opacity-50" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {c.type === "BANQUE" ? <Building2 className="h-5 w-5 text-blue-600" /> : <Banknote className="h-5 w-5 text-amber-600" />}
                  <span className="font-medium text-foreground">{c.nom}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{c.type}{!c.actif && " • Inactif"}</Badge>
              </div>
              <p className="text-2xl font-bold text-foreground mb-3">{fmt(c.solde)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
              {canManage && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => startEdit(c)}>
                    <Pencil className="h-3 w-3" />Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleToggle(c)}>
                    {c.actif ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                    {c.actif ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={v => { if (!v) { setShowCreate(false); setEditId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Modifier le compte" : "Nouveau compte"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du compte</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Banque principale" />
            </div>
            {!editId && (
              <>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TypeCompte }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANQUE">Banque</SelectItem>
                      <SelectItem value="CAISSE">Caisse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Solde initial (FCFA)</Label>
                  <Input type="number" value={form.solde} onChange={e => setForm(f => ({ ...f, solde: e.target.value }))} placeholder="0" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); }}>Annuler</Button>
            <Button onClick={editId ? handleEdit : handleCreate} disabled={!form.nom}>{editId ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
