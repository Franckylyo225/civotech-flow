import { useState } from "react";
import { useAnnoncesStore, type Annonce } from "@/hooks/use-annonces-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Trash2, Archive } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { AnnonceCreateDialog } from "./AnnonceCreateDialog";
import { AnnonceDetailModal } from "./AnnonceDetailModal";
import { useAuth } from "@/lib/auth-context";

export default function AnnoncesPage() {
  const { annonces, loading, canPublish, deleteAnnonce, archiveAnnonce } = useAnnoncesStore();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Annonce | null>(null);

  const activeAnnonces = annonces.filter((a) => a.statut === "actif");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Annonces</h1>
            <p className="text-sm text-muted-foreground">
              Communication interne de l'entreprise
            </p>
          </div>
        </div>
        {canPublish && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle annonce
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : activeAnnonces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucune annonce</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {canPublish
                ? "Publiez la première annonce pour votre équipe"
                : "Aucune annonce pour le moment"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeAnnonces.map((annonce) => {
            const isNew = differenceInHours(new Date(), new Date(annonce.created_at)) < 48;
            const isAuthor = user?.id === annonce.auteur_id;
            const isDG = user?.role === "DG";

            return (
              <Card
                key={annonce.id}
                className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => setSelected(annonce)}
              >
                {/* Image cover */}
                {annonce.image_url && (
                  <div className="relative h-40 w-full overflow-hidden">
                    <img
                      src={annonce.image_url}
                      alt={annonce.titre}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {isNew && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                )}

                <CardContent className={annonce.image_url ? "p-4" : "p-4 pt-4"}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {!annonce.image_url && isNew && (
                        <Badge className="mb-2 bg-primary text-primary-foreground">
                          Nouveau
                        </Badge>
                      )}
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {annonce.titre}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                        {annonce.contenu}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{annonce.auteur_nom}</span>
                    <span>
                      {format(new Date(annonce.created_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>

                  {/* Actions for author/DG */}
                  {(isAuthor || isDG) && (
                    <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveAnnonce(annonce.id);
                        }}
                      >
                        <Archive className="h-3 w-3" />
                        Archiver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnonce(annonce.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Supprimer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <AnnonceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Detail modal */}
      <AnnonceDetailModal
        annonce={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
