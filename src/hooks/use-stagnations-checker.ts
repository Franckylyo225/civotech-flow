import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const SESSION_KEY = "stagnations_checked_at";
const THROTTLE_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Déclenche la vérification des devis stagnants (>7j) et demandes d'achat (>30j)
 * et crée les notifications correspondantes. Throttle 6h par session.
 */
export function useStagnationsChecker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const last = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;

    sessionStorage.setItem(SESSION_KEY, String(Date.now()));

    supabase.functions.invoke("check-stagnations").catch((err) => {
      console.warn("[stagnations] check failed:", err?.message);
    });
  }, [user]);
}
