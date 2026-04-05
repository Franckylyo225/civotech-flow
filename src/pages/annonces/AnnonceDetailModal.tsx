import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Annonce } from "@/hooks/use-annonces-store";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  annonce: Annonce | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnonceDetailModal({ annonce, open, onOpenChange }: Props) {
  if (!annonce) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{annonce.titre}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <span>{annonce.auteur_nom}</span>
            <span>·</span>
            <span>
              {format(new Date(annonce.created_at), "dd MMMM yyyy 'à' HH:mm", {
                locale: fr,
              })}
            </span>
          </div>
        </DialogHeader>

        {annonce.image_url && (
          <div className="rounded-lg overflow-hidden -mx-2">
            <img
              src={annonce.image_url}
              alt={annonce.titre}
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}

        <div className="whitespace-pre-wrap text-foreground leading-relaxed">
          {annonce.contenu}
        </div>
      </DialogContent>
    </Dialog>
  );
}
