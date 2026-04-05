import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, X } from "lucide-react";
import { useAnnoncesStore } from "@/hooks/use-annonces-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnonceCreateDialog({ open, onOpenChange }: Props) {
  const { createAnnonce } = useAnnoncesStore();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!titre.trim() || !contenu.trim()) return;
    setSubmitting(true);
    await createAnnonce(titre.trim(), contenu.trim(), imageFile || undefined);
    setSubmitting(false);
    setTitre("");
    setContenu("");
    removeImage();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle annonce</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre de l'annonce"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenu">Contenu *</Label>
            <Textarea
              id="contenu"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Rédigez votre annonce..."
              rows={5}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label>Image (optionnelle)</Label>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full h-40 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-sm">Ajouter une image</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!titre.trim() || !contenu.trim() || submitting}
          >
            {submitting ? "Publication..." : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
