import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ApprobationItem {
  id: string;
  type: "devis" | "demande_achat" | "decaissement";
  reference: string;
  titre: string;
  montant: number;
  date: string;
  statut: string;
  lien: string;
  details?: Record<string, any>;
}

export function useApprobationsStore() {
  const [items, setItems] = useState<ApprobationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [devisRes, daRes, decRes] = await Promise.all([
      supabase
        .from("devis")
        .select("id, reference, description, montant, created_at, statut, client_id")
        .eq("statut", "SOUMIS_DG")
        .order("created_at", { ascending: false }),
      supabase
        .from("demandes_achat")
        .select("id, reference, designation, description, montant_estime, created_at, statut, urgence")
        .eq("statut", "SOUMISE_DG")
        .order("created_at", { ascending: false }),
      supabase
        .from("decaissements")
        .select("id, reference, motif, montant, created_at, statut")
        .eq("statut", "EN_ATTENTE")
        .order("created_at", { ascending: false }),
    ]);

    const result: ApprobationItem[] = [];

    (devisRes.data || []).forEach((d: any) => {
      result.push({
        id: d.id,
        type: "devis",
        reference: d.reference,
        titre: d.description || "Devis en attente",
        montant: d.montant,
        date: d.created_at,
        statut: d.statut,
        lien: `/devis/${d.id}`,
      });
    });

    (daRes.data || []).forEach((d: any) => {
      result.push({
        id: d.id,
        type: "demande_achat",
        reference: d.reference,
        titre: d.designation || d.description || "Demande d'achat",
        montant: d.montant_estime,
        date: d.created_at,
        statut: d.statut,
        lien: "/achats",
        details: { urgence: d.urgence },
      });
    });

    (decRes.data || []).forEach((d: any) => {
      result.push({
        id: d.id,
        type: "decaissement",
        reference: d.reference,
        titre: d.motif || "Décaissement en attente",
        montant: d.montant,
        date: d.created_at,
        statut: d.statut,
        lien: "/factures",
      });
    });

    // Sort by date desc
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = {
    total: items.length,
    devis: items.filter(i => i.type === "devis").length,
    demandes: items.filter(i => i.type === "demande_achat").length,
    decaissements: items.filter(i => i.type === "decaissement").length,
    montantTotal: items.reduce((s, i) => s + i.montant, 0),
  };

  return { items, loading, counts, refetch: fetchAll };
}
