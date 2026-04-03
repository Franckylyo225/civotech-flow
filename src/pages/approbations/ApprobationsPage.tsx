import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApprobationsStore, type ApprobationItem } from "@/hooks/use-approbations-store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, FileText, ShoppingCart, Wallet, Search,
  RefreshCw, Clock, ArrowRight, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const TYPE_CONFIG = {
  devis: { label: "Devis", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  demande_achat: { label: "Demande d'achat", icon: ShoppingCart, color: "text-warning", bg: "bg-warning/10" },
  decaissement: { label: "Décaissement", icon: Wallet, color: "text-info", bg: "bg-info/10" },
};

export default function ApprobationsPage() {
  const { items, loading, counts, refetch } = useApprobationsStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("tous");
  const [refusDialog, setRefusDialog] = useState<ApprobationItem | null>(null);
  const [commentaireRefus, setCommentaireRefus] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = items.filter(item => {
    const matchSearch = search === "" ||
      item.reference.toLowerCase().includes(search.toLowerCase()) ||
      item.titre.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "tous" || item.type === tab;
    return matchSearch && matchTab;
  });

  async function handleApprove(item: ApprobationItem) {
    setActionLoading(item.id);
    try {
      if (item.type === "devis") {
        await supabase.from("devis").update({ statut: "APPROUVE_DG" } as any).eq("id", item.id);
      } else if (item.type === "demande_achat") {
        await supabase.from("demandes_achat").update({ statut: "VALIDEE_DG" } as any).eq("id", item.id);
      } else if (item.type === "decaissement") {
        await supabase.from("decaissements").update({ statut: "APPROUVE" } as any).eq("id", item.id);
      }
      toast.success(`${TYPE_CONFIG[item.type].label} ${item.reference} approuvé(e)`);
      await refetch();
    } catch {
      toast.error("Erreur lors de l'approbation");
    }
    setActionLoading(null);
  }

  async function handleRefuse() {
    if (!refusDialog) return;
    setActionLoading(refusDialog.id);
    try {
      if (refusDialog.type === "devis") {
        await supabase.from("devis").update({ statut: "REFUSE_DG", commentaire_refus: commentaireRefus } as any).eq("id", refusDialog.id);
      } else if (refusDialog.type === "demande_achat") {
        await supabase.from("demandes_achat").update({ statut: "REFUSEE_DG", commentaire_dg: commentaireRefus } as any).eq("id", refusDialog.id);
      } else if (refusDialog.type === "decaissement") {
        await supabase.from("decaissements").update({ statut: "REJETE", commentaire: commentaireRefus } as any).eq("id", refusDialog.id);
      }
      toast.success(`${TYPE_CONFIG[refusDialog.type].label} ${refusDialog.reference} refusé(e)`);
      setRefusDialog(null);
      setCommentaireRefus("");
      await refetch();
    } catch {
      toast.error("Erreur lors du refus");
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Approbations</h1>
        <p className="text-sm text-muted-foreground">
          Toutes les demandes en attente de votre validation
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total en attente", value: counts.total, icon: Clock, color: "text-warning" },
          { label: "Devis", value: counts.devis, icon: FileText, color: "text-primary" },
          { label: "Demandes d'achat", value: counts.demandes, icon: ShoppingCart, color: "text-warning" },
          { label: "Décaissements", value: counts.decaissements, icon: Wallet, color: "text-info" },
        ].map(s => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou titre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs + List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tous">Tous ({counts.total})</TabsTrigger>
          <TabsTrigger value="devis">Devis ({counts.devis})</TabsTrigger>
          <TabsTrigger value="demande_achat">Achats ({counts.demandes})</TabsTrigger>
          <TabsTrigger value="decaissement">Décaissements ({counts.decaissements})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <Card className="border border-border shadow-none">
              <CardContent className="py-12 text-center text-muted-foreground">Chargement...</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border border-border shadow-none">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success/40 mb-3" />
                <p className="font-medium">Aucune demande en attente</p>
                <p className="text-xs mt-1">Tout est à jour !</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(item => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <Card key={item.id} className="border border-border shadow-none hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("rounded-lg p-2.5 mt-0.5", cfg.bg)}>
                        <cfg.icon className={cn("h-5 w-5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{item.reference}</span>
                          <Badge variant="outline" className={cn("border-0 text-[10px] font-medium", cfg.bg, cfg.color)}>
                            {cfg.label}
                          </Badge>
                          {item.details?.urgence && item.details.urgence !== "NORMALE" && (
                            <Badge variant="outline" className="border-0 bg-destructive/10 text-destructive text-[10px]">
                              {item.details.urgence}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-1 truncate">{item.titre}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm font-semibold text-primary">
                            {item.montant.toLocaleString("fr-FR")} FCFA
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.date), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(item.lien)}
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:bg-success/10"
                          onClick={() => handleApprove(item)}
                          disabled={actionLoading === item.id}
                          title="Approuver"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => { setRefusDialog(item); setCommentaireRefus(""); }}
                          disabled={actionLoading === item.id}
                          title="Refuser"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Refus dialog */}
      <Dialog open={!!refusDialog} onOpenChange={() => setRefusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser {refusDialog?.reference}</DialogTitle>
            <DialogDescription>
              Veuillez indiquer le motif du refus. Un commentaire est recommandé.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motif du refus (optionnel)..."
            value={commentaireRefus}
            onChange={e => setCommentaireRefus(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusDialog(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={!!actionLoading}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
