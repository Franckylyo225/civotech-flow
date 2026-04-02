import { supabase } from "@/integrations/supabase/client";

// Seed script — run once to populate initial data
export async function seedDatabase() {
  // Check if already seeded
  const { data: existing } = await supabase.from("camions").select("id").limit(1);
  if (existing && existing.length > 0) {
    console.log("Database already seeded");
    return;
  }

  // Seed camions
  await supabase.from("camions").insert([
    { immatriculation: "AB-1234-CI", marque: "Renault", modele: "T480", capacite_tonnes: 25, annee: 2022, statut: "DISPONIBLE" as any },
    { immatriculation: "AB-5678-CI", marque: "Mercedes", modele: "Actros 2645", capacite_tonnes: 30, annee: 2021, statut: "DISPONIBLE" as any },
    { immatriculation: "AB-9012-CI", marque: "Iveco", modele: "Stralis 460", capacite_tonnes: 28, annee: 2023, statut: "DISPONIBLE" as any },
    { immatriculation: "CD-3456-CI", marque: "MAN", modele: "TGS 26.440", capacite_tonnes: 26, annee: 2020, statut: "EN_MAINTENANCE" as any },
    { immatriculation: "CD-7890-CI", marque: "Scania", modele: "R450", capacite_tonnes: 32, annee: 2023, statut: "DISPONIBLE" as any },
  ]);

  // Seed chauffeurs
  await supabase.from("chauffeurs").insert([
    { nom: "Koné", prenom: "Ibrahim", telephone: "+225 07 12 34 56", numero_permis: "CI-2020-45678", disponible: true },
    { nom: "Traoré", prenom: "Moussa", telephone: "+225 05 98 76 54", numero_permis: "CI-2019-32145", disponible: true },
    { nom: "Diallo", prenom: "Seydou", telephone: "+225 01 45 67 89", numero_permis: "CI-2021-78901", disponible: true },
    { nom: "Ouattara", prenom: "Bakary", telephone: "+225 07 65 43 21", numero_permis: "CI-2022-11234", disponible: true },
  ]);

  console.log("Database seeded successfully");
}
