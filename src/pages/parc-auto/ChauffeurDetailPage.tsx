import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, CreditCard, Calendar, Truck, Pencil, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChauffeursStore, STATUT_CHAUFFEUR_CONFIG, type ChauffeurRow } from "@/hooks/use-chauffeurs-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInYears, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface OperationLite {
  id: string; reference: string; lieu_embarquement: string; lieu_livraison: string;
  date_depart: string | null; km_parcourus: number | null; camion_id: string | null; statut: string;
}

export default function ChauffeurDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { chauffeurs, loading } = useChauffeursStore();
  const { camions } = useParcAutoStore();
  const [operations, setOperations] = useState<OperationLite[]>([]);

  const chauffeur: ChauffeurRow | undefined = useMemo(() => chauffeurs.find(c => c.id === id), [chauffeurs, id]);
  const camion = useMemo(() => camions.find(c => c.id === chauffeur?.camion_assigne_id), [camions, chauffeur]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("operations")
        .select("id, reference, lieu_embarquement, lieu_livraison, date_depart, km_parcourus, camion_id, statut")
        .eq("chauffeur_id", id)
        .order("created_at", { ascending: false });
      setOperations((data || []) as OperationLite[]);
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!chauffeur) return (
    <div className="p-6">
      <Button variant="ghost" onClick={() => navigate("/parc-auto")}><ArrowLeft className="h-4 w-4 mr-1.5" />Retour</Button>
      <p className="mt-4 text-muted-foreground">Chauffeur introuvable.</p>
    </div>
  );

  const dateEmb = new Date(chauffeur.created_at);
  const yearsSinceEmb = Math.max(0, differenceInYears(new Date(), dateEmb));
  const years = (chauffeur.experience_annees || 0) + yearsSinceEmb;
  const expLabel = years < 1 ? "< 1 an" : `${years} an${years > 1 ? "s" : ""}`;

  const monthStart = startOfMonth(new Date());
  const opsCeMois = operations.filter(o => o.date_depart && new Date(o.date_depart) >= monthStart).length;
  const kmTotal = operations.reduce((s, o) => s + (o.km_parcourus || 0), 0);
  const opEnCours = operations.find(o => o.statut === "EN_COURS");
  const cfg = STATUT_CHAUFFEUR_CONFIG[chauffeur.statut];
  const camionLabel = (cid: string | null) => camions.find(c => c.id === cid)?.immatriculation || "—";

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parc-auto")}><ArrowLeft className="h-4 w-4 mr-1.5" />Retour au parc</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border shadow-none">
            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold">
                  {chauffeur.prenom[0]}{chauffeur.nom[0]}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{chauffeur.prenom} {chauffeur.nom}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{chauffeur.telephone || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <Info label="Catégorie permis" value={chauffeur.type_permis || "—"} icon={CreditCard} />
                <Info label="N° Permis" value={chauffeur.numero_permis || "—"} />
                <Info label="Expiration permis" value={chauffeur.date_expiration_permis ? format(new Date(chauffeur.date_expiration_permis), "dd/MM/yyyy") : "—"} icon={Calendar} />
                <Info label="Date d'embauche" value={format(dateEmb, "dd/MM/yyyy")} icon={Calendar} />
                <Info label="Expérience" value={expLabel} />
                <Info label="Véhicule assigné" value={camion ? `${camion.immatriculation} — ${camion.marque}` : "—"} icon={Truck} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Historique des missions</CardTitle>
              <Link to="/operations" className="text-xs text-primary hover:underline">Voir toutes</Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Réf.</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Km</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.slice(0, 5).map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-mono">{o.reference}</TableCell>
                      <TableCell className="text-xs"><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{o.lieu_embarquement} → {o.lieu_livraison}</div></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.date_depart ? format(new Date(o.date_depart), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs">{o.km_parcourus ? `${o.km_parcourus.toLocaleString("fr-FR")} km` : "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{camionLabel(o.camion_id)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-0 text-[10px] bg-muted">{o.statut}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {operations.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">Aucune mission</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border shadow-none">
            <CardHeader><CardTitle className="text-base">Statut actuel</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={cn("border-0 text-sm", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>
              {opEnCours && (
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  <p className="font-medium text-foreground mb-1">Mission en cours</p>
                  <p>{opEnCours.reference}</p>
                  <p>{opEnCours.lieu_embarquement} → {opEnCours.lieu_livraison}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-none">
            <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Stat label="Missions réalisées" value={operations.length.toString()} />
              <Stat label="Missions ce mois" value={opsCeMois.toString()} />
              <Stat label="Km total parcouru" value={`${kmTotal.toLocaleString("fr-FR")} km`} />
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" onClick={() => navigate("/parc-auto")}>
            <Pencil className="h-4 w-4 mr-1.5" />Modifier
          </Button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground flex items-center gap-1 mt-0.5">{Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
