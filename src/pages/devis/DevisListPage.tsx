import { useState } from "react";
import { Plus, LayoutGrid, List, Search, Filter, Send, CheckCircle2, XCircle, Mail, UserCheck, Eye, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Devis, DevisStatut } from "@/types/devis";
import { DEVIS_STATUT_CONFIG, formatMontant, formatDate } from "@/types/devis";
import { DevisStatutBadge } from "@/components/devis/DevisStatutBadge";
import { DevisProgressBar, DevisProgressLabel } from "@/components/devis/DevisProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DevisListPageProps {
  devisList: Devis[];
  onSelectDevis: (id: string) => void;
  onNewDevis: () => void;
  onQuickAction?: (devisId: string, statut: DevisStatut) => void;
}

function getQuickActions(statut: DevisStatut, role?: string) {
  const actions: { label: string; icon: React.ReactNode; statut: DevisStatut; variant?: "default" | "outline" | "destructive" }[] = [];
  const isCommOrDG = role === "COMMERCIAL" || role === "DG";

  if (isCommOrDG && statut === "BROUILLON") {
    actions.push({ label: "Soumettre", icon: <Send className="h-3.5 w-3.5" />, statut: "SOUMIS_DG" });
  }
  if (role === "DG" && statut === "SOUMIS_DG") {
    actions.push({ label: "Approuver", icon: <CheckCircle2 className="h-3.5 w-3.5" />, statut: "APPROUVE_DG" });
  }
  if (isCommOrDG && statut === "APPROUVE_DG") {
    actions.push({ label: "Envoyer", icon: <Mail className="h-3.5 w-3.5" />, statut: "ENVOYE_CLIENT" });
  }
  if (isCommOrDG && statut === "ENVOYE_CLIENT") {
    actions.push({ label: "Validé", icon: <UserCheck className="h-3.5 w-3.5" />, statut: "VALIDE_CLIENT" });
  }
  return actions;
}

export default function DevisListPage({ devisList, onSelectDevis, onNewDevis, onQuickAction }: DevisListPageProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("ALL");

  const filtered = devisList.filter((d) => {
    const matchSearch =
      d.reference.toLowerCase().includes(search.toLowerCase()) ||
      (d.client?.nom || "").toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === "ALL" || d.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const totalCA = filtered.reduce((s, d) => s + d.montantTotal, 0);
  const isCommercialOrDG = user?.role === "COMMERCIAL" || user?.role === "DG";

  // Stats
  const stats = {
    total: devisList.length,
    brouillon: devisList.filter(d => d.statut === "BROUILLON").length,
    enCours: devisList.filter(d => ["SOUMIS_DG", "APPROUVE_DG", "ENVOYE_CLIENT"].includes(d.statut)).length,
    valides: devisList.filter(d => d.statut === "VALIDE_CLIENT").length,
    refuses: devisList.filter(d => d.statut === "REFUSE_DG" || d.statut === "REFUSE_CLIENT").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Devis</h1>
          <p className="text-muted-foreground">
            {filtered.length} devis · {formatMontant(totalCA)} au total
          </p>
        </div>
        {isCommercialOrDG && (
          <Button onClick={onNewDevis}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau devis
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Brouillons", value: stats.brouillon, color: "text-muted-foreground" },
          { label: "En cours", value: stats.enCours, color: "text-primary" },
          { label: "Validés", value: stats.valides, color: "text-success" },
          { label: "Refusés", value: stats.refuses, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(DEVIS_STATUT_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid view */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((devis) => {
            const actions = getQuickActions(devis.statut, user?.role);
            return (
              <Card key={devis.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{devis.reference}</p>
                      <p className="font-semibold text-foreground mt-0.5 truncate">{devis.client?.nom || "—"}</p>
                    </div>
                    <DevisStatutBadge statut={devis.statut} />
                  </div>

                  <div>
                    <DevisProgressBar statut={devis.statut} />
                    <div className="mt-1">
                      <DevisProgressLabel statut={devis.statut} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">{formatMontant(devis.montantTotal)}</p>
                    <p className="text-xs text-muted-foreground">{devis.lignes.length} ligne(s)</p>
                  </div>

                  <p className="text-xs text-muted-foreground">{formatDate(devis.createdAt)}</p>

                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onSelectDevis(devis.id)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Voir
                    </Button>
                    {actions.length > 0 && onQuickAction && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAction(devis.id, actions[0].statut);
                        }}
                      >
                        {actions[0].icon}
                        <span className="ml-1.5">{actions[0].label}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Aucun devis ne correspond à vos critères
            </div>
          )}
        </div>
      ) : (
        /* Table view */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Lignes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((devis) => {
                const actions = getQuickActions(devis.statut, user?.role);
                return (
                  <TableRow key={devis.id}>
                    <TableCell className="font-mono text-sm">{devis.reference}</TableCell>
                    <TableCell className="font-medium">{devis.client?.nom || "—"}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <DevisProgressBar statut={devis.statut} />
                      <DevisProgressLabel statut={devis.statut} />
                    </TableCell>
                    <TableCell className="font-semibold text-primary">{formatMontant(devis.montantTotal)}</TableCell>
                    <TableCell>{devis.lignes.length}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(devis.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelectDevis(devis.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {actions.length > 0 && onQuickAction && (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => onQuickAction(devis.id, actions[0].statut)}
                          >
                            {actions[0].icon}
                            <span className="ml-1">{actions[0].label}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun devis ne correspond à vos critères
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
