import { useMemo, useState } from "react";
import { Plus, Send, Check, X, Trash2, FileText, Download, Eye, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useStockBureauStore,
  STOCK_BUREAU_STATUT_CONFIG,
  STOCK_BUREAU_CATEGORIES,
  STOCK_BUREAU_URGENCES,
  type StockBureauRow,
  type StockBureauCategorie,
  type StockBureauStatut,
} from "@/hooks/use-stock-bureau-store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR");
}

export default function StockBureauPage() {
  const { user } = useAuth();
  const { items, loading, create, submit, validate, reject, remove, getJustificatifUrl } =
    useStockBureauStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<StockBureauRow | null>(null);
  const [validateItem, setValidateItem] = useState<StockBureauRow | null>(null);
  const [rejectItem, setRejectItem] = useState<StockBureauRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockBureauRow | null>(null);
  const [statutFilter, setStatutFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isDG = user?.role === "DG";
  const isAssistante = user?.role === "ASSISTANTE";

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const debut = dateDebut ? new Date(dateDebut + "T00:00:00") : null;
    const fin = dateFin ? new Date(dateFin + "T23:59:59") : null;
    return items.filter((i) => {
      if (statutFilter !== "ALL" && i.statut !== statutFilter) return false;
      if (term) {
        const hay = `${i.designation} ${i.reference}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (debut || fin) {
        const d = new Date(i.created_at);
        if (debut && d < debut) return false;
        if (fin && d > fin) return false;
      }
      return true;
    });
  }, [items, statutFilter, searchTerm, dateDebut, dateFin]);

  const resetFilters = () => {
    setStatutFilter("ALL");
    setSearchTerm("");
    setDateDebut("");
    setDateFin("");
    setPage(1);
  };

  const hasActiveFilters = statutFilter !== "ALL" || searchTerm || dateDebut || dateFin;

  // Reset page when filters or page size change
  useMemo(() => { setPage(1); }, [statutFilter, searchTerm, dateDebut, dateFin, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

  const stats = useMemo(() => ({
    total: items.length,
    enAttente: items.filter((i) => i.statut === "SOUMISE_DG").length,
    validees: items.filter((i) => i.statut === "VALIDEE_DG").length,
    payees: items.filter((i) => i.statut === "PAYEE").length,
    montantTotal: items
      .filter((i) => i.statut !== "REFUSEE_DG" && i.statut !== "BROUILLON")
      .reduce((s, i) => s + Number(i.montant), 0),
  }), [items]);

  const openJustificatif = async (path: string) => {
    const url = await getJustificatifUrl(path);
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Bureau</h1>
          <p className="text-sm text-muted-foreground">
            Demandes d'approvisionnement bureautique et petites dépenses
          </p>
        </div>
        {(isAssistante || isDG) && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle demande
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="En attente DG" value={stats.enAttente.toString()} accent="warning" />
        <StatCard label="Validées" value={stats.validees.toString()} accent="primary" />
        <StatCard label="Payées" value={stats.payees.toString()} accent="success" />
        <StatCard label="Montant engagé" value={formatFCFA(stats.montantTotal)} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Désignation ou référence (SB-2026-0001)…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Du</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Au</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous statuts</SelectItem>
                {Object.entries(STOCK_BUREAU_STATUT_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {filtered.length} demande{filtered.length > 1 ? "s" : ""} {hasActiveFilters && `(sur ${items.length})`}
        </p>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Qté</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Urgence</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucune demande</TableCell></TableRow>
            ) : filtered.map((it) => {
              const cfg = STOCK_BUREAU_STATUT_CONFIG[it.statut];
              return (
                <TableRow key={it.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{it.reference}</TableCell>
                  <TableCell className="font-medium">{it.designation}</TableCell>
                  <TableCell className="text-sm">
                    {STOCK_BUREAU_CATEGORIES.find((c) => c.value === it.categorie)?.label}
                  </TableCell>
                  <TableCell>{it.quantite}</TableCell>
                  <TableCell className="font-medium">{formatFCFA(Number(it.montant))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{it.urgence}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(it.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailItem(it)} title="Détails">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAssistante && it.statut === "BROUILLON" && it.created_by === user?.id && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => submit(it.id)} title="Soumettre au DG">
                            <Send className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteItem(it)} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {isDG && it.statut === "SOUMISE_DG" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setValidateItem(it)} title="Valider">
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setRejectItem(it)} title="Refuser">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={create} />

      {/* Détails */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.reference}</DialogTitle>
                <DialogDescription>{detailItem.designation}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Catégorie" value={STOCK_BUREAU_CATEGORIES.find((c) => c.value === detailItem.categorie)?.label || ""} />
                <Field label="Urgence" value={detailItem.urgence} />
                <Field label="Quantité" value={detailItem.quantite.toString()} />
                <Field label="Montant" value={formatFCFA(Number(detailItem.montant))} />
                <Field label="Statut" value={STOCK_BUREAU_STATUT_CONFIG[detailItem.statut].label} />
                <Field label="Créée le" value={formatDate(detailItem.created_at)} />
              </div>
              {detailItem.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{detailItem.description}</p>
                </div>
              )}
              {detailItem.commentaire_dg && (
                <div>
                  <Label className="text-xs text-muted-foreground">Commentaire DG</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{detailItem.commentaire_dg}</p>
                </div>
              )}
              {detailItem.justificatif_url && (
                <Button variant="outline" size="sm" onClick={() => openJustificatif(detailItem.justificatif_url!)}>
                  <Download className="mr-2 h-4 w-4" /> Voir le justificatif
                </Button>
              )}
              {detailItem.decaissement_id && (
                <p className="text-xs text-muted-foreground">
                  Décaissement lié : <span className="font-mono">{detailItem.decaissement_id.slice(0, 8)}…</span>
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Valider */}
      <AlertDialog open={!!validateItem} onOpenChange={(o) => !o && setValidateItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider la demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un décaissement en attente de paiement sera automatiquement créé pour {validateItem && formatFCFA(Number(validateItem.montant))}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (validateItem) { await validate(validateItem.id); setValidateItem(null); } }}>
              Valider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refuser */}
      <RejectDialog item={rejectItem} onClose={() => setRejectItem(null)} onReject={reject} />

      {/* Supprimer */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteItem) { await remove(deleteItem.id); setDeleteItem(null); } }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "primary" | "warning" | "success" }) {
  const colorMap = {
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
  };
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", accent && colorMap[accent])}>{value}</p>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function CreateDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate: ReturnType<typeof useStockBureauStore>["create"];
}) {
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<StockBureauCategorie>("BUREAUTIQUE");
  const [urgence, setUrgence] = useState("NORMALE");
  const [quantite, setQuantite] = useState(1);
  const [montant, setMontant] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDesignation(""); setDescription(""); setCategorie("BUREAUTIQUE");
    setUrgence("NORMALE"); setQuantite(1); setMontant(0); setFile(null);
  };

  const handle = async (submit: boolean) => {
    if (!designation.trim() || montant <= 0) return;
    setSubmitting(true);
    const ok = await onCreate({ designation, description, categorie, urgence, quantite, montant, file, submit });
    setSubmitting(false);
    if (ok) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle demande Stock Bureau</DialogTitle>
          <DialogDescription>Approvisionnement bureautique ou petite dépense</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Désignation *</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex: Ramettes papier A4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie *</Label>
              <Select value={categorie} onValueChange={(v) => setCategorie(v as StockBureauCategorie)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_BUREAU_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgence</Label>
              <Select value={urgence} onValueChange={setUrgence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_BUREAU_URGENCES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantité *</Label>
              <Input type="number" min="1" value={quantite} onChange={(e) => setQuantite(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Montant total (FCFA) *</Label>
              <Input type="number" min="0" value={montant} onChange={(e) => setMontant(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails, fournisseur suggéré, etc." rows={3} />
          </div>
          <div>
            <Label>Justificatif (devis, photo…)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><FileText className="h-3 w-3" />{file.name}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handle(false)} disabled={submitting || !designation.trim() || montant <= 0}>
            Enregistrer brouillon
          </Button>
          <Button onClick={() => handle(true)} disabled={submitting || !designation.trim() || montant <= 0}>
            <Send className="mr-2 h-4 w-4" /> Soumettre au DG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  item, onClose, onReject,
}: {
  item: StockBureauRow | null;
  onClose: () => void;
  onReject: ReturnType<typeof useStockBureauStore>["reject"];
}) {
  const [comment, setComment] = useState("");
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { setComment(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
          <DialogDescription>Indiquez le motif du refus.</DialogDescription>
        </DialogHeader>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Motif du refus..." rows={4} />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setComment(""); onClose(); }}>Annuler</Button>
          <Button
            variant="destructive"
            disabled={!comment.trim()}
            onClick={async () => { if (item) { await onReject(item.id, comment); setComment(""); onClose(); } }}
          >
            Refuser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
