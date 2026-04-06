import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/types/devis";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone, MapPin, User, TrendingUp, FileText, Truck, CalendarDays, Loader2, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(n) + " FCFA";
}

interface DevisRow {
  id: string;
  reference: string;
  montant: number;
  statut: string;
  created_at: string;
}

interface OperationRow {
  id: string;
  reference: string;
  statut: string;
  lieu_embarquement: string;
  lieu_livraison: string;
  date_depart: string | null;
  montant_devis: number;
}

const STATUT_DEVIS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS_DG: "Soumis DG",
  APPROUVE_DG: "Approuvé DG",
  REFUSE_DG: "Refusé DG",
  ENVOYE_CLIENT: "Envoyé",
  VALIDE_CLIENT: "Validé",
  REFUSE_CLIENT: "Refusé",
  ARCHIVE: "Archivé",
};

const STATUT_OP_LABELS: Record<string, string> = {
  DEMANDE: "Demande",
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ARCHIVEE: "Archivée",
};

function statutColor(s: string) {
  if (s === "VALIDE_CLIENT" || s === "TERMINEE") return "default";
  if (s === "EN_COURS" || s === "ENVOYE_CLIENT" || s === "PLANIFIEE") return "secondary";
  if (s.includes("REFUSE")) return "destructive";
  return "outline";
}

export default function ClientDetailDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client & { conditions_paiement?: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [devisList, setDevisList] = useState<DevisRow[]>([]);
  const [operations, setOperations] = useState<OperationRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from("devis").select("id, reference, montant, statut, created_at").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("operations").select("id, reference, statut, lieu_embarquement, lieu_livraison, date_depart, montant_devis").eq("client_id", client.id).order("created_at", { ascending: false }),
    ]).then(([devRes, opRes]) => {
      setDevisList((devRes.data || []) as DevisRow[]);
      setOperations((opRes.data || []) as OperationRow[]);
      setLoading(false);
    });
  }, [open, client.id]);

  const caValide = devisList.filter((d) => d.statut === "VALIDE_CLIENT").reduce((s, d) => s + Number(d.montant), 0);
  const caEnvoye = devisList.filter((d) => d.statut === "ENVOYE_CLIENT").reduce((s, d) => s + Number(d.montant), 0);
  const nbMissions = operations.length;
  const missionsTerminees = operations.filter((o) => o.statut === "TERMINEE").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {client.nom}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {/* Infos client */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {client.contact && (
                <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{client.contact}</div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{client.email}</div>
              )}
              {client.telephone && (
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{client.telephone}</div>
              )}
              {client.adresse && (
                <div className="flex items-center gap-1.5 col-span-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{client.adresse}</div>
              )}
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                {(client as any).conditions_paiement || "Net 30 jours"}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{formatFCFA(caValide)}</p>
                  <p className="text-xs text-muted-foreground">CA réalisé</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{formatFCFA(caEnvoye)}</p>
                  <p className="text-xs text-muted-foreground">Impayés</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{nbMissions}</p>
                  <p className="text-xs text-muted-foreground">Missions totales</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{missionsTerminees}</p>
                  <p className="text-xs text-muted-foreground">Missions terminées</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Devis */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Devis ({devisList.length})
              </h3>
              {devisList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun devis pour ce client</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devisList.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.reference}</TableCell>
                          <TableCell>{format(new Date(d.created_at), "dd/MM/yyyy", { locale: fr })}</TableCell>
                          <TableCell>{formatFCFA(d.montant)}</TableCell>
                          <TableCell>
                            <Badge variant={statutColor(d.statut)}>{STATUT_DEVIS_LABELS[d.statut] || d.statut}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* Missions / Opérations */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" /> Historique des missions ({operations.length})
              </h3>
              {operations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune mission pour ce client</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Date départ</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.map((op) => (
                        <TableRow key={op.id}>
                          <TableCell className="font-medium">{op.reference}</TableCell>
                          <TableCell className="text-sm">{op.lieu_embarquement} → {op.lieu_livraison}</TableCell>
                          <TableCell>
                            {op.date_depart ? format(new Date(op.date_depart), "dd/MM/yyyy", { locale: fr }) : "—"}
                          </TableCell>
                          <TableCell>{formatFCFA(op.montant_devis)}</TableCell>
                          <TableCell>
                            <Badge variant={statutColor(op.statut)}>{STATUT_OP_LABELS[op.statut] || op.statut}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
