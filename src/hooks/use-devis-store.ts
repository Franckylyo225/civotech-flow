import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Devis, DevisStatut, Client, LigneDevis, CreateDevisData, TypeRemise } from "@/types/devis";
import { calculeDevisTotaux } from "@/types/devis";
import { toast } from "sonner";

function mapClient(row: any): Client {
  return {
    id: row.id,
    nom: row.nom,
    email: row.email,
    telephone: row.telephone,
    adresse: row.adresse,
    contact: row.contact,
  };
}

function mapDevis(row: any, lignes: any[], client?: any): Devis {
  return {
    id: row.id,
    reference: row.reference,
    clientId: row.client_id,
    client: client ? mapClient(client) : undefined,
    lignes: lignes.map((l) => ({
      id: l.id,
      devisId: l.devis_id,
      description: l.description,
      quantite: l.quantite,
      prixUnitaire: Number(l.prix_unitaire),
      montant: Number(l.montant),
    })),
    montantHT: Number(row.montant_ht || 0),
    tauxTva: Number(row.taux_tva ?? 18),
    montantTva: Number(row.montant_tva || 0),
    typeRemise: (row.type_remise || "POURCENTAGE") as TypeRemise,
    valeurRemise: Number(row.valeur_remise || 0),
    montantRemise: Number(row.montant_remise || 0),
    montantTotal: Number(row.montant),
    statut: row.statut as DevisStatut,
    commentaireRefus: row.commentaire_refus || undefined,
    description: row.description || undefined,
    commercialId: row.commercial_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useDevisStore() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevis = useCallback(async () => {
    const { data: devisRows, error } = await supabase
      .from("devis")
      .select("*, clients(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur chargement devis: " + error.message);
      return;
    }

    const ids = (devisRows || []).map((d) => d.id);
    let allLignes: any[] = [];
    if (ids.length > 0) {
      const { data: lignesData } = await supabase
        .from("lignes_devis")
        .select("*")
        .in("devis_id", ids);
      allLignes = lignesData || [];
    }

    const mapped = (devisRows || []).map((row) => {
      const rowLignes = allLignes.filter((l) => l.devis_id === row.id);
      return mapDevis(row, rowLignes, (row as any).clients);
    });

    setDevisList(mapped);
    setLoading(false);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("nom");
    setClients((data || []).map(mapClient));
  }, []);

  useEffect(() => {
    fetchDevis();
    fetchClients();

    const channel = supabase
      .channel("devis-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, () => {
        fetchDevis();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDevis, fetchClients]);

  const addDevis = useCallback(async (data: CreateDevisData) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    const totaux = calculeDevisTotaux(data.lignes, data.tauxTva, data.typeRemise, data.valeurRemise);

    const { data: newDevis, error } = await supabase
      .from("devis")
      .insert({
        reference: "",
        client_id: data.clientId,
        commercial_id: userId || null,
        montant: totaux.montantTotal,
        montant_ht: totaux.montantHT,
        taux_tva: data.tauxTva,
        montant_tva: totaux.montantTva,
        type_remise: data.typeRemise,
        valeur_remise: data.valeurRemise,
        montant_remise: totaux.montantRemise,
        statut: "BROUILLON" as any,
      } as any)
      .select()
      .single();

    if (error) { toast.error("Erreur création devis: " + error.message); return null; }

    const lignesInsert = data.lignes.map((l) => ({
      devis_id: newDevis.id,
      description: l.description,
      quantite: l.quantite,
      prix_unitaire: l.prixUnitaire,
      montant: l.quantite * l.prixUnitaire,
    }));

    const { error: lignesError } = await supabase.from("lignes_devis").insert(lignesInsert);
    if (lignesError) { toast.error("Erreur ajout lignes: " + lignesError.message); }

    await fetchDevis();
    return newDevis;
  }, [fetchDevis]);

  const updateStatut = useCallback(async (devisId: string, newStatut: DevisStatut, commentaire?: string) => {
    const updateData: any = { statut: newStatut };
    if (commentaire) updateData.commentaire_refus = commentaire;

    const { error } = await supabase.from("devis").update(updateData).eq("id", devisId);
    if (error) { toast.error("Erreur mise à jour: " + error.message); return; }

    await fetchDevis();
  }, [fetchDevis]);

  const updateDevis = useCallback(async (
    devisId: string,
    data: { lignes: { id?: string; description: string; quantite: number; prixUnitaire: number }[]; tauxTva: number; typeRemise: TypeRemise; valeurRemise: number }
  ) => {
    const totaux = calculeDevisTotaux(data.lignes, data.tauxTva, data.typeRemise, data.valeurRemise);

    const { error } = await supabase.from("devis").update({
      montant: totaux.montantTotal,
      montant_ht: totaux.montantHT,
      taux_tva: data.tauxTva,
      montant_tva: totaux.montantTva,
      type_remise: data.typeRemise,
      valeur_remise: data.valeurRemise,
      montant_remise: totaux.montantRemise,
      commentaire_refus: "",
    } as any).eq("id", devisId);

    if (error) { toast.error("Erreur mise à jour devis: " + error.message); return; }

    // Replace all lines
    await supabase.from("lignes_devis").delete().eq("devis_id", devisId);
    const lignesInsert = data.lignes.map((l) => ({
      devis_id: devisId,
      description: l.description,
      quantite: l.quantite,
      prix_unitaire: l.prixUnitaire,
      montant: l.quantite * l.prixUnitaire,
    }));
    const { error: lignesError } = await supabase.from("lignes_devis").insert(lignesInsert);
    if (lignesError) { toast.error("Erreur mise à jour lignes: " + lignesError.message); }

    await fetchDevis();
  }, [fetchDevis]);

  const createOperationFromDevis = useCallback(async (devis: Devis) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    const { error } = await supabase.from("operations").insert({
      reference: "",
      devis_id: devis.id,
      devis_reference: devis.reference,
      client_id: devis.clientId,
      client_nom: devis.client?.nom || "",
      montant_devis: devis.montantTotal,
      lieu_embarquement: "",
      lieu_livraison: "",
      statut: "DEMANDE" as any,
      created_by: userId || null,
    });

    if (error) { toast.error("Erreur création opération: " + error.message); return false; }
    return true;
  }, []);

  return { devisList, clients, loading, addDevis, updateDevis, updateStatut, createOperationFromDevis };
