import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Tarif {
  id: string;
  designation: string;
  unite: string;
  prixUnitaire: number;
  categorie: string;
  actif: boolean;
  createdAt: string;
}

export interface CreateTarifData {
  designation: string;
  unite: string;
  prixUnitaire: number;
  categorie: string;
}

const UNITES = ["FORFAIT", "TONNE", "KM", "VOYAGE", "JOUR", "HEURE", "COLIS"] as const;
const CATEGORIES = ["TRANSPORT", "MANUTENTION", "STOCKAGE", "DOUANE", "AUTRE"] as const;

export { UNITES, CATEGORIES };

function mapTarif(row: any): Tarif {
  return {
    id: row.id,
    designation: row.designation,
    unite: row.unite,
    prixUnitaire: Number(row.prix_unitaire),
    categorie: row.categorie,
    actif: row.actif,
    createdAt: row.created_at,
  };
}

export function useGrilleTarifaireStore() {
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTarifs = useCallback(async () => {
    const { data, error } = await supabase
      .from("grille_tarifaire")
      .select("*")
      .order("categorie")
      .order("designation");

    if (error) {
      toast.error("Erreur chargement tarifs: " + error.message);
      return;
    }
    setTarifs((data || []).map(mapTarif));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTarifs();
  }, [fetchTarifs]);

  const addTarif = useCallback(async (data: CreateTarifData) => {
    const { error } = await supabase.from("grille_tarifaire").insert({
      designation: data.designation,
      unite: data.unite,
      prix_unitaire: data.prixUnitaire,
      categorie: data.categorie,
    });
    if (error) { toast.error("Erreur ajout tarif: " + error.message); return; }
    toast.success("Tarif ajouté");
    await fetchTarifs();
  }, [fetchTarifs]);

  const updateTarif = useCallback(async (id: string, data: Partial<CreateTarifData & { actif: boolean }>) => {
    const updateData: any = {};
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.unite !== undefined) updateData.unite = data.unite;
    if (data.prixUnitaire !== undefined) updateData.prix_unitaire = data.prixUnitaire;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.actif !== undefined) updateData.actif = data.actif;

    const { error } = await supabase.from("grille_tarifaire").update(updateData).eq("id", id);
    if (error) { toast.error("Erreur mise à jour: " + error.message); return; }
    toast.success("Tarif mis à jour");
    await fetchTarifs();
  }, [fetchTarifs]);

  const deleteTarif = useCallback(async (id: string) => {
    const { error } = await supabase.from("grille_tarifaire").delete().eq("id", id);
    if (error) { toast.error("Erreur suppression: " + error.message); return; }
    toast.success("Tarif supprimé");
    await fetchTarifs();
  }, [fetchTarifs]);

  return { tarifs, loading, addTarif, updateTarif, deleteTarif };
}
