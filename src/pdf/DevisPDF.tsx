import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Devis } from "@/types/devis";
import type { PdfCompanySettings } from "@/hooks/use-pdf-company-settings";

const formatFCFA = (n: number) => {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(n || 0))
    .replace(/\u202F|\u00A0/g, " ");
  return formatted + " FCFA";
};

const formatDateFr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
};

const calcExpiration = (iso: string, jours: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + jours);
  return formatDateFr(d.toISOString());
};

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon — En attente de validation",
  SOUMIS_DG: "Soumis au DG — En attente d'approbation",
  APPROUVE_DG: "Approuvé par le DG — Prêt à être envoyé",
  ENVOYE_CLIENT: "Envoyé au client — En attente de réponse",
  VALIDE_CLIENT: "Accepté par le client — En attente de facturation",
  REFUSE_DG: "Devis refusé par le DG",
  REFUSE_CLIENT: "Devis refusé par le client",
  ARCHIVE: "Devis archivé",
};

const baseStyles = (couleur: string) => StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#111827", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
  watermark: { position: "absolute", top: 280, left: 150, width: 300, opacity: 0.04, zIndex: -1 },
  // Header
  header: { backgroundColor: couleur, paddingVertical: 28, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  // Status band
  statusBand: { backgroundColor: "#E1F5EE", paddingVertical: 7, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // Body
  body: { paddingVertical: 32, paddingHorizontal: 40 },
  partiesRow: { flexDirection: "row", marginBottom: 24 },
  partyBlock: { flex: 1, paddingHorizontal: 12 },
  partyLabel: { fontSize: 9, color: "#9CA3AF", letterSpacing: 1.2, marginBottom: 4 },
  partyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 4 },
  partyText: { fontSize: 10, color: "#6B7280", lineHeight: 1.6 },
  vSep: { width: 1, backgroundColor: "#F3F4F6" },
  hSep: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 24 },
  // Mission
  missionBlock: { borderLeftWidth: 3, borderLeftColor: couleur, backgroundColor: "#F9FAFB", borderTopRightRadius: 4, borderBottomRightRadius: 4, padding: 12, marginBottom: 20 },
  missionLabel: { fontSize: 10, color: couleur, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 8 },
  missionGrid: { flexDirection: "row", flexWrap: "wrap" },
  missionItem: { width: "33%", marginBottom: 8 },
  missionItemLabel: { fontSize: 9, color: "#9CA3AF" },
  missionItemValue: { fontSize: 10, color: "#374151", marginTop: 2 },
  // Table
  sectionLabel: { fontSize: 10, color: "#9CA3AF", letterSpacing: 1, marginBottom: 8 },
  thead: { backgroundColor: couleur, flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12 },
  th: { color: "#FFFFFF", fontSize: 10, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 10, paddingHorizontal: 12 },
  // Totaux
  totauxWrap: { alignSelf: "flex-end", width: 260, marginTop: 12 },
  totauxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 11, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  totauxTtc: { backgroundColor: couleur, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // Conditions
  conditions: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 4, padding: 14, marginTop: 20 },
  // Signatures
  signaturesRow: { flexDirection: "row", marginTop: 20 },
  signatureBox: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 4, padding: 14, alignItems: "center" },
  // Footer
  footer: { backgroundColor: "#F9FAFB", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingVertical: 12, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", position: "absolute", bottom: 0, left: 0, right: 0 },
});

interface Mission {
  embarquement?: string; livraison?: string; dateDepart?: string;
  duree?: string; marchandise?: string; tonnage?: string;
}

interface Props {
  devis: Devis;
  companySettings: PdfCompanySettings;
  validiteJours?: number;
  mission?: Mission;
  createdByName?: string;
}

export function DevisPDF({ devis, companySettings, validiteJours = 30, mission, createdByName = "—" }: Props) {
  const s = baseStyles(companySettings.couleurPrimaire);
  const cs = companySettings;
  const missionItems = mission ? [
    { label: "Embarquement", value: mission.embarquement },
    { label: "Livraison", value: mission.livraison },
    { label: "Date souhaitée", value: mission.dateDepart },
    { label: "Durée estimée", value: mission.duree },
    { label: "Marchandise", value: mission.marchandise },
    { label: "Tonnage", value: mission.tonnage },
  ].filter((i) => i.value && String(i.value).trim() !== "") : [];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {cs.logoUrl && <Image src={cs.logoUrl} style={s.watermark} />}

        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {cs.logoUrl ? (
              <>
                <Image src={cs.logoUrl} style={{ width: 140 }} />
                <Text style={{ fontSize: 9, color: "#9FE1CB", marginTop: 8, letterSpacing: 1.5 }}>{cs.adresse}</Text>
                <Text style={{ fontSize: 9, color: "#9FE1CB" }}>{cs.telephone} · {cs.email}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>{cs.nom}</Text>
                <Text style={{ fontSize: 10, color: "#9FE1CB", marginTop: 4, letterSpacing: 1.2 }}>{cs.slogan}</Text>
                <Text style={{ fontSize: 9, color: "#9FE1CB", marginTop: 10, lineHeight: 1.6 }}>{cs.adresse}</Text>
                <Text style={{ fontSize: 9, color: "#9FE1CB", lineHeight: 1.6 }}>{cs.telephone} · {cs.email}</Text>
              </>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 2 }}>DEVIS</Text>
            <Text style={{ fontSize: 13, color: "#9FE1CB", marginTop: 4 }}>Réf. {devis.reference || devis.id}</Text>
            <Text style={{ fontSize: 11, color: "#9FE1CB", marginTop: 2 }}>Émis le {formatDateFr(devis.createdAt)}</Text>
            
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 9, color: "#9FE1CB" }}>VALIDE JUSQU'AU</Text>
              <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>
                {calcExpiration(devis.createdAt, validiteJours)}
              </Text>
            </View>
          </View>
        </View>

        {/* STATUS BAND removed */}


        {/* BODY */}
        <View style={s.body}>
          {/* Destinataire */}
          <View style={{ marginBottom: 24 }}>
            <Text style={s.partyLabel}>DESTINATAIRE</Text>
            <Text style={s.partyName}>{devis.client?.nom || "—"}</Text>
            {devis.client?.adresse && <Text style={s.partyText}>{devis.client.adresse}</Text>}
            {(devis.client?.email || devis.client?.telephone) && (
              <Text style={s.partyText}>
                {[devis.client?.email, devis.client?.telephone].filter(Boolean).join(" · ")}
              </Text>
            )}
            {devis.client?.contact && (
              <Text style={[s.partyText, { marginTop: 4 }]}>À l'attention de : {devis.client.contact}</Text>
            )}
          </View>

          <View style={s.hSep} />

          {/* Mission */}
          {missionItems.length > 0 && (
            <View style={s.missionBlock}>
              <Text style={s.missionLabel}>DÉTAILS DE LA MISSION</Text>
              <View style={s.missionGrid}>
                {missionItems.map((m, i) => (
                  <View key={i} style={s.missionItem}>
                    <Text style={s.missionItemLabel}>{m.label}</Text>
                    <Text style={s.missionItemValue}>{m.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Prestations */}
          <Text style={s.sectionLabel}>PRESTATIONS</Text>
          <View style={s.thead}>
            <Text style={[s.th, { flex: 3 }]}>Description</Text>
            <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Qté</Text>
            <Text style={[s.th, { flex: 2, textAlign: "right" }]}>Prix unit.</Text>
            <Text style={[s.th, { flex: 2, textAlign: "right" }]}>Montant HT</Text>
          </View>
          {devis.lignes.map((l, i) => (
            <View key={l.id || i} style={[s.tr, { backgroundColor: i % 2 === 0 ? "#FAFAFA" : "#FFFFFF" }]}>
              <View style={{ flex: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" }}>{l.description}</Text>
              </View>
              <Text style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#6B7280" }}>{l.quantite}</Text>
              <Text style={{ flex: 2, textAlign: "right", fontSize: 11, color: "#6B7280" }}>{formatFCFA(l.prixUnitaire)}</Text>
              <Text style={{ flex: 2, textAlign: "right", fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" }}>
                {formatFCFA(l.quantite * l.prixUnitaire)}
              </Text>
            </View>
          ))}

          {/* Totaux */}
          <View style={s.totauxWrap}>
            <View style={s.totauxRow}>
              <Text>Sous-total HT</Text>
              <Text>{formatFCFA(devis.montantHT)}</Text>
            </View>
            {devis.montantRemise > 0 && (
              <>
                <View style={s.totauxRow}>
                  <Text style={{ color: "#DC2626" }}>
                    Remise{devis.typeRemise === "POURCENTAGE" ? ` (${devis.valeurRemise}%)` : ""}
                  </Text>
                  <Text style={{ color: "#DC2626" }}>- {formatFCFA(devis.montantRemise)}</Text>
                </View>
                <View style={s.totauxRow}>
                  <Text>Base imposable</Text>
                  <Text>{formatFCFA(devis.montantHT - devis.montantRemise)}</Text>
                </View>
              </>
            )}
            <View style={s.totauxRow}>
              <Text>TVA ({devis.tauxTva}%)</Text>
              <Text>{formatFCFA(devis.montantTva)}</Text>
            </View>
            <View style={s.totauxTtc}>
              <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>Total TTC</Text>
              <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>{formatFCFA(devis.montantTotal)}</Text>
            </View>
          </View>

          {/* Conditions */}
          <View style={s.conditions}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, marginBottom: 6 }}>CONDITIONS GÉNÉRALES</Text>
            <Text style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.7 }}>
              {(cs.conditionsDevis || "").replace(/\{validite\}/g, String(validiteJours)).replace(/\{tva\}/g, String(devis.tauxTva))}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={{ fontSize: 9, color: "#9CA3AF", lineHeight: 1.6, flex: 1 }}>
            {cs.nom} — {cs.adresse}{"\n"}
            RCCM {cs.rccm} · {cs.email} · {cs.siteWeb}
          </Text>
          <Text
            style={{ fontSize: 9, color: "#9CA3AF" }}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
