import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlatformSettings {
  id: string;
  demo_mode_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  updated_at: string;
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();
    setSettings(data as PlatformSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = useCallback(async (patch: Partial<PlatformSettings>) => {
    if (!settings) return;
    const { error } = await supabase
      .from("platform_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", settings.id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Paramètres mis à jour");
    fetchSettings();
  }, [settings, fetchSettings]);

  return { settings, loading, update, refresh: fetchSettings };
}
