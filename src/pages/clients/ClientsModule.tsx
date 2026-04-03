import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Building2, Loader2, Phone, Mail, MapPin, User, TrendingUp, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useClientsStore, type CreateClientData } from "@/hooks/use-clients-store";
import type { Client } from "@/types/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function ClientFormDialog({
  open, onOpenChange, initialData, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: Client;
  onSave: (data: CreateClientData) => Promise<boolean>;
}) {
  const [nom, setNom] = useState(initialData?.nom || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [telephone, setTelephone] = useState(initialData?.telephone || "");
  const [adresse, setAdresse] = useState(initialData?.adresse || "");
  const [contact, setContact] = useState(initialData?.contact || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    const ok = await onSave({ nom: nom.trim(), email: email.trim(), telephone: telephone.trim(), adresse: adresse.trim(), contact: contact.trim() });
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
          <div className="grid grid-cols-2 gap-3">
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

export default function ClientsModule() {
  const { user } = useAuth();
  const { clients, loading, addClient, updateClient, deleteClient } = useClientsStore();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalDevis: 0, totalOperations: 0, caTotal: 0 });

  const canManage = user?.role === "DG" || user?.role === "COMMERCIAL";

  useEffect(() => {
    async function fetchStats() {
      const { supabase } = await import("@/integrations/supabase/client");
      const [devisRes, opsRes] = await Promise.all([
        supabase.from("devis").select("id, montant, client_id"),
        supabase.from("operations").select("id, client_id"),
      ]);
      const devisList = devisRes.data || [];
      const opsList = opsRes.data || [];
      const caTotal = devisList.reduce((s, d) => s + Number(d.montant || 0), 0);
      setStats({ totalDevis: devisList.length, totalOperations: opsList.length, caTotal });
    }
    if (!loading) fetchStats();
  }, [loading]);

  const filtered = clients.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const clientsWithEmail = clients.filter((c) => c.email).length;
  const clientsWithPhone = clients.filter((c) => c.telephone).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Clients</h1>
          <p className="text-muted-foreground">{clients.length} client(s) enregistré(s)</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau client
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
              <p className="text-2xl font-bold text-foreground">{clients.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{stats.totalDevis}</p>
              <p className="text-xs text-muted-foreground">Devis générés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <UserCheck className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clientsWithEmail}</p>
              <p className="text-xs text-muted-foreground">Avec email</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Phone className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clientsWithPhone}</p>
              <p className="text-xs text-muted-foreground">Avec téléphone</p>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Adresse</TableHead>
              {canManage && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
              <TableRow key={client.id}>
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
                  {client.email ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {client.email}
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
                  {client.adresse ? (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{client.adresse}</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditClient(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(client.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
