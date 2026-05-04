import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Schémas de validation
const ZoneSchema = z.object({
  code: z.string().trim().min(1, "Code requis").max(10, "Code trop long (max 10)"),
  label: z.string().trim().min(1, "Libellé requis").max(100),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide (format #RRGGBB)"),
  ordre: z.number().int().min(0).max(999),
  actif: z.boolean(),
});
const TonnageSchema = z.object({
  label: z.string().trim().min(1, "Libellé requis").max(50),
  borne_haute: z.number().positive("Borne haute > 0").max(10000),
  ordre: z.number().int().min(0).max(999),
  actif: z.boolean(),
});
const TarifZoneSchema = z.object({
  destination: z.string().trim().min(1, "Destination requise").max(200),
  km: z.number().min(0).max(100000),
  zone: z.string().min(1, "Zone requise"),
  tonnage: z.string().min(1, "Tonnage requis"),
  type: z.enum(["standard", "express", "special"]),
  tarif: z.number().positive("Tarif > 0").max(1_000_000_000),
  validite: z.string().min(1, "Validité requise"),
});
const TarifKmSchema = z.object({
  vehicule: z.string().trim().min(1, "Véhicule requis").max(100),
  tonnage_max: z.number().positive().max(10000),
  prix_km: z.number().min(0).max(1_000_000),
  forfait_depart: z.number().min(0).max(1_000_000_000),
  validite: z.string().min(1),
});
const MajorationSchema = z.object({
  motif: z.string().trim().min(1, "Motif requis").max(100),
  pct: z.number().min(0).max(1000),
  applicable: z.string().trim().min(1).max(100),
  actif: z.boolean(),
});
const FraisSchema = z.object({
  designation: z.string().trim().min(1, "Désignation requise").max(100),
  montant: z.number().min(0).max(1_000_000_000),
  applicable: z.string().trim().min(1).max(100),
  actif: z.boolean(),
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = Object.values(r.error.flatten().fieldErrors).flat()[0];
    toast.error(typeof msg === "string" ? msg : "Données invalides");
    return null;
  }
  return r.data;
}

function handleDbError(error: { message: string; code?: string }) {
  const m = error.message || "";
  if (error.code === "23505" || m.includes("duplicate") || m.includes("unique")) {
    if (m.includes("zones_config")) return toast.error("Cette zone existe déjà (code en doublon)");
    if (m.includes("tonnages_config")) return toast.error("Ce tonnage existe déjà (libellé en doublon)");
    return toast.error("Doublon détecté");
  }
  if (error.code === "23503" || m.includes("foreign_key") || m.includes("Impossible de supprimer")) {
    return toast.error(m.replace(/^.*?:\s*/, "") || "Suppression bloquée : élément référencé");
  }
  toast.error(m);
}

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
    const v = validate(TarifZoneSchema, data); if (!v) return;
    const { error } = await supabase.from("tarifs_zone").insert(v as any);
    if (error) return handleDbError(error);
    toast.success("Tarif ajouté"); fetchAll();
  };
  const updateTarifZone = async (id: string, patch: Partial<TarifZone>) => {
    const { error } = await supabase.from("tarifs_zone").update(patch as any).eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Tarif mis à jour"); fetchAll();
  };
  const deleteTarifZone = async (id: string) => {
    const { error } = await supabase.from("tarifs_zone").delete().eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Tarif supprimé"); setTarifsZone((p) => p.filter((t) => t.id !== id));
  };

  // ── tarifs_km CRUD
  const addTarifKm = async (data: Omit<TarifKm, "id">) => {
    const v = validate(TarifKmSchema, data); if (!v) return;
    const { error } = await supabase.from("tarifs_km").insert(v);
    if (error) return handleDbError(error);
    toast.success("Tarif ajouté"); fetchAll();
  };
  const updateTarifKm = async (id: string, patch: Partial<TarifKm>) => {
    const { error } = await supabase.from("tarifs_km").update(patch).eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Tarif mis à jour"); fetchAll();
  };
  const deleteTarifKm = async (id: string) => {
    const { error } = await supabase.from("tarifs_km").delete().eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Tarif supprimé"); setTarifsKm((p) => p.filter((t) => t.id !== id));
  };

  // ── majorations CRUD
  const addMajoration = async (data: Omit<Majoration, "id">) => {
    const v = validate(MajorationSchema, data); if (!v) return;
    const { error } = await supabase.from("majorations").insert(v);
    if (error) return handleDbError(error);
    toast.success("Majoration ajoutée"); fetchAll();
  };
  const updateMajoration = async (id: string, patch: Partial<Majoration>) => {
    const { error } = await supabase.from("majorations").update(patch).eq("id", id);
    if (error) return handleDbError(error);
    fetchAll();
  };
  const deleteMajoration = async (id: string) => {
    const { error } = await supabase.from("majorations").delete().eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Majoration supprimée"); setMajorations((p) => p.filter((m) => m.id !== id));
  };

  // ── frais CRUD
  const addFrais = async (data: Omit<FraisFixe, "id">) => {
    const v = validate(FraisSchema, data); if (!v) return;
    const { error } = await supabase.from("frais_fixes").insert(v);
    if (error) return handleDbError(error);
    toast.success("Frais ajouté"); fetchAll();
  };
  const updateFrais = async (id: string, patch: Partial<FraisFixe>) => {
    const { error } = await supabase.from("frais_fixes").update(patch).eq("id", id);
    if (error) return handleDbError(error);
    fetchAll();
  };
  const deleteFrais = async (id: string) => {
    const { error } = await supabase.from("frais_fixes").delete().eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Frais supprimé"); setFrais((p) => p.filter((f) => f.id !== id));
  };

  // ── zones_config CRUD
  const addZone = async (data: Omit<ZoneConfig, "id">) => {
    const v = validate(ZoneSchema, data); if (!v) return;
    if (zonesConfig.some((z) => z.code.toLowerCase() === v.code.toLowerCase())) {
      return toast.error("Cette zone existe déjà (code en doublon)");
    }
    const { error } = await supabase.from("zones_config").insert(v);
    if (error) return handleDbError(error);
    toast.success("Zone ajoutée"); fetchAll();
  };
  const updateZone = async (id: string, patch: Partial<ZoneConfig>) => {
    if (patch.code) {
      const dup = zonesConfig.some((z) => z.id !== id && z.code.toLowerCase() === patch.code!.toLowerCase());
      if (dup) return toast.error("Cette zone existe déjà (code en doublon)");
    }
    const { error } = await supabase.from("zones_config").update(patch).eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Zone mise à jour"); fetchAll();
  };
  const deleteZone = async (id: string) => {
    const zone = zonesConfig.find((z) => z.id === id);
    if (zone) {
      const used = tarifsZone.filter((t) => t.zone === zone.code).length;
      if (used > 0) return toast.error(`Impossible de supprimer la zone ${zone.code} : ${used} tarif(s) y font référence.`);
    }
    const { error } = await supabase.from("zones_config").delete().eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Zone supprimée"); setZonesConfig((p) => p.filter((z) => z.id !== id));
  };

  // ── tonnages_config CRUD
  const addTonnage = async (data: Omit<TonnageConfig, "id">) => {
    const v = validate(TonnageSchema, data); if (!v) return;
    if (tonnagesConfig.some((t) => t.label.toLowerCase() === v.label.toLowerCase())) {
      return toast.error("Ce tonnage existe déjà (libellé en doublon)");
    }
    const { error } = await supabase.from("tonnages_config").insert(v);
    if (error) return handleDbError(error);
    toast.success("Tonnage ajouté"); fetchAll();
  };
  const updateTonnage = async (id: string, patch: Partial<TonnageConfig>) => {
    if (patch.label) {
      const dup = tonnagesConfig.some((t) => t.id !== id && t.label.toLowerCase() === patch.label!.toLowerCase());
      if (dup) return toast.error("Ce tonnage existe déjà (libellé en doublon)");
    }
    const { error } = await supabase.from("tonnages_config").update(patch).eq("id", id);
    if (error) return handleDbError(error);
    toast.success("Tonnage mis à jour"); fetchAll();
  };
  const deleteTonnage = async (id: string) => {
    const ton = tonnagesConfig.find((t) => t.id === id);
    if (ton) {
      const used = tarifsZone.filter((t) => t.tonnage === ton.label).length;
      if (used > 0) return toast.error(`Impossible de supprimer le tonnage "${ton.label}" : ${used} tarif(s) y font référence.`);
    }
    const { error } = await supabase.from("tonnages_config").delete().eq("id", id);
    if (error) return handleDbError(error);
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
