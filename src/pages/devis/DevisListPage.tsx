import { useState } from "react";
import { Plus, LayoutGrid, List, Search, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Devis } from "@/types/devis";
import { DEVIS_STATUT_CONFIG, formatMontant, formatDate } from "@/types/devis";
import { DevisStatutBadge } from "@/components/devis/DevisStatutBadge";
import { DevisPipeline } from "@/components/devis/DevisPipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

interface DevisListPageProps {
  devisList: Devis[];
  onSelectDevis: (id: string) => void;
  onNewDevis: () => void;
}

export default function DevisListPage({ devisList, onSelectDevis, onNewDevis }: DevisListPageProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("ALL");

  const filtered = devisList.filter((d) => {
    const matchSearch =
      d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.client.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === "ALL" || d.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const totalCA = filtered.reduce((s, d) => s + d.montantTotal, 0);
  const isCommercialOrDG = user?.role === "COMMERCIAL" || user?.role === "DG";

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
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("pipeline")}
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

      {viewMode === "pipeline" ? (
        <DevisPipeline devisList={filtered} onSelectDevis={onSelectDevis} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Lignes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((devis) => (
                <TableRow key={devis.id} className="cursor-pointer" onClick={() => onSelectDevis(devis.id)}>
                  <TableCell className="font-mono text-sm">{devis.reference}</TableCell>
                  <TableCell className="font-medium">{devis.client.nom}</TableCell>
                  <TableCell className="font-semibold text-primary">{formatMontant(devis.montantTotal)}</TableCell>
                  <TableCell>{devis.lignes.length}</TableCell>
                  <TableCell><DevisStatutBadge statut={devis.statut} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(devis.createdAt)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
