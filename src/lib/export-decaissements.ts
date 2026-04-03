import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { DecaissementRow } from "@/hooks/use-decaissements-store";
import { STATUT_DECAISSEMENT_CONFIG } from "@/hooks/use-decaissements-store";

interface ExportOptions {
  data: DecaissementRow[];
  getLinkedLabel: (d: DecaissementRow) => string;
}

export function exportDecaissementsPdf({ data, getLinkedLabel }: ExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("CIVOTECH", margin, 20);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text("Liste des décaissements", margin, 30);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exporté le ${format(new Date(), "dd/MM/yyyy à HH:mm")}`, margin, 36);
  doc.text(`${data.length} décaissement(s)`, margin, 41);

  const totalPaye = data.filter(d => d.statut === "PAYE").reduce((s, d) => s + d.montant, 0);
  const totalEnAttente = data.filter(d => d.statut === "EN_ATTENTE" || d.statut === "APPROUVE").reduce((s, d) => s + d.montant, 0);
  doc.text(`Total payé : ${totalPaye.toLocaleString()} F  |  En attente : ${totalEnAttente.toLocaleString()} F`, margin, 46);

  // Table
  autoTable(doc, {
    startY: 52,
    head: [["Référence", "Motif", "Lié à", "Montant (F)", "Statut", "Date"]],
    body: data.map(d => [
      d.reference,
      d.motif || "—",
      getLinkedLabel(d),
      d.montant.toLocaleString(),
      STATUT_DECAISSEMENT_CONFIG[d.statut].label,
      d.date_paiement ? format(new Date(d.date_paiement), "dd/MM/yyyy") : format(new Date(d.created_at), "dd/MM/yyyy"),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: margin, right: margin },
  });

  doc.save(`decaissements_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function exportDecaissementsExcel({ data, getLinkedLabel }: ExportOptions) {
  const headers = ["Référence", "Motif", "Lié à", "Montant (F)", "Statut", "Date création", "Date paiement", "Réf paiement", "Commentaire"];
  const rows = data.map(d => [
    d.reference,
    d.motif || "",
    getLinkedLabel(d),
    d.montant,
    STATUT_DECAISSEMENT_CONFIG[d.statut].label,
    format(new Date(d.created_at), "dd/MM/yyyy"),
    d.date_paiement ? format(new Date(d.date_paiement), "dd/MM/yyyy") : "",
    d.reference_paiement || "",
    d.commentaire || "",
  ]);

  // Build CSV with BOM for Excel compatibility
  const bom = "\uFEFF";
  const csv = bom + [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decaissements_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
