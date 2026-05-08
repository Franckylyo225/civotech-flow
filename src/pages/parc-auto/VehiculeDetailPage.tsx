import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { ArrowLeft, Truck, Wrench, Pencil, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useParcAutoStore, STATUT_CAMION_CONFIG, type CamionRow } from "@/hooks/use-parc-auto-store";
import { useChauffeursStore } from "@/hooks/use-chauffeurs-store";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";
import { getDocStatus, pctVieUtile, vieUtileColor } from "@/lib/vehicule-docs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmtFCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const fmtDate = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

const DOC_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ok: { label: "Valide", bg: "#EAF3DE", color: "#27500A" },
  warning: { label: "Bientôt expiré", bg: "#FAEEDA", color: "#633806" },
  expired: { label: "Expiré", bg: "#FCEBEB", color: "#791F1F" },
  missing: { label: "Non renseigné", bg: "#F3F4F6", color: "#6B7280" },
};

export default function VehiculeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { camions, updateCamion, refetch } = useParcAutoStore();
  const { chauffeurs } = useChauffeursStore();
  const { addMaintenance } = useMaintenancesStore();

  const camion = camions.find(c => c.id === id) as CamionRow | undefined;

  const [operations, setOperations] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [depenses, setDepenses] = useState<any[]>([]);
  const [coutMaintenance12m, setCoutMaintenance12m] = useState(0);
  const [renewDoc, setRenewDoc] = useState<null | "date_assurance" | "date_visite_tech" | "date_vignette">(null);
  const [renewDate, setRenewDate] = useState("");
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintForm, setMaintForm] = useState({
    type: "CORRECTIVE" as "PREVENTIVE" | "CORRECTIVE" | "REMPLACEMENT",
    description: "",
    date_prevue: new Date().toISOString().slice(0, 10),
    cout_estime: 0,
  });

  useEffect(() => {
    if (!id) return;
    const since12m = subMonths(new Date(), 12).toISOString();
    Promise.all([
      supabase.from("operations").select("id, reference, client_nom, lieu_embarquement, lieu_livraison, date_depart, chauffeur_id, km_parcourus, statut")
        .eq("camion_id", id).order("date_depart", { ascending: false }).limit(50),
      supabase.from("maintenances").select("id, type, description, date_prevue, date_fin, cout_estime, cout_reel, statut, created_at")
        .eq("camion_id", id).order("date_prevue", { ascending: false }).limit(50),
    ]).then(async ([opsRes, maintRes]) => {
      const ops = opsRes.data || [];
      const maints = (maintRes.data || []) as any[];
      setOperations(ops);
      setMaintenances(maints);

      const opIds = ops.map((o: any) => o.id);
      if (opIds.length > 0) {
        const { data: deps } = await supabase
          .from("depenses")
          .select("id, montant, categorie, date, operation_id")
          .in("operation_id", opIds)
          .gte("date", since12m);
        setDepenses(deps || []);
      } else {
        setDepenses([]);
      }

      const recent = maints.filter(m => new Date(m.created_at) >= new Date(since12m));
      setCoutMaintenance12m(recent.reduce((s, m) => s + Number(m.cout_reel ?? m.cout_estime ?? 0), 0));
    });
  }, [id]);

  if (!camion) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate("/parc-auto")}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <p className="mt-6 text-muted-foreground">Véhicule introuvable.</p>
      </div>
    );
  }

  const cfg = STATUT_CAMION_CONFIG[camion.statut];
  const km = camion.km_actuel || 0;
  const kmMax = camion.km_max || 300000;
  const pct = pctVieUtile(km, kmMax);
  const colors = vieUtileColor(pct);

  const carburant12m = depenses.filter(d => /carburant/i.test(d.categorie || "")).reduce((s, d) => s + Number(d.montant || 0), 0);
  const coutTotalParKm = km > 0 ? (coutMaintenance12m + carburant12m) / km : 0;

  const opEnCours = operations.find(o => o.statut === "EN_COURS");
  const chauffeurAssigne = opEnCours ? chauffeurs.find(c => c.id === opEnCours.chauffeur_id) : null;

  const docs = [
    { key: "date_assurance", label: "Assurance", date: camion.date_assurance },
    { key: "date_visite_tech", label: "Visite technique", date: camion.date_visite_tech },
    { key: "date_vignette", label: "Vignette", date: camion.date_vignette },
  ] as const;

  const handleRenew = async () => {
    if (!renewDoc || !renewDate) return;
    try {
      await updateCamion(camion.id, { [renewDoc]: renewDate } as any);
      toast.success("Document renouvelé");
      setRenewDoc(null); setRenewDate("");
      await refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateMaint = async () => {
    if (!maintForm.description) { toast.error("Description requise"); return; }
    try {
      await addMaintenance({
        camion_id: camion.id,
        type: maintForm.type,
        description: maintForm.description,
        date_prevue: maintForm.date_prevue,
        cout_estime: maintForm.cout_estime,
        cout_reel: null,
        pieces_changees: null,
        date_debut: null, date_fin: null,
        statut: "PLANIFIEE",
        km_declenchement: km || null,
      });
      toast.success("Maintenance créée");
      setMaintOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/parc-auto")}><ArrowLeft className="mr-1.5 h-4 w-4" />Parc auto</Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10"><Truck className="h-4 w-4 text-primary" /></div>
          <h1 className="text-lg font-semibold text-foreground">{camion.immatriculation}</h1>
          <span className="text-sm text-muted-foreground">· {camion.marque} {camion.modele}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Immatriculation</p><p className="font-medium">{camion.immatriculation}</p></div>
              <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{camion.type_vehicule}</p></div>
              <div><p className="text-xs text-muted-foreground">Marque / Modèle</p><p className="font-medium">{camion.marque} {camion.modele}</p></div>
              <div><p className="text-xs text-muted-foreground">Capacité</p><p className="font-medium">{camion.capacite_tonnes} T</p></div>
              <div><p className="text-xs text-muted-foreground">Année</p><p className="font-medium">{camion.annee}</p></div>
              <div><p className="text-xs text-muted-foreground">Date d'ajout</p><p className="font-medium">{fmtDate(camion.date_ajout)}</p></div>
              <div className="col-span-2 sm:col-span-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Kilométrage</span>
                  <span className={cn("font-medium", colors.text)}>{pct}% vie utile</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{new Intl.NumberFormat("fr-FR").format(km)} km</span>
                  <span className="text-muted-foreground">/ {new Intl.NumberFormat("fr-FR").format(kmMax)} km</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-muted">
                  <div className={cn("h-full", colors.bar)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Documents administratifs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {docs.map(d => {
                const s = getDocStatus(d.date);
                const b = DOC_BADGE[s.status];
                return (
                  <div key={d.key} className="flex items-center justify-between border border-border rounded-md p-3">
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">Expire le {fmtDate(d.date)}{s.days !== null && s.status === "warning" ? ` · dans ${s.days}j` : ""}{s.days !== null && s.status === "expired" ? ` · depuis ${Math.abs(s.days)}j` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                      <Button variant="outline" size="sm" onClick={() => { setRenewDoc(d.key as any); setRenewDate(d.date || ""); }}>Renouveler</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">Historique des missions</CardTitle>
              <Link to="/operations" className="text-xs text-primary inline-flex items-center">Voir toutes <ChevronRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Km</TableHead>
                    <TableHead>Chauffeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.slice(0, 5).map(op => {
                    const ch = chauffeurs.find(c => c.id === op.chauffeur_id);
                    return (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm font-medium">{op.reference}</TableCell>
                        <TableCell className="text-sm">{op.client_nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{op.lieu_embarquement} → {op.lieu_livraison}</TableCell>
                        <TableCell className="text-sm">{fmtDate(op.date_depart)}</TableCell>
                        <TableCell className="text-sm">{op.km_parcourus ? `${op.km_parcourus} km` : "—"}</TableCell>
                        <TableCell className="text-sm">{ch ? `${ch.prenom} ${ch.nom}` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {operations.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">Aucune mission</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Historique des maintenances</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.slice(0, 5).map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.description?.slice(0, 60)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(m.date_prevue)}</TableCell>
                      <TableCell className="text-sm">{fmtFCFA(Number(m.cout_reel ?? m.cout_estime ?? 0))}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.statut}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {maintenances.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Aucune maintenance</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-4">
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Statut actuel</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={cn("border-0 text-sm font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>
              <div>
                <p className="text-xs text-muted-foreground">Chauffeur assigné</p>
                <p className="text-sm font-medium">{chauffeurAssigne ? `${chauffeurAssigne.prenom} ${chauffeurAssigne.nom}` : "Aucun"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opération en cours</p>
                <p className="text-sm font-medium">{opEnCours ? `${opEnCours.reference} — ${opEnCours.client_nom}` : "Aucune"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Coûts cumulés (12 mois)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Maintenances</span><span className="font-medium">{fmtFCFA(coutMaintenance12m)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Carburant</span><span className="font-medium">{fmtFCFA(carburant12m)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Coût par km</span><span className="font-semibold text-primary">{fmtFCFA(coutTotalParKm)}</span></div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => setMaintOpen(true)}><Wrench className="mr-2 h-4 w-4" />Demander maintenance</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/parc-auto")}><Pencil className="mr-2 h-4 w-4" />Modifier le véhicule</Button>
        </div>
      </div>

      {/* Renew dialog */}
      <Dialog open={!!renewDoc} onOpenChange={o => { if (!o) setRenewDoc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renouveler le document</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nouvelle date d'expiration</Label>
            <Input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDoc(null)}>Annuler</Button>
            <Button onClick={handleRenew} disabled={!renewDate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick maintenance dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demander une maintenance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={maintForm.type} onChange={e => setMaintForm(f => ({ ...f, type: e.target.value as any }))}>
                <option value="PREVENTIVE">Préventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="REMPLACEMENT">Remplacement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date prévue</Label><Input type="date" value={maintForm.date_prevue} onChange={e => setMaintForm(f => ({ ...f, date_prevue: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Coût estimé</Label><Input type="number" value={maintForm.cout_estime} onChange={e => setMaintForm(f => ({ ...f, cout_estime: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateMaint}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
