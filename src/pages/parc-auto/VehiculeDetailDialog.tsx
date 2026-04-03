import { useState, useEffect } from "react";
import {
  Truck, Package, Gauge, Calendar, MapPin, User,
  Clock, Wrench, Navigation, ChevronRight, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type CamionRow, STATUT_CAMION_CONFIG } from "@/hooks/use-parc-auto-store";
import { STATUT_MAINTENANCE_CONFIG, TYPE_MAINTENANCE_CONFIG } from "@/hooks/use-maintenances-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OperationRow {
  id: string;
  reference: string;
  client_nom: string;
  lieu_embarquement: string;
  lieu_livraison: string;
  statut: string;
  date_depart: string | null;
  date_livraison_reelle: string | null;
  chauffeur_id: string | null;
}

interface MaintenanceRow {
  id: string;
  type: string;
  description: string;
  pieces_changees: string | null;
  cout_estime: number;
  cout_reel: number | null;
  date_prevue: string;
  date_fin: string | null;
  statut: string;
}

interface ChauffeurMin { id: string; nom: string; prenom: string; }

interface Props {
  camion: CamionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUT_OP_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DEMANDE: { label: "Demande", color: "text-muted-foreground", bgColor: "bg-muted" },
  PLANIFIEE: { label: "Planifiée", color: "text-info", bgColor: "bg-info/10" },
  EN_COURS: { label: "En cours", color: "text-warning", bgColor: "bg-warning/10" },
  TERMINEE: { label: "Terminée", color: "text-success", bgColor: "bg-success/10" },
  ARCHIVEE: { label: "Archivée", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export default function VehiculeDetailDialog({ camion, open, onOpenChange }: Props) {
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [chauffeurs, setChauffeurs] = useState<ChauffeurMin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!camion || !open) return;
    setLoading(true);
    Promise.all([
      supabase.from("operations").select("id, reference, client_nom, lieu_embarquement, lieu_livraison, statut, date_depart, date_livraison_reelle, chauffeur_id")
        .eq("camion_id", camion.id).order("date_depart", { ascending: false }).limit(50),
      supabase.from("maintenances").select("id, type, description, pieces_changees, cout_estime, cout_reel, date_prevue, date_fin, statut")
        .eq("camion_id", camion.id).order("date_prevue", { ascending: false }).limit(50),
      supabase.from("chauffeurs").select("id, nom, prenom"),
    ]).then(([opsRes, maintRes, chaufRes]) => {
      setOperations((opsRes.data || []) as OperationRow[]);
      setMaintenances((maintRes.data || []) as MaintenanceRow[]);
      setChauffeurs((chaufRes.data || []) as ChauffeurMin[]);
      setLoading(false);
    });
  }, [camion, open]);

  if (!camion) return null;

  const cfg = STATUT_CAMION_CONFIG[camion.statut];
  const getChauffeurName = (id: string | null) => {
    if (!id) return "—";
    const c = chauffeurs.find(c => c.id === id);
    return c ? `${c.prenom} ${c.nom}` : "—";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: fr }); } catch { return "—"; }
  };

  const totalCoutMaintenance = maintenances.reduce((s, m) => s + (m.cout_reel || m.cout_estime), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">{camion.immatriculation}</span>
              <p className="text-sm font-normal text-muted-foreground">{camion.marque} {camion.modele}</p>
            </div>
            <Badge variant="outline" className={cn("ml-auto border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Info cards */}
        <div className="grid grid-cols-4 gap-3 mt-2">
          {[
            { icon: Package, label: "Type", value: (camion as any).type_vehicule || "—" },
            { icon: Package, label: "Capacité", value: `${camion.capacite_tonnes} T` },
            { icon: Gauge, label: "Kilométrage", value: `${((camion as any).km_actuel || 0).toLocaleString()} km` },
            { icon: Calendar, label: "Année", value: String(camion.annee) },
          ].map((item, i) => (
            <Card key={i} className="border border-border shadow-none">
              <CardContent className="p-3 flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border shadow-none">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{operations.length}</p>
              <p className="text-xs text-muted-foreground">Missions effectuées</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{maintenances.length}</p>
              <p className="text-xs text-muted-foreground">Interventions</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalCoutMaintenance.toLocaleString()} F</p>
              <p className="text-xs text-muted-foreground">Coût maintenance total</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">Chargement de l'historique...</div>
        ) : (
          <Tabs defaultValue="missions" className="mt-1">
            <TabsList>
              <TabsTrigger value="missions" className="gap-1.5"><Navigation className="h-3.5 w-3.5" />Missions ({operations.length})</TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Maintenance ({maintenances.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="missions">
              <Card className="border border-border shadow-none">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Chauffeur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.map(op => {
                        const opCfg = STATUT_OP_CONFIG[op.statut] || STATUT_OP_CONFIG.DEMANDE;
                        return (
                          <TableRow key={op.id}>
                            <TableCell className="text-sm font-medium text-foreground">{op.reference}</TableCell>
                            <TableCell className="text-sm">{op.client_nom}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{op.lieu_embarquement}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{op.lieu_livraison}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{getChauffeurName(op.chauffeur_id)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(op.date_depart)}</TableCell>
                            <TableCell><Badge variant="outline" className={cn("border-0 text-xs", opCfg.bgColor, opCfg.color)}>{opCfg.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                      {operations.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune mission enregistrée</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
              <Card className="border border-border shadow-none">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Pièces</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Coût</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenances.map(m => {
                        const typeCfg = (TYPE_MAINTENANCE_CONFIG as any)[m.type] || { label: m.type, color: "text-muted-foreground", bgColor: "bg-muted" };
                        const statutCfg = (STATUT_MAINTENANCE_CONFIG as any)[m.statut] || { label: m.statut, color: "text-muted-foreground", bgColor: "bg-muted" };
                        return (
                          <TableRow key={m.id}>
                            <TableCell><Badge variant="outline" className={cn("border-0 text-xs", typeCfg.bgColor, typeCfg.color)}>{typeCfg.label}</Badge></TableCell>
                            <TableCell className="text-sm max-w-[180px] truncate">{m.description}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{m.pieces_changees || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(m.date_prevue)}</TableCell>
                            <TableCell className="text-sm font-medium">{(m.cout_reel || m.cout_estime).toLocaleString()} F</TableCell>
                            <TableCell><Badge variant="outline" className={cn("border-0 text-xs", statutCfg.bgColor, statutCfg.color)}>{statutCfg.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                      {maintenances.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune maintenance enregistrée</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
