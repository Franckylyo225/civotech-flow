import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  image_url: string | null;
  auteur_id: string;
  statut: string;
  created_at: string;
  updated_at: string;
  auteur_nom?: string;
}

const PUBLISH_ROLES = ["DG", "COMMERCIAL", "ASSISTANTE"];

export function useAnnoncesStore() {
  const { user } = useAuth();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);

  const canPublish = user ? PUBLISH_ROLES.includes(user.role) : false;

  const fetchAnnonces = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("annonces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des annonces");
      setLoading(false);
      return;
    }

    // Fetch author names
    const authorIds = [...new Set((data || []).map((a: any) => a.auteur_id))];
    let profilesMap: Record<string, string> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nom, prenom")
        .in("user_id", authorIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          profilesMap[p.user_id] = `${p.prenom} ${p.nom}`.trim();
        });
      }
    }

    const enriched = (data || []).map((a: any) => ({
      ...a,
      auteur_nom: profilesMap[a.auteur_id] || "Utilisateur",
    }));

    setAnnonces(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnonces();
  }, [fetchAnnonces]);

  const createAnnonce = useCallback(
    async (titre: string, contenu: string, imageFile?: File) => {
      if (!user) return;

      let image_url: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("annonces-images")
          .upload(path, imageFile);
        if (upErr) {
          toast.error("Erreur upload image");
          return;
        }
        const { data: urlData } = supabase.storage
          .from("annonces-images")
          .getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("annonces").insert({
        titre,
        contenu,
        image_url,
        auteur_id: user.id,
      } as any);

      if (error) {
        toast.error("Erreur lors de la création");
        return;
      }

      toast.success("Annonce publiée !");
      fetchAnnonces();
    },
    [user, fetchAnnonces]
  );

  const deleteAnnonce = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("annonces").delete().eq("id", id);
      if (error) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Annonce supprimée");
      setAnnonces((prev) => prev.filter((a) => a.id !== id));
    },
    []
  );

  const archiveAnnonce = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("annonces")
        .update({ statut: "archivé" } as any)
        .eq("id", id);
      if (error) {
        toast.error("Erreur lors de l'archivage");
        return;
      }
      toast.success("Annonce archivée");
      fetchAnnonces();
    },
    [fetchAnnonces]
  );

  return {
    annonces,
    loading,
    canPublish,
    createAnnonce,
    deleteAnnonce,
    archiveAnnonce,
    refetch: fetchAnnonces,
  };
}
