import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Truck, Receipt, Users, Wallet, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SearchResult {
  id: string;
  label: string;
  subtitle: string;
  category: string;
  icon: LucideIcon;
  path: string;
}

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const pattern = `%${q}%`;

      const [devisRes, opsRes, facturesRes, clientsRes, decRes, daRes] = await Promise.all([
        supabase
          .from("devis")
          .select("id, reference, description, montant, statut")
          .or(`reference.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("operations")
          .select("id, reference, client_nom, lieu_embarquement, lieu_livraison, statut")
          .or(`reference.ilike.${pattern},client_nom.ilike.${pattern},lieu_embarquement.ilike.${pattern},lieu_livraison.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("factures")
          .select("id, reference, montant_ttc, statut")
          .or(`reference.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("clients")
          .select("id, nom, contact, telephone")
          .or(`nom.ilike.${pattern},contact.ilike.${pattern},telephone.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("decaissements")
          .select("id, reference, motif, montant, statut")
          .or(`reference.ilike.${pattern},motif.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("demandes_achat")
          .select("id, reference, designation, statut")
          .or(`reference.ilike.${pattern},designation.ilike.${pattern}`)
          .limit(5),
      ]);

      const items: SearchResult[] = [];

      (devisRes.data || []).forEach((d) =>
        items.push({
          id: d.id,
          label: d.reference,
          subtitle: d.description || `${d.montant?.toLocaleString("fr-FR")} FCFA`,
          category: "Devis",
          icon: FileText,
          path: `/devis/${d.id}`,
        })
      );

      (opsRes.data || []).forEach((o) =>
        items.push({
          id: o.id,
          label: o.reference,
          subtitle: `${o.client_nom} — ${o.lieu_embarquement?.split(",")[0]} → ${o.lieu_livraison?.split(",")[0]}`,
          category: "Opérations",
          icon: Truck,
          path: `/operations`,
        })
      );

      (facturesRes.data || []).forEach((f) =>
        items.push({
          id: f.id,
          label: f.reference,
          subtitle: `${f.montant_ttc?.toLocaleString("fr-FR")} FCFA — ${f.statut}`,
          category: "Factures",
          icon: Receipt,
          path: `/factures`,
        })
      );

      (clientsRes.data || []).forEach((c) =>
        items.push({
          id: c.id,
          label: c.nom,
          subtitle: [c.contact, c.telephone].filter(Boolean).join(" — ") || "Client",
          category: "Clients",
          icon: Users,
          path: `/clients`,
        })
      );

      (decRes.data || []).forEach((d) =>
        items.push({
          id: d.id,
          label: d.reference,
          subtitle: `${d.montant?.toLocaleString("fr-FR")} FCFA — ${d.motif || d.statut}`,
          category: "Décaissements",
          icon: Wallet,
          path: `/factures`,
        })
      );

      (daRes.data || []).forEach((d) =>
        items.push({
          id: d.id,
          label: d.reference,
          subtitle: d.designation || d.statut,
          category: "Demandes d'achat",
          icon: ShoppingCart,
          path: `/achats`,
        })
      );

      setResults(items);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading };
}
