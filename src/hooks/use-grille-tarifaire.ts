import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ZoneCode = string;
export type TypeTransport = "standard" | "express" | "special";

export interface TarifZone {
  id: string;
  destination: string;
  km: number;
  zone: ZoneCode;
  tonnage: string;
  type: TypeTransport;
  tarif: number;
  validite: string;
}
export interface TarifKm {
  id: string;
  vehicule: string;
  tonnage_max: number;
  prix_km: number;
  forfait_depart: number;
  validite: string;
}
export interface Majoration {
  id: string;
  motif: string;
  pct: number;
  applicable: string;
  actif: boolean;
}
export interface FraisFixe {
  id: string;
  designation: string;
  montant: number;
  applicable: string;
  actif: boolean;
}
export interface ZoneConfig {
  id: string;
  code: string;
  label: string;
  couleur: string;
  ordre: number;
  actif: boolean;
}
export interface TonnageConfig {
  id: string;
  label: string;
  borne_haute: number;
  ordre: number;
  actif: boolean;
}

function num<T extends Record<string, any>>(row: T, fields: (keyof T)[]): T {
  const out: any = { ...row };
  fields.forEach((f) => { if (out[f] != null) out[f] = Number(out[f]); });
  return out;
}

export function useGrilleTarifaire() {
  const [tarifsZone, setTarifsZone] = useState<TarifZone[]>([]);
  const [tarifsKm, setTarifsKm] = useState<TarifKm[]>([]);
  const [majorations, setMajorations] = useState<Majoration[]>([]);
  const [frais, setFrais] = useState<FraisFixe[]>([]);
  const [zonesConfig, setZonesConfig] = useState<ZoneConfig[]>([]);
  const [tonnagesConfig, setTonnagesConfig] = useState<TonnageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [z, k, m, f, zc, tc] = await Promise.all([
      supabase.from("tarifs_zone").select("*").order("zone").order("destination"),
      supabase.from("tarifs_km").select("*").order("vehicule"),
      supabase.from("majorations").select("*").order("motif"),
      supabase.from("frais_fixes").select("*").order("designation"),
      supabase.from("zones_config").select("*").order("ordre"),
      supabase.from("tonnages_config").select("*").order("ordre"),
    ]);
    if (z.error) toast.error("Erreur tarifs zone : " + z.error.message);
    else setTarifsZone((z.data || []).map((r: any) => num(r, ["km", "tarif"])) as TarifZone[]);
    if (k.error) toast.error("Erreur tarifs km : " + k.error.message);
    else setTarifsKm((k.data || []).map((r: any) => num(r, ["tonnage_max", "prix_km", "forfait_depart"])) as TarifKm[]);
    if (m.error) toast.error("Erreur majorations : " + m.error.message);
    else setMajorations((m.data || []).map((r: any) => num(r, ["pct"])) as Majoration[]);
    if (f.error) toast.error("Erreur frais : " + f.error.message);
    else setFrais((f.data || []).map((r: any) => num(r, ["montant"])) as FraisFixe[]);
    if (zc.error) toast.error("Erreur zones : " + zc.error.message);
    else setZonesConfig((zc.data || []).map((r: any) => num(r, ["ordre"])) as ZoneConfig[]);
    if (tc.error) toast.error("Erreur tonnages : " + tc.error.message);
    else setTonnagesConfig((tc.data || []).map((r: any) => num(r, ["borne_haute", "ordre"])) as TonnageConfig[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── tarifs_zone CRUD
  const addTarifZone = async (data: Omit<TarifZone, "id">) => {
    const { error } = await supabase.from("tarifs_zone").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif ajouté"); fetchAll();
  };
  const updateTarifZone = async (id: string, patch: Partial<TarifZone>) => {
    const { error } = await supabase.from("tarifs_zone").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif mis à jour"); fetchAll();
  };
  const deleteTarifZone = async (id: string) => {
    const { error } = await supabase.from("tarifs_zone").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif supprimé"); setTarifsZone((p) => p.filter((t) => t.id !== id));
  };

  // ── tarifs_km CRUD
  const addTarifKm = async (data: Omit<TarifKm, "id">) => {
    const { error } = await supabase.from("tarifs_km").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif ajouté"); fetchAll();
  };
  const updateTarifKm = async (id: string, patch: Partial<TarifKm>) => {
    const { error } = await supabase.from("tarifs_km").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif mis à jour"); fetchAll();
  };
  const deleteTarifKm = async (id: string) => {
    const { error } = await supabase.from("tarifs_km").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarif supprimé"); setTarifsKm((p) => p.filter((t) => t.id !== id));
  };

  // ── majorations CRUD
  const addMajoration = async (data: Omit<Majoration, "id">) => {
    const { error } = await supabase.from("majorations").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Majoration ajoutée"); fetchAll();
  };
  const updateMajoration = async (id: string, patch: Partial<Majoration>) => {
    const { error } = await supabase.from("majorations").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };
  const deleteMajoration = async (id: string) => {
    const { error } = await supabase.from("majorations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Majoration supprimée"); setMajorations((p) => p.filter((m) => m.id !== id));
  };

  // ── frais CRUD
  const addFrais = async (data: Omit<FraisFixe, "id">) => {
    const { error } = await supabase.from("frais_fixes").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Frais ajouté"); fetchAll();
  };
  const updateFrais = async (id: string, patch: Partial<FraisFixe>) => {
    const { error } = await supabase.from("frais_fixes").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };
  const deleteFrais = async (id: string) => {
    const { error } = await supabase.from("frais_fixes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Frais supprimé"); setFrais((p) => p.filter((f) => f.id !== id));
  };

  // ── zones_config CRUD
  const addZone = async (data: Omit<ZoneConfig, "id">) => {
    const { error } = await supabase.from("zones_config").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone ajoutée"); fetchAll();
  };
  const updateZone = async (id: string, patch: Partial<ZoneConfig>) => {
    const { error } = await supabase.from("zones_config").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone mise à jour"); fetchAll();
  };
  const deleteZone = async (id: string) => {
    const { error } = await supabase.from("zones_config").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone supprimée"); setZonesConfig((p) => p.filter((z) => z.id !== id));
  };

  // ── tonnages_config CRUD
  const addTonnage = async (data: Omit<TonnageConfig, "id">) => {
    const { error } = await supabase.from("tonnages_config").insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success("Tonnage ajouté"); fetchAll();
  };
  const updateTonnage = async (id: string, patch: Partial<TonnageConfig>) => {
    const { error } = await supabase.from("tonnages_config").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tonnage mis à jour"); fetchAll();
  };
  const deleteTonnage = async (id: string) => {
    const { error } = await supabase.from("tonnages_config").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tonnage supprimé"); setTonnagesConfig((p) => p.filter((t) => t.id !== id));
  };

  return {
    loading,
    tarifsZone, tarifsKm, majorations, frais, zonesConfig, tonnagesConfig,
    refresh: fetchAll,
    addTarifZone, updateTarifZone, deleteTarifZone,
    addTarifKm, updateTarifKm, deleteTarifKm,
    addMajoration, updateMajoration, deleteMajoration,
    addFrais, updateFrais, deleteFrais,
    addZone, updateZone, deleteZone,
    addTonnage, updateTonnage, deleteTonnage,
  };
}
