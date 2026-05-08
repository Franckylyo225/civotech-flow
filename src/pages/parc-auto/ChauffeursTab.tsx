import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Search, Pencil, Trash2, AlertTriangle, Eye,
  Phone, Truck, CheckCircle2, XCircle, UserX,
} from "lucide-react";
import { useChauffeursStore, STATUT_CHAUFFEUR_CONFIG, type ChauffeurRow, type StatutChauffeur } from "@/hooks/use-chauffeurs-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInDays, differenceInYears } from "date-fns";

// Expérience totale = expérience à l'embauche (stockée dans experience_annees)
// + années écoulées depuis l'ajout du chauffeur (created_at = date d'embauche).
const totalExperience = (experienceEmbauche: number, createdAt: string): number => {
  const base = Math.max(0, experienceEmbauche || 0);
  if (!createdAt) return base;
  const since = Math.max(0, differenceInYears(new Date(), new Date(createdAt)));
  return base + since;
};

const EMPTY_FORM = {
  nom: "", prenom: "", telephone: "", numero_permis: "",
  type_permis: "C", date_expiration_permis: "",
  experience_embauche: 0,
  disponible: true,
  camion_assigne_id: "",
};

interface Props { canManage: boolean; }

export default function ChauffeursTab({ canManage }: Props) {
  const navigate = useNavigate();
  const { chauffeurs, loading, addChauffeur, updateChauffeur, deleteChauffeur } = useChauffeursStore();
  const { camions } = useParcAutoStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutChauffeur | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [highlightConflict, setHighlightConflict] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const getCamion = (id: string | null) => camions.find(c => c.id === id);

  // Détection des conflits : camion assigné à plusieurs chauffeurs
  const conflictsByCamion = useMemo(() => {
    const map = new Map<string, ChauffeurRow[]>();
    chauffeurs.forEach(c => {
      if (!c.camion_assigne_id) return;
      const arr = map.get(c.camion_assigne_id) || [];
      arr.push(c);
      map.set(c.camion_assigne_id, arr);
    });
    const conflicts: { camion_id: string; chauffeurs: ChauffeurRow[] }[] = [];
    map.forEach((arr, camion_id) => { if (arr.length > 1) conflicts.push({ camion_id, chauffeurs: arr }); });
    return conflicts;
  }, [chauffeurs]);

  const conflictChauffeurIds = useMemo(() => {
    const s = new Set<string>();
    conflictsByCamion.forEach(c => c.chauffeurs.forEach(ch => s.add(ch.id)));
    return s;
  }, [conflictsByCamion]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const expirantSoon = chauffeurs.filter(c => {
      if (!c.date_expiration_permis) return false;
      const days = differenceInDays(new Date(c.date_expiration_permis), now);
      return days >= 0 && days <= 60;
    }).length;
    return {
      total: chauffeurs.length,
      disponible: chauffeurs.filter(c => c.statut === "DISPONIBLE").length,
      enMission: chauffeurs.filter(c => c.statut === "EN_MISSION").length,
      permisExpirant: expirantSoon,
      sansVehicule: chauffeurs.filter(c => !c.camion_assigne_id).length,
    };
  }, [chauffeurs]);

  const filtered = chauffeurs.filter(c => {
    const matchSearch = `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      (c.telephone || "").includes(search);
    const matchStatut = filterStatut === "ALL" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const pagination = usePagination(filtered, 25, [search, filterStatut]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (c: ChauffeurRow) => {
    setEditingId(c.id);
    setForm({
      nom: c.nom, prenom: c.prenom, telephone: c.telephone || "",
      numero_permis: c.numero_permis || "",
      type_permis: c.type_permis || "C",
      date_expiration_permis: c.date_expiration_permis || "",
      experience_embauche: c.experience_annees || 0,
      disponible: c.disponible,
      camion_assigne_id: c.camion_assigne_id || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nom || !form.prenom) { toast.error("Nom et prénom obligatoires"); return; }
    if (form.experience_embauche < 0) { toast.error("Expérience invalide"); return; }
    if (!form.date_expiration_permis) { toast.error("Date d'expiration du permis obligatoire"); return; }
    // Vérification conflit côté frontend
    if (form.camion_assigne_id) {
      const conflict = chauffeurs.find(c => c.camion_assigne_id === form.camion_assigne_id && c.id !== editingId);
      if (conflict) {
        toast.error(`Ce camion est déjà assigné à ${conflict.prenom} ${conflict.nom}`);
        return;
      }
    }
    try {
      const { experience_embauche, ...rest } = form;
      const payload: any = {
        ...rest,
        experience_annees: Math.max(0, Math.floor(experience_embauche || 0)),
      };
      if (!payload.camion_assigne_id) payload.camion_assigne_id = null;
      if (!payload.date_expiration_permis) payload.date_expiration_permis = null;
      if (editingId) {
        await updateChauffeur(editingId, payload);
        toast.success("Chauffeur mis à jour");
      } else {
        await addChauffeur(payload);
        toast.success("Chauffeur ajouté");
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteChauffeur(id); toast.success("Chauffeur supprimé"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleAssignCamion = async (chauffeur_id: string, camion_id: string) => {
    const conflict = chauffeurs.find(c => c.camion_assigne_id === camion_id && c.id !== chauffeur_id);
    if (conflict) {
      toast.error(`Ce camion est déjà assigné à ${conflict.prenom} ${conflict.nom}`);
      return;
    }
    try {
      await updateChauffeur(chauffeur_id, { camion_assigne_id: camion_id });
      toast.success("Camion assigné");
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  };

  const scrollToConflicts = () => {
    setHighlightConflict(true);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => setHighlightConflict(false), 3000);
  };

  // Permis chip
  const renderPermisExp = (date: string | null) => {
    if (!date) return <span className="text-xs text-muted-foreground">—</span>;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return <div className="flex items-center gap-1 text-xs" style={{ color: "#A32D2D" }}><XCircle className="h-3.5 w-3.5" />EXPIRÉE</div>;
    if (days < 30) return <div className="flex items-center gap-1 text-xs" style={{ color: "#A32D2D" }}><AlertTriangle className="h-3.5 w-3.5" />expire {days}j</div>;
    if (days <= 60) return <div className="flex items-center gap-1 text-xs" style={{ color: "#BA7517" }}><AlertTriangle className="h-3.5 w-3.5" />expire {days}j</div>;
    return <div className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />{format(new Date(date), "MM/yyyy")}</div>;
  };

  const renderExperience = (c: ChauffeurRow) => {
    const years = totalExperience(c.experience_annees, c.created_at);
    if (years < 1) return "< 1 an";
    return `${years} an${years > 1 ? "s" : ""}`;
  };

  // Camions disponibles pour le formulaire
  const availableCamionsForForm = useMemo(() => {
    const assignedIds = new Set(chauffeurs.filter(c => c.id !== editingId && c.camion_assigne_id).map(c => c.camion_assigne_id!));
    return camions.filter(c => !assignedIds.has(c.id));
  }, [camions, chauffeurs, editingId]);

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-border shadow-none"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{kpis.total}</p><p className="text-xs text-muted-foreground">Total chauffeurs</p></div>
        </CardContent></Card>
        <Card className="border border-border shadow-none"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
          <div><p className="text-2xl font-bold text-foreground">{kpis.disponible}</p><p className="text-xs text-muted-foreground">Disponibles</p></div>
        </CardContent></Card>
        <Card className="border border-border shadow-none"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10"><Truck className="h-5 w-5 text-info" /></div>
          <div><p className="text-2xl font-bold text-foreground">{kpis.enMission}</p><p className="text-xs text-muted-foreground">En mission</p></div>
        </CardContent></Card>
        <Card className="border border-border shadow-none"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div>
          <div>
            <p className="text-2xl font-bold" style={{ color: kpis.permisExpirant > 0 ? "#BA7517" : undefined }}>{kpis.permisExpirant}</p>
            <p className="text-xs text-muted-foreground">Permis expirant</p>
            <p className="text-[10px] text-muted-foreground">dans 60 jours</p>
          </div>
        </CardContent></Card>
        <Card className="border border-border shadow-none"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10"><UserX className="h-5 w-5 text-warning" /></div>
          <div>
            <p className="text-2xl font-bold" style={{ color: kpis.sansVehicule > 0 ? "#BA7517" : undefined }}>{kpis.sansVehicule}</p>
            <p className="text-xs text-muted-foreground">Sans véhicule</p>
            <p className="text-[10px] text-muted-foreground">à affecter</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Bannière conflits */}
      {conflictsByCamion.length > 0 && (
        <div className="rounded-lg border p-4 flex items-start gap-3" style={{ backgroundColor: "#FCEBEB", borderColor: "#F09595" }}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#A32D2D" }} />
          <div className="flex-1 space-y-1">
            {conflictsByCamion.map(conf => {
              const cam = getCamion(conf.camion_id);
              const noms = conf.chauffeurs.map(ch => ch.prenom).join(" et ");
              return (
                <p key={conf.camion_id} className="text-sm" style={{ color: "#791F1F" }}>
                  <strong>Conflit d'affectation détecté</strong> — {cam?.immatriculation || "véhicule"} est assigné à {conf.chauffeurs.length} chauffeurs ({noms}). Veuillez corriger.
                </p>
              );
            })}
          </div>
          <Button size="sm" variant="outline" onClick={scrollToConflicts} style={{ borderColor: "#F09595", color: "#791F1F" }}>Corriger</Button>
        </div>
      )}

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
                <SelectTrigger className="flex-1 sm:w-[160px]"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="EN_MISSION">En mission</SelectItem>
                  <SelectItem value="EN_REPOS">En repos</SelectItem>
                  <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
                </SelectContent>
              </Select>
              {canManage && <Button onClick={openAdd} className="shrink-0"><Plus className="mr-1.5 h-4 w-4" />Ajouter</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div ref={tableRef}>
      <Card className="border border-border shadow-none overflow-x-auto">
        <CardContent className="p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Permis N°</TableHead>
                <TableHead>Exp. permis</TableHead>
                <TableHead>Expérience</TableHead>
                <TableHead>Véhicule assigné</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(c => {
                const cfg = STATUT_CHAUFFEUR_CONFIG[c.statut];
                const camion = getCamion(c.camion_assigne_id);
                const inConflict = conflictChauffeurIds.has(c.id);
                const dateEmb = new Date(c.created_at);
                return (
                  <TableRow
                    key={c.id}
                    style={inConflict ? { backgroundColor: highlightConflict ? "#FECACA" : "#FEF2F2", transition: "background-color 0.5s" } : undefined}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {c.prenom[0]}{c.nom[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                          {inConflict ? (
                            <p className="text-[10px]" style={{ color: "#A32D2D" }}>Conflit d'affectation</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Depuis {format(dateEmb, "dd/MM/yyyy")}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.telephone ? (
                        <div className="flex items-center gap-1 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.telephone}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono">{c.numero_permis || "—"}</span>
                        {c.type_permis && <Badge variant="outline" className="border-0 text-[10px] bg-muted text-muted-foreground">{c.type_permis}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{renderPermisExp(c.date_expiration_permis)}</TableCell>
                    <TableCell className="text-sm">{renderExperience(c)}</TableCell>
                    <TableCell className="text-sm">
                      {camion ? (
                        inConflict ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium" style={{ color: "#A32D2D" }}>{camion.immatriculation}</span>
                            <Badge variant="outline" className="border-0 text-[10px] gap-1" style={{ backgroundColor: "#FCEBEB", color: "#791F1F" }}>
                              <AlertTriangle className="h-3 w-3" />Conflit
                            </Badge>
                          </div>
                        ) : (
                          <span className="font-medium">{camion.immatriculation}</span>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#BA7517" }}>— non assigné</span>
                          {canManage && (
                            <Select value="" onValueChange={(v) => handleAssignCamion(c.id, v)}>
                              <SelectTrigger className="h-7 px-2 text-xs w-auto border-primary/30 text-primary gap-1">
                                <span>Assigner</span>
                              </SelectTrigger>
                              <SelectContent>
                                {availableCamionsForForm.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucun camion libre</div>}
                                {availableCamionsForForm.map(cam => (
                                  <SelectItem key={cam.id} value={cam.id}>{cam.immatriculation} — {cam.marque}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chauffeurs/${c.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">Aucun chauffeur trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            startIdx={pagination.startIdx}
            endIdx={pagination.endIdx}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="chauffeurs"
          />
        </CardContent>
      </Card>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le chauffeur" : "Ajouter un chauffeur"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom *</Label><Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date d'embauche *</Label><Input type="date" value={form.date_embauche} onChange={e => setForm(f => ({ ...f, date_embauche: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>N° Permis</Label><Input value={form.numero_permis} onChange={e => setForm(f => ({ ...f, numero_permis: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Catégorie permis *</Label>
                <Select value={form.type_permis} onValueChange={v => setForm(f => ({ ...f, type_permis: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["B", "C", "CE", "Autre"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Expiration permis *</Label><Input type="date" value={form.date_expiration_permis} onChange={e => setForm(f => ({ ...f, date_expiration_permis: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Véhicule assigné</Label>
              <Select value={form.camion_assigne_id || "none"} onValueChange={v => setForm(f => ({ ...f, camion_assigne_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {availableCamionsForForm.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.immatriculation} — {c.marque} {c.modele}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Seuls les camions sans chauffeur sont listés.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce chauffeur ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
