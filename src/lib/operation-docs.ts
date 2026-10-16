import { supabase } from "@/integrations/supabase/client";

export type OperationDocBucket = "bon-commande" | "bon-livraison";

const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Les buckets bon-commande et bon-livraison étaient publics à l'origine : les
 * opérations créées avant leur passage en privé ont une URL publique complète
 * dans bon_commande_url / bon_livraison_url, les suivantes un simple chemin de
 * stockage. On accepte les deux formes pour ne pas réécrire l'historique.
 */
export function toStoragePath(bucket: OperationDocBucket, value: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = value.indexOf(marker);
  return i === -1 ? value : value.slice(i + marker.length);
}

export function docFileName(value: string): string {
  return value.split("?")[0].split("/").pop() || value;
}

/** URL signée valable 1h, ou null si l'accès est refusé ou le fichier absent. */
export async function getOperationDocUrl(
  bucket: OperationDocBucket,
  value: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(toStoragePath(bucket, value), SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl || null;
}
