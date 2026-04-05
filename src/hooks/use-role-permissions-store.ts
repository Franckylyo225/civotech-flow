import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RolePermission {
  id: string;
  role_key: string;
  module: string;
  permissions: string[];
}

export interface CustomRole {
  id: string;
  nom: string;
  description: string;
  role_base: string;
  actif: boolean;
  created_at: string;
}

const MODULES = [
  "Tableau de bord",
  "Devis",
  "Opérations",
  "Clients",
  "Finance",
  "Achats",
  "Parc auto",
  "Maintenance",
  "Rapports",
  "Paramètres",
] as const;

const ALL_PERMISSIONS = ["lecture", "creation", "modification", "validation", "suppression"] as const;

export function useRolePermissionsStore() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [permRes, rolesRes] = await Promise.all([
      supabase.from("role_permissions").select("*").order("role_key"),
      supabase.from("custom_roles").select("*").order("nom"),
    ]);
    if (permRes.data) setPermissions(permRes.data as RolePermission[]);
    if (rolesRes.data) setCustomRoles(rolesRes.data as CustomRole[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getPermissions = useCallback(
    (roleKey: string, module: string): string[] => {
      const found = permissions.find(p => p.role_key === roleKey && p.module === module);
      return found?.permissions || [];
    },
    [permissions]
  );

  const updatePermissions = useCallback(
    async (roleKey: string, module: string, perms: string[]) => {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(
          { role_key: roleKey, module, permissions: perms },
          { onConflict: "role_key,module" }
        );
      if (error) {
        toast.error("Erreur lors de la mise à jour des permissions");
        return;
      }
      setPermissions(prev => {
        const idx = prev.findIndex(p => p.role_key === roleKey && p.module === module);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], permissions: perms };
          return copy;
        }
        return [...prev, { id: "", role_key: roleKey, module, permissions: perms }];
      });
    },
    []
  );

  const createCustomRole = useCallback(
    async (data: { nom: string; description: string; role_base: string }) => {
      const { data: newRole, error } = await supabase
        .from("custom_roles")
        .insert(data)
        .select()
        .single();
      if (error) {
        toast.error(error.message.includes("unique") ? "Ce nom de rôle existe déjà" : error.message);
        return null;
      }
      // Init permissions for this custom role with empty arrays for all modules
      const inserts = MODULES.map(m => ({
        role_key: data.nom,
        module: m,
        permissions: [] as string[],
      }));
      await supabase.from("role_permissions").insert(inserts);
      await fetchAll();
      toast.success(`Rôle "${data.nom}" créé`);
      return newRole;
    },
    [fetchAll]
  );

  const deleteCustomRole = useCallback(
    async (roleId: string, roleName: string) => {
      await supabase.from("role_permissions").delete().eq("role_key", roleName);
      const { error } = await supabase.from("custom_roles").delete().eq("id", roleId);
      if (error) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      await fetchAll();
      toast.success(`Rôle "${roleName}" supprimé`);
    },
    [fetchAll]
  );

  return {
    permissions,
    customRoles,
    loading,
    getPermissions,
    updatePermissions,
    createCustomRole,
    deleteCustomRole,
    MODULES,
    ALL_PERMISSIONS,
    refresh: fetchAll,
  };
}
