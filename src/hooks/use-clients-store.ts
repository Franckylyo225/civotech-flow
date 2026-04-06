import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/types/devis";
import { toast } from "sonner";

function mapClient(row: any): Client & { conditions_paiement?: string } {
  return { id: row.id, nom: row.nom, email: row.email, telephone: row.telephone, adresse: row.adresse, contact: row.contact, created_at: row.created_at, conditions_paiement: row.conditions_paiement };
}

export interface CreateClientData {
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  contact?: string;
  conditions_paiement?: string;
}

export function useClientsStore() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase.from("clients").select("*").order("nom");
    if (error) { toast.error("Erreur chargement clients: " + error.message); return; }
    setClients((data || []).map(mapClient));
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const addClient = useCallback(async (d: CreateClientData) => {
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase.from("clients").insert({
      nom: d.nom, email: d.email || null, telephone: d.telephone || null,
      adresse: d.adresse || null, contact: d.contact || null,
      conditions_paiement: d.conditions_paiement || "Net 30 jours",
      created_by: session.session?.user.id || null,
    } as any);
    if (error) { toast.error("Erreur: " + error.message); return false; }
    await fetchClients();
    return true;
  }, [fetchClients]);

  const updateClient = useCallback(async (id: string, d: Partial<CreateClientData>) => {
    const { error } = await supabase.from("clients").update({
      nom: d.nom, email: d.email || null, telephone: d.telephone || null,
      adresse: d.adresse || null, contact: d.contact || null,
      conditions_paiement: (d as any).conditions_paiement || null,
    } as any).eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return false; }
    await fetchClients();
    return true;
  }, [fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return false; }
    await fetchClients();
    return true;
  }, [fetchClients]);

  return { clients, loading, addClient, updateClient, deleteClient };
}
