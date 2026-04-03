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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          enregistrement_id: string | null
          id: string
          ip_address: string | null
          table_cible: string | null
          user_email: string | null
          user_id: string
          user_nom: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          enregistrement_id?: string | null
          id?: string
          ip_address?: string | null
          table_cible?: string | null
          user_email?: string | null
          user_id: string
          user_nom?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          enregistrement_id?: string | null
          id?: string
          ip_address?: string | null
          table_cible?: string | null
          user_email?: string | null
          user_id?: string
          user_nom?: string | null
        }
        Relationships: []
      }
      camions: {
        Row: {
          annee: number
          capacite_tonnes: number
          created_at: string
          id: string
          immatriculation: string
          km_actuel: number
          marque: string
          modele: string
          statut: Database["public"]["Enums"]["statut_camion"]
          type_vehicule: string
          updated_at: string
        }
        Insert: {
          annee?: number
          capacite_tonnes?: number
          created_at?: string
          id?: string
          immatriculation: string
          km_actuel?: number
          marque: string
          modele: string
          statut?: Database["public"]["Enums"]["statut_camion"]
          type_vehicule?: string
          updated_at?: string
        }
        Update: {
          annee?: number
          capacite_tonnes?: number
          created_at?: string
          id?: string
          immatriculation?: string
          km_actuel?: number
          marque?: string
          modele?: string
          statut?: Database["public"]["Enums"]["statut_camion"]
          type_vehicule?: string
          updated_at?: string
        }
        Relationships: []
      }
      charges_fixes: {
        Row: {
          actif: boolean
          categorie: Database["public"]["Enums"]["categorie_charge"]
          created_at: string
          created_by: string | null
          designation: string
          id: string
          montant: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie?: Database["public"]["Enums"]["categorie_charge"]
          created_at?: string
          created_by?: string | null
          designation: string
          id?: string
          montant?: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: Database["public"]["Enums"]["categorie_charge"]
          created_at?: string
          created_by?: string | null
          designation?: string
          id?: string
          montant?: number
          updated_at?: string
        }
        Relationships: []
      }
      charges_mensuelles: {
        Row: {
          charge_fixe_id: string
          created_at: string
          created_by: string | null
          date_paiement: string | null
          id: string
          mois: string
          montant: number
          notes: string | null
          payee: boolean
          updated_at: string
        }
        Insert: {
          charge_fixe_id: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          id?: string
          mois: string
          montant?: number
          notes?: string | null
          payee?: boolean
          updated_at?: string
        }
        Update: {
          charge_fixe_id?: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          id?: string
          mois?: string
          montant?: number
          notes?: string | null
          payee?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_mensuelles_charge_fixe_id_fkey"
            columns: ["charge_fixe_id"]
            isOneToOne: false
            referencedRelation: "charges_fixes"
            referencedColumns: ["id"]
          },
        ]
      }
      chauffeurs: {
        Row: {
          camion_assigne_id: string | null
          created_at: string
          date_expiration_permis: string | null
          disponible: boolean
          experience_annees: number
          id: string
          nom: string
          numero_permis: string | null
          prenom: string
          statut: Database["public"]["Enums"]["statut_chauffeur"]
          telephone: string | null
          type_permis: string | null
          updated_at: string
        }
        Insert: {
          camion_assigne_id?: string | null
          created_at?: string
          date_expiration_permis?: string | null
          disponible?: boolean
          experience_annees?: number
          id?: string
          nom: string
          numero_permis?: string | null
          prenom: string
          statut?: Database["public"]["Enums"]["statut_chauffeur"]
          telephone?: string | null
          type_permis?: string | null
          updated_at?: string
        }
        Update: {
          camion_assigne_id?: string | null
          created_at?: string
          date_expiration_permis?: string | null
          disponible?: boolean
          experience_annees?: number
          id?: string
          nom?: string
          numero_permis?: string | null
          prenom?: string
          statut?: Database["public"]["Enums"]["statut_chauffeur"]
          telephone?: string | null
          type_permis?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chauffeurs_camion_assigne_id_fkey"
            columns: ["camion_assigne_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
        ]
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
      company_settings: {
        Row: {
          adresse: string | null
          categories_depenses: Json
          conditions_paiement: string | null
          created_at: string
          devise: string
          email: string | null
          format_date: string
          fuseau_horaire: string
          id: string
          langue: string
          logo_url: string | null
          modes_paiement: Json
          nom: string
          prefixe_decaissement: string
          prefixe_demande_achat: string
          prefixe_devis: string
          prefixe_facture: string
          prefixe_operation: string
          site_web: string | null
          taux_tva: number
          telephone: string | null
          types_prestations: Json
          types_vehicules: Json
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          categories_depenses?: Json
          conditions_paiement?: string | null
          created_at?: string
          devise?: string
          email?: string | null
          format_date?: string
          fuseau_horaire?: string
          id?: string
          langue?: string
          logo_url?: string | null
          modes_paiement?: Json
          nom?: string
          prefixe_decaissement?: string
          prefixe_demande_achat?: string
          prefixe_devis?: string
          prefixe_facture?: string
          prefixe_operation?: string
          site_web?: string | null
          taux_tva?: number
          telephone?: string | null
          types_prestations?: Json
          types_vehicules?: Json
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          categories_depenses?: Json
          conditions_paiement?: string | null
          created_at?: string
          devise?: string
          email?: string | null
          format_date?: string
          fuseau_horaire?: string
          id?: string
          langue?: string
          logo_url?: string | null
          modes_paiement?: Json
          nom?: string
          prefixe_decaissement?: string
          prefixe_demande_achat?: string
          prefixe_devis?: string
          prefixe_facture?: string
          prefixe_operation?: string
          site_web?: string | null
          taux_tva?: number
          telephone?: string | null
          types_prestations?: Json
          types_vehicules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      decaissements: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          date_paiement: string | null
          demande_achat_id: string | null
          devis_fournisseur_id: string | null
          id: string
          montant: number
          motif: string | null
          operation_id: string | null
          reference: string
          reference_paiement: string | null
          statut: Database["public"]["Enums"]["statut_decaissement"]
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          demande_achat_id?: string | null
          devis_fournisseur_id?: string | null
          id?: string
          montant?: number
          motif?: string | null
          operation_id?: string | null
          reference?: string
          reference_paiement?: string | null
          statut?: Database["public"]["Enums"]["statut_decaissement"]
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          demande_achat_id?: string | null
          devis_fournisseur_id?: string | null
          id?: string
          montant?: number
          motif?: string | null
          operation_id?: string | null
          reference?: string
          reference_paiement?: string | null
          statut?: Database["public"]["Enums"]["statut_decaissement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decaissements_demande_achat_id_fkey"
            columns: ["demande_achat_id"]
            isOneToOne: false
            referencedRelation: "demandes_achat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decaissements_devis_fournisseur_id_fkey"
            columns: ["devis_fournisseur_id"]
            isOneToOne: false
            referencedRelation: "devis_fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decaissements_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_achat: {
        Row: {
          commentaire_dg: string | null
          created_at: string
          created_by: string | null
          description: string
          designation: string
          id: string
          maintenance_id: string | null
          montant_estime: number
          quantite: number
          reference: string
          statut: Database["public"]["Enums"]["statut_demande_achat"]
          updated_at: string
          urgence: string
        }
        Insert: {
          commentaire_dg?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          designation?: string
          id?: string
          maintenance_id?: string | null
          montant_estime?: number
          quantite?: number
          reference: string
          statut?: Database["public"]["Enums"]["statut_demande_achat"]
          updated_at?: string
          urgence?: string
        }
        Update: {
          commentaire_dg?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          designation?: string
          id?: string
          maintenance_id?: string | null
          montant_estime?: number
          quantite?: number
          reference?: string
          statut?: Database["public"]["Enums"]["statut_demande_achat"]
          updated_at?: string
          urgence?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_achat_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
        ]
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
          montant_ht: number
          montant_remise: number
          montant_tva: number
          reference: string
          statut: Database["public"]["Enums"]["statut_devis"]
          taux_tva: number
          type_remise: string
          updated_at: string
          valeur_remise: number
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
          montant_ht?: number
          montant_remise?: number
          montant_tva?: number
          reference: string
          statut?: Database["public"]["Enums"]["statut_devis"]
          taux_tva?: number
          type_remise?: string
          updated_at?: string
          valeur_remise?: number
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
          montant_ht?: number
          montant_remise?: number
          montant_tva?: number
          reference?: string
          statut?: Database["public"]["Enums"]["statut_devis"]
          taux_tva?: number
          type_remise?: string
          updated_at?: string
          valeur_remise?: number
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
      devis_fournisseurs: {
        Row: {
          commentaire: string | null
          conditions: string | null
          created_at: string
          created_by: string | null
          delai_livraison_jours: number | null
          demande_achat_id: string
          document_url: string | null
          fournisseur_id: string
          id: string
          montant: number
          retenu: boolean
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          delai_livraison_jours?: number | null
          demande_achat_id: string
          document_url?: string | null
          fournisseur_id: string
          id?: string
          montant?: number
          retenu?: boolean
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          delai_livraison_jours?: number | null
          demande_achat_id?: string
          document_url?: string | null
          fournisseur_id?: string
          id?: string
          montant?: number
          retenu?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_fournisseurs_demande_achat_id_fkey"
            columns: ["demande_achat_id"]
            isOneToOne: false
            referencedRelation: "demandes_achat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_fournisseurs_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      employes: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          id: string
          nom: string
          poste: string
          prenom: string
          salaire_base: number
          taux_cotisations: number
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nom: string
          poste?: string
          prenom: string
          salaire_base?: number
          taux_cotisations?: number
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nom?: string
          poste?: string
          prenom?: string
          salaire_base?: number
          taux_cotisations?: number
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      evenements_calendrier: {
        Row: {
          couleur: string | null
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          description: string | null
          id: string
          lieu: string | null
          rappel_envoye: boolean
          rappel_minutes: number | null
          titre: string
          toute_journee: boolean
          type_evenement: Database["public"]["Enums"]["type_evenement"]
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          description?: string | null
          id?: string
          lieu?: string | null
          rappel_envoye?: boolean
          rappel_minutes?: number | null
          titre: string
          toute_journee?: boolean
          type_evenement?: Database["public"]["Enums"]["type_evenement"]
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          description?: string | null
          id?: string
          lieu?: string | null
          rappel_envoye?: boolean
          rappel_minutes?: number | null
          titre?: string
          toute_journee?: boolean
          type_evenement?: Database["public"]["Enums"]["type_evenement"]
          updated_at?: string
        }
        Relationships: []
      }
      factures: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_emission: string
          date_paiement: string | null
          id: string
          mode_paiement: string | null
          montant_ht: number
          montant_paye: number
          montant_ttc: number
          montant_tva: number
          notes: string | null
          operation_id: string | null
          reference: string
          reference_paiement: string | null
          statut: Database["public"]["Enums"]["statut_facture"]
          taux_tva: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_paye?: number
          montant_ttc?: number
          montant_tva?: number
          notes?: string | null
          operation_id?: string | null
          reference: string
          reference_paiement?: string | null
          statut?: Database["public"]["Enums"]["statut_facture"]
          taux_tva?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_paye?: number
          montant_ttc?: number
          montant_tva?: number
          notes?: string | null
          operation_id?: string | null
          reference?: string
          reference_paiement?: string | null
          statut?: Database["public"]["Enums"]["statut_facture"]
          taux_tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs: {
        Row: {
          actif: boolean
          adresse: string | null
          categorie: Database["public"]["Enums"]["categorie_fournisseur"]
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
          actif?: boolean
          adresse?: string | null
          categorie?: Database["public"]["Enums"]["categorie_fournisseur"]
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
          actif?: boolean
          adresse?: string | null
          categorie?: Database["public"]["Enums"]["categorie_fournisseur"]
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
      grille_tarifaire: {
        Row: {
          actif: boolean
          categorie: string
          created_at: string
          designation: string
          id: string
          prix_unitaire: number
          unite: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie?: string
          created_at?: string
          designation: string
          id?: string
          prix_unitaire?: number
          unite?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          created_at?: string
          designation?: string
          id?: string
          prix_unitaire?: number
          unite?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          created_at: string
          created_by: string | null
          date_incident: string
          description: string
          gravite: Database["public"]["Enums"]["gravite_incident"]
          id: string
          operation_id: string
          resolu: boolean
          type: Database["public"]["Enums"]["type_incident"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_incident?: string
          description?: string
          gravite?: Database["public"]["Enums"]["gravite_incident"]
          id?: string
          operation_id: string
          resolu?: boolean
          type?: Database["public"]["Enums"]["type_incident"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_incident?: string
          description?: string
          gravite?: Database["public"]["Enums"]["gravite_incident"]
          id?: string
          operation_id?: string
          resolu?: boolean
          type?: Database["public"]["Enums"]["type_incident"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
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
      maintenances: {
        Row: {
          camion_id: string
          cout_estime: number
          cout_reel: number | null
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          date_prevue: string
          description: string
          id: string
          km_declenchement: number | null
          pieces_changees: string | null
          statut: Database["public"]["Enums"]["statut_maintenance"]
          type: Database["public"]["Enums"]["type_maintenance"]
          updated_at: string
        }
        Insert: {
          camion_id: string
          cout_estime?: number
          cout_reel?: number | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prevue?: string
          description?: string
          id?: string
          km_declenchement?: number | null
          pieces_changees?: string | null
          statut?: Database["public"]["Enums"]["statut_maintenance"]
          type?: Database["public"]["Enums"]["type_maintenance"]
          updated_at?: string
        }
        Update: {
          camion_id?: string
          cout_estime?: number
          cout_reel?: number | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prevue?: string
          description?: string
          id?: string
          km_declenchement?: number | null
          pieces_changees?: string | null
          statut?: Database["public"]["Enums"]["statut_maintenance"]
          type?: Database["public"]["Enums"]["type_maintenance"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lien: string | null
          lue: boolean
          message: string
          titre: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lien?: string | null
          lue?: boolean
          message?: string
          titre: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lien?: string | null
          lue?: boolean
          message?: string
          titre?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          bon_livraison_url: string | null
          camion_id: string | null
          chauffeur_id: string | null
          client_id: string | null
          client_nom: string
          commentaires: string | null
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
          nature_marchandise: string | null
          nombre_colis: number | null
          poids_kg: number | null
          precautions: string | null
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
          commentaires?: string | null
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
          nature_marchandise?: string | null
          nombre_colis?: number | null
          poids_kg?: number | null
          precautions?: string | null
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
          commentaires?: string | null
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
          nature_marchandise?: string | null
          nombre_colis?: number | null
          poids_kg?: number | null
          precautions?: string | null
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
      salaires_mensuels: {
        Row: {
          avances: number
          cotisations: number
          created_at: string
          created_by: string | null
          date_paiement: string | null
          employe_id: string
          id: string
          mois: string
          net_a_payer: number
          notes: string | null
          paye: boolean
          primes: number
          salaire_base: number
          updated_at: string
        }
        Insert: {
          avances?: number
          cotisations?: number
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          employe_id: string
          id?: string
          mois: string
          net_a_payer?: number
          notes?: string | null
          paye?: boolean
          primes?: number
          salaire_base?: number
          updated_at?: string
        }
        Update: {
          avances?: number
          cotisations?: number
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          employe_id?: string
          id?: string
          mois?: string
          net_a_payer?: number
          notes?: string | null
          paye?: boolean
          primes?: number
          salaire_base?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salaires_mensuels_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
        ]
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
      notify_role: {
        Args: {
          _lien?: string
          _message: string
          _role: Database["public"]["Enums"]["app_role"]
          _titre: string
          _type?: string
        }
        Returns: undefined
      }
      recalculate_camion_statut: {
        Args: { p_camion_id: string }
        Returns: undefined
      }
      recalculate_chauffeur_statut: {
        Args: { p_chauffeur_id: string }
        Returns: undefined
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
        | "MAINTENANCE"
        | "ADMIN"
      categorie_charge:
        | "LOYER"
        | "SALAIRES"
        | "ASSURANCES_TAXES"
        | "CARBURANT_ENTRETIEN"
        | "AUTRE"
      categorie_depense: "CARBURANT" | "PEAGE" | "TAXE" | "AUTRE"
      categorie_fournisseur:
        | "PIECES_AUTO"
        | "CARBURANT"
        | "PNEUMATIQUES"
        | "SERVICES"
        | "AUTRE"
      gravite_incident: "FAIBLE" | "MOYENNE" | "CRITIQUE"
      statut_camion: "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE"
      statut_chauffeur:
        | "DISPONIBLE"
        | "EN_MISSION"
        | "EN_REPOS"
        | "INDISPONIBLE"
      statut_decaissement: "EN_ATTENTE" | "APPROUVE" | "PAYE" | "REJETE"
      statut_demande_achat:
        | "BROUILLON"
        | "SOUMISE"
        | "DEVIS_EN_COURS"
        | "SOUMISE_DG"
        | "VALIDEE_DG"
        | "REFUSEE_DG"
        | "DECAISSEMENT"
        | "PAYEE"
        | "CLOTUREE"
      statut_devis:
        | "BROUILLON"
        | "SOUMIS_DG"
        | "APPROUVE_DG"
        | "REFUSE_DG"
        | "ENVOYE_CLIENT"
        | "VALIDE_CLIENT"
        | "REFUSE_CLIENT"
        | "ARCHIVE"
      statut_facture:
        | "BROUILLON"
        | "ENVOYEE"
        | "PARTIELLEMENT_PAYEE"
        | "PAYEE"
        | "ANNULEE"
      statut_maintenance: "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE"
      statut_operation:
        | "DEMANDE"
        | "PLANIFIEE"
        | "EN_COURS"
        | "TERMINEE"
        | "ARCHIVEE"
      type_evenement: "REUNION" | "RDV" | "DEPLACEMENT" | "RAPPEL" | "AUTRE"
      type_incident: "PANNE" | "ACCIDENT" | "RETARD" | "VOL" | "AUTRE"
      type_maintenance: "PREVENTIVE" | "CORRECTIVE" | "REMPLACEMENT"
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
        "MAINTENANCE",
        "ADMIN",
      ],
      categorie_charge: [
        "LOYER",
        "SALAIRES",
        "ASSURANCES_TAXES",
        "CARBURANT_ENTRETIEN",
        "AUTRE",
      ],
      categorie_depense: ["CARBURANT", "PEAGE", "TAXE", "AUTRE"],
      categorie_fournisseur: [
        "PIECES_AUTO",
        "CARBURANT",
        "PNEUMATIQUES",
        "SERVICES",
        "AUTRE",
      ],
      gravite_incident: ["FAIBLE", "MOYENNE", "CRITIQUE"],
      statut_camion: ["DISPONIBLE", "EN_MISSION", "EN_MAINTENANCE"],
      statut_chauffeur: [
        "DISPONIBLE",
        "EN_MISSION",
        "EN_REPOS",
        "INDISPONIBLE",
      ],
      statut_decaissement: ["EN_ATTENTE", "APPROUVE", "PAYE", "REJETE"],
      statut_demande_achat: [
        "BROUILLON",
        "SOUMISE",
        "DEVIS_EN_COURS",
        "SOUMISE_DG",
        "VALIDEE_DG",
        "REFUSEE_DG",
        "DECAISSEMENT",
        "PAYEE",
        "CLOTUREE",
      ],
      statut_devis: [
        "BROUILLON",
        "SOUMIS_DG",
        "APPROUVE_DG",
        "REFUSE_DG",
        "ENVOYE_CLIENT",
        "VALIDE_CLIENT",
        "REFUSE_CLIENT",
        "ARCHIVE",
      ],
      statut_facture: [
        "BROUILLON",
        "ENVOYEE",
        "PARTIELLEMENT_PAYEE",
        "PAYEE",
        "ANNULEE",
      ],
      statut_maintenance: ["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"],
      statut_operation: [
        "DEMANDE",
        "PLANIFIEE",
        "EN_COURS",
        "TERMINEE",
        "ARCHIVEE",
      ],
      type_evenement: ["REUNION", "RDV", "DEPLACEMENT", "RAPPEL", "AUTRE"],
      type_incident: ["PANNE", "ACCIDENT", "RETARD", "VOL", "AUTRE"],
      type_maintenance: ["PREVENTIVE", "CORRECTIVE", "REMPLACEMENT"],
    },
  },
} as const
