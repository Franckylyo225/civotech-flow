import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Mail, MapPin, Building2, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CATEGORIE_FOURNISSEUR_CONFIG, type FournisseurRow } from "@/hooks/use-fournisseurs-store";
import { STATUT_DA_CONFIG, type DemandeAchatRow } from "@/hooks/use-demandes-achat-store";

const fmt = (n: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;

interface Props {
  fournisseur: FournisseurRow | null;
  demandes: DemandeAchatRow[];
  open: boolean;
  onClose: () => void;
  onCreateDemande?: (fournisseurId: string) => void;
}

export default function FournisseurDetailDrawer({ fournisseur, demandes, open, onClose, onCreateDemande }: Props) {
  const linked = useMemo(
    () => fournisseur ? demandes.filter(d => d.fournisseur_id === fournisseur.id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)) : [],
    [fournisseur, demandes]
  );
  const total = linked.filter(d => d.statut === "PAYEE").reduce((s, d) => s + (d.montant_reel || 0), 0);

  if (!fournisseur) return null;
  const cat = CATEGORIE_FOURNISSEUR_CONFIG[fournisseur.categorie];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />{fournisseur.nom}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Infos */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Informations</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Contact" value={fournisseur.contact || "—"} />
              <Info label="Téléphone" value={fournisseur.telephone || "—"} icon={Phone} />
              <Info label="Email" value={fournisseur.email || "—"} icon={Mail} />
              <Info label="Catégorie" value={cat.label} />
              <Info label="Adresse" value={fournisseur.adresse || "—"} icon={MapPin} />
              <Info label="Créé le" value={format(new Date(fournisseur.created_at), "dd/MM/yyyy")} icon={Calendar} />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Statut</p>
                <Badge variant="outline" className={cn("border-0 text-xs mt-0.5", fournisseur.actif ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                  {fournisseur.actif ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>
          </section>

          {/* Historique */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Historique des commandes ({linked.length})</h3>
            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linked.map(d => {
                    const cfg = STATUT_DA_CONFIG[d.statut];
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.reference}</TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate">{d.designation}</TableCell>
                        <TableCell className="text-xs font-medium">{fmt(d.montant_reel || d.montant_estime || 0)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-0 text-[10px]", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {linked.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">Aucune commande</TableCell></TableRow>
                  )}
                  {linked.length > 0 && (
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={2} className="text-xs font-semibold">Total payé</TableCell>
                      <TableCell colSpan={3} className="text-xs font-semibold text-success">{fmt(total)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {onCreateDemande && (
            <Button className="w-full" onClick={() => onCreateDemande(fournisseur.id)}>
              <Plus className="h-4 w-4 mr-1.5" />Nouvelle demande à ce fournisseur
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground flex items-center gap-1 mt-0.5">{Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{value}</p>
    </div>
  );
}
