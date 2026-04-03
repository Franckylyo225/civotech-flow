export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      camions: {
        Row: {
          annee: number
          capacite_tonnes: number
          created_at: string
          id: string
          immatriculation: string
          marque: string
          modele: string
          statut: Database["public"]["Enums"]["statut_camion"]
          updated_at: string
        }
        Insert: {
          annee?: number
          capacite_tonnes?: number
          created_at?: string
          id?: string
          immatriculation: string
          marque: string
          modele: string
          statut?: Database["public"]["Enums"]["statut_camion"]
          updated_at?: string
        }
        Update: {
          annee?: number
          capacite_tonnes?: number
          created_at?: string
          id?: string
          immatriculation?: string
          marque?: string
          modele?: string
          statut?: Database["public"]["Enums"]["statut_camion"]
          updated_at?: string
        }
        Relationships: []
      }
      chauffeurs: {
        Row: {
          created_at: string
          disponible: boolean
          id: string
          nom: string
          numero_permis: string | null
          prenom: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disponible?: boolean
          id?: string
          nom: string
          numero_permis?: string | null
          prenom: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disponible?: boolean
          id?: string
          nom?: string
          numero_permis?: string | null
          prenom?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          adresse: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nom: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      depenses: {
        Row: {
          categorie: Database["public"]["Enums"]["categorie_depense"]
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          montant: number
          operation_id: string
        }
        Insert: {
          categorie?: Database["public"]["Enums"]["categorie_depense"]
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          montant?: number
          operation_id: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["categorie_depense"]
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          montant?: number
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          client_id: string | null
          commentaire_refus: string | null
          commercial_id: string | null
          created_at: string
          date_validite: string | null
          description: string | null
          id: string
          montant: number
          reference: string
          statut: Database["public"]["Enums"]["statut_devis"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          commentaire_refus?: string | null
          commercial_id?: string | null
          created_at?: string
          date_validite?: string | null
          description?: string | null
          id?: string
          montant?: number
          reference: string
          statut?: Database["public"]["Enums"]["statut_devis"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          commentaire_refus?: string | null
          commercial_id?: string | null
          created_at?: string
          date_validite?: string | null
          description?: string | null
          id?: string
          montant?: number
          reference?: string
          statut?: Database["public"]["Enums"]["statut_devis"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes_devis: {
        Row: {
          created_at: string
          description: string
          devis_id: string
          id: string
          montant: number
          prix_unitaire: number
          quantite: number
        }
        Insert: {
          created_at?: string
          description?: string
          devis_id: string
          id?: string
          montant?: number
          prix_unitaire?: number
          quantite?: number
        }
        Update: {
          created_at?: string
          description?: string
          devis_id?: string
          id?: string
          montant?: number
          prix_unitaire?: number
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "lignes_devis_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          bon_livraison_url: string | null
          camion_id: string | null
          chauffeur_id: string | null
          client_id: string | null
          client_nom: string
          created_at: string
          created_by: string | null
          date_depart: string | null
          date_livraison_estimee: string | null
          date_livraison_reelle: string | null
          devis_id: string | null
          devis_reference: string | null
          duree_estimee_heures: number | null
          id: string
          lieu_embarquement: string
          lieu_livraison: string
          montant_devis: number
          nombre_colis: number | null
          poids_kg: number | null
          reference: string
          statut: Database["public"]["Enums"]["statut_operation"]
          updated_at: string
        }
        Insert: {
          bon_livraison_url?: string | null
          camion_id?: string | null
          chauffeur_id?: string | null
          client_id?: string | null
          client_nom?: string
          created_at?: string
          created_by?: string | null
          date_depart?: string | null
          date_livraison_estimee?: string | null
          date_livraison_reelle?: string | null
          devis_id?: string | null
          devis_reference?: string | null
          duree_estimee_heures?: number | null
          id?: string
          lieu_embarquement?: string
          lieu_livraison?: string
          montant_devis?: number
          nombre_colis?: number | null
          poids_kg?: number | null
          reference: string
          statut?: Database["public"]["Enums"]["statut_operation"]
          updated_at?: string
        }
        Update: {
          bon_livraison_url?: string | null
          camion_id?: string | null
          chauffeur_id?: string | null
          client_id?: string | null
          client_nom?: string
          created_at?: string
          created_by?: string | null
          date_depart?: string | null
          date_livraison_estimee?: string | null
          date_livraison_reelle?: string | null
          devis_id?: string | null
          devis_reference?: string | null
          duree_estimee_heures?: number | null
          id?: string
          lieu_embarquement?: string
          lieu_livraison?: string
          montant_devis?: number
          nombre_colis?: number | null
          poids_kg?: number | null
          reference?: string
          statut?: Database["public"]["Enums"]["statut_operation"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nom: string
          prenom: string
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          date: string
          description: string
          heure: string
          id: string
          operation_id: string
          statut: string
          titre: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string
          heure?: string
          id?: string
          operation_id: string
          statut?: string
          titre?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          heure?: string
          id?: string
          operation_id?: string
          statut?: string
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "DG"
        | "COMMERCIAL"
        | "LOGISTIQUE"
        | "FINANCE"
        | "ACHATS"
        | "ASSISTANTE"
      categorie_depense: "CARBURANT" | "PEAGE" | "TAXE" | "AUTRE"
      statut_camion: "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE"
      statut_devis:
        | "BROUILLON"
        | "SOUMIS_DG"
        | "APPROUVE_DG"
        | "REFUSE_DG"
        | "ENVOYE_CLIENT"
        | "VALIDE_CLIENT"
        | "REFUSE_CLIENT"
      statut_operation:
        | "DEMANDE"
        | "PLANIFIEE"
        | "EN_COURS"
        | "TERMINEE"
        | "ARCHIVEE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "DG",
        "COMMERCIAL",
        "LOGISTIQUE",
        "FINANCE",
        "ACHATS",
        "ASSISTANTE",
      ],
      categorie_depense: ["CARBURANT", "PEAGE", "TAXE", "AUTRE"],
      statut_camion: ["DISPONIBLE", "EN_MISSION", "EN_MAINTENANCE"],
      statut_devis: [
        "BROUILLON",
        "SOUMIS_DG",
        "APPROUVE_DG",
        "REFUSE_DG",
        "ENVOYE_CLIENT",
        "VALIDE_CLIENT",
        "REFUSE_CLIENT",
      ],
      statut_operation: [
        "DEMANDE",
        "PLANIFIEE",
        "EN_COURS",
        "TERMINEE",
        "ARCHIVEE",
      ],
    },
  },
} as const
