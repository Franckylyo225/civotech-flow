import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, Building2, Loader2, Phone, Mail, MapPin, User, TrendingUp, UserPlus, AlertTriangle, Eye, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useClientsStore, type CreateClientData } from "@/hooks/use-clients-store";
import type { Client } from "@/types/devis";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ClientDetailDialog from "./ClientDetailDialog";

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(n) + " FCFA";
}

function ClientFormDialog({
  open, onOpenChange, initialData, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: Client & { conditions_paiement?: string };
  onSave: (data: CreateClientData & { conditions_paiement?: string }) => Promise<boolean>;
}) {
  const [nom, setNom] = useState(initialData?.nom || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [telephone, setTelephone] = useState(initialData?.telephone || "");
  const [adresse, setAdresse] = useState(initialData?.adresse || "");
  const [contact, setContact] = useState(initialData?.contact || "");
  const [conditionsPaiement, setConditionsPaiement] = useState((initialData as any)?.conditions_paiement || "Net 30 jours");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    const ok = await onSave({ nom: nom.trim(), email: email.trim(), telephone: telephone.trim(), adresse: adresse.trim(), contact: contact.trim(), conditions_paiement: conditionsPaiement.trim() });
    setSaving(false);
    if (ok) {
      toast.success(initialData ? "Client modifié" : "Client ajouté");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom / Raison sociale *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: SOTRA" />
          </div>
          <div className="space-y-2">
            <Label>Contact (nom du référent)</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ex: M. Kouassi" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.ci" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+225 XX XX XX XX" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse complète" />
          </div>
          <div className="space-y-2">
            <Label>Conditions de paiement</Label>
            <Select value={conditionsPaiement} onValueChange={setConditionsPaiement}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Net 30 jours">Net 30 jours</SelectItem>
                <SelectItem value="Net 15 jours">Net 15 jours</SelectItem>
                <SelectItem value="Net 60 jours">Net 60 jours</SelectItem>
                <SelectItem value="Comptant">Comptant</SelectItem>
                <SelectItem value="50% avance">50% avance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : initialData ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SortField = "nom" | "ca" | "impayes";
type SortDir = "asc" | "desc";

export default function ClientsModule() {
  const { user } = useAuth();
  const { clients, loading, addClient, updateClient, deleteClient } = useClientsStore();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [sortField, setSortField] = useState<SortField>("nom");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // CA per client from devis VALIDE_CLIENT + impayés from ENVOYE_CLIENT
  const [caByClient, setCaByClient] = useState<Record<string, { ca: number; impayes: number }>>({});

  const canManage = user?.role === "DG" || user?.role === "COMMERCIAL";

  useEffect(() => {
    async function fetchCA() {
      const [valRes, envRes] = await Promise.all([
        supabase.from("devis").select("client_id, montant").eq("statut", "VALIDE_CLIENT"),
        supabase.from("devis").select("client_id, montant").eq("statut", "ENVOYE_CLIENT"),
      ]);
      const map: Record<string, { ca: number; impayes: number }> = {};
      for (const d of valRes.data || []) {
        if (!d.client_id) continue;
        if (!map[d.client_id]) map[d.client_id] = { ca: 0, impayes: 0 };
        map[d.client_id].ca += Number(d.montant || 0);
      }
      for (const d of envRes.data || []) {
        if (!d.client_id) continue;
        if (!map[d.client_id]) map[d.client_id] = { ca: 0, impayes: 0 };
        map[d.client_id].impayes += Number(d.montant || 0);
      }
      setCaByClient(map);
    }
    if (!loading) fetchCA();
  }, [loading]);

  const caTotal = Object.values(caByClient).reduce((s, v) => s + v.ca, 0);
  const impayesTotal = Object.values(caByClient).reduce((s, v) => s + v.impayes, 0);

  const filtered = useMemo(() => {
    let list = clients.filter((c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
    );

    list.sort((a, b) => {
      if (sortField === "nom") {
        return sortDir === "asc" ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom);
      }
      const aData = caByClient[a.id] || { ca: 0, impayes: 0 };
      const bData = caByClient[b.id] || { ca: 0, impayes: 0 };
      const aVal = sortField === "ca" ? aData.ca : aData.impayes;
      const bVal = sortField === "ca" ? bData.ca : bData.impayes;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [clients, search, sortField, sortDir, caByClient]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion des Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client(s) enregistré(s)</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nouveau client</span><span className="sm:hidden">Ajouter</span>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{clients.length}</p>
              <p className="text-xs text-muted-foreground">Total clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{formatFCFA(caTotal)}</p>
              <p className="text-xs text-muted-foreground">CA total réalisé</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{formatFCFA(impayesTotal)}</p>
              <p className="text-xs text-muted-foreground">Impayés total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{clients.length > 0 ? formatFCFA(Math.round(caTotal / clients.length)) : "0 FCFA"}</p>
              <p className="text-xs text-muted-foreground">CA moyen / client</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, contact ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nom")}>
                <span className="flex items-center gap-1">Nom <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("ca")}>
                <span className="flex items-center gap-1">CA réalisé <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("impayes")}>
                <span className="flex items-center gap-1">Impayés <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => {
              const data = caByClient[client.id] || { ca: 0, impayes: 0 };
              return (
                <TableRow key={client.id} className="cursor-pointer" onClick={() => setDetailClient(client)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {client.nom}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.contact ? (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {client.contact}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {client.telephone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {client.telephone}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className={data.ca > 0 ? "font-semibold text-success" : "text-muted-foreground"}>
                      {formatFCFA(data.ca)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={data.impayes > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {formatFCFA(data.impayes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setDetailClient(client)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setEditClient(client)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(client.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail dialog */}
      {detailClient && (
        <ClientDetailDialog
          client={detailClient}
          open={!!detailClient}
          onOpenChange={(v) => { if (!v) setDetailClient(null); }}
        />
      )}

      {/* Create dialog */}
      <ClientFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={addClient}
      />

      {/* Edit dialog */}
      {editClient && (
        <ClientFormDialog
          open={!!editClient}
          onOpenChange={(v) => { if (!v) setEditClient(null); }}
          initialData={editClient}
          onSave={(data) => updateClient(editClient.id, data)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteId) {
                  const ok = await deleteClient(deleteId);
                  if (ok) toast.success("Client supprimé");
                  setDeleteId(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
