import { useEffect, useState, useCallback } from "react";
import { useCompanySettings } from "@/hooks/use-company-settings";

export interface PdfCompanySettings {
  logoUrl: string | null;
  nom: string;
  slogan: string;
  adresse: string;
  ville: string;
  bp: string;
  pays: string;
  telephone: string;
  email: string;
  siteWeb: string;
  rccm: string;
  ncc: string;
  tva: string;
  couleurPrimaire: string;
}

const STORAGE_KEY = "civotech_pdf_settings";

const DEFAULTS: PdfCompanySettings = {
  logoUrl: null,
  nom: "Civotech SARL",
  slogan: "Transport & Logistique",
  adresse: "Zone Industrielle de Yopougon, Abidjan",
  ville: "Abidjan",
  bp: "01 BP 1234 Abidjan 01",
  pays: "Côte d'Ivoire",
  telephone: "+225 27 22 00 00 00",
  email: "contact@civotech.ci",
  siteWeb: "www.civotech.ci",
  rccm: "CI-ABJ-2018-B-12345",
  ncc: "0123456789",
  tva: "CI-2018-00123",
  couleurPrimaire: "#0F6E56",
};

function readLocal(): Partial<PdfCompanySettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function usePdfCompanySettings() {
  const { settings: dbSettings } = useCompanySettings();
  const [local, setLocal] = useState<Partial<PdfCompanySettings>>(() => readLocal());

  useEffect(() => {
    const onStorage = () => setLocal(readLocal());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const settings: PdfCompanySettings = {
    ...DEFAULTS,
    ...(dbSettings && {
      nom: dbSettings.nom || DEFAULTS.nom,
      adresse: dbSettings.adresse || DEFAULTS.adresse,
      telephone: dbSettings.telephone || DEFAULTS.telephone,
      email: dbSettings.email || DEFAULTS.email,
      siteWeb: dbSettings.site_web || DEFAULTS.siteWeb,
    }),
    ...local,
  };

  const update = useCallback((patch: Partial<PdfCompanySettings>) => {
    setLocal((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { settings, update };
}
