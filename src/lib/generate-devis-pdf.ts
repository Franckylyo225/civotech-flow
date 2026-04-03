import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Devis } from "@/types/devis";
import { formatMontant, formatDate } from "@/types/devis";

async function loadLogoAsBase64(): Promise<string> {
  const response = await fetch("/logo-civotech.png");
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function generateDevisPdf(devis: Devis) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ── Logo ──
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, "PNG", margin, 12, 48, 14);
  } catch {
    // Fallback text if logo fails
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("CIVOTECH", margin, 25);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Transport & Logistique", margin, 31);
  doc.text("Abidjan, Côte d'Ivoire", margin, 36);

  // ── Title ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("DEVIS", pageWidth - margin, 25, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(devis.reference, pageWidth - margin, 33, { align: "right" });
  doc.text(`Date : ${formatDate(devis.createdAt)}`, pageWidth - margin, 40, { align: "right" });

  // ── Separator ──
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, 46, pageWidth - margin, 46);

  // ── Client info block ──
  let y = 56;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y - 4, pageWidth - 2 * margin, devis.client ? 36 : 20, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CLIENT", margin + 6, y + 2);

  if (devis.client) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(devis.client.nom, margin + 6, y + 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const clientDetails: string[] = [];
    if (devis.client.email) clientDetails.push(devis.client.email);
    if (devis.client.telephone) clientDetails.push(devis.client.telephone);
    if (devis.client.adresse) clientDetails.push(devis.client.adresse);
    doc.text(clientDetails.join("  •  "), margin + 6, y + 20);

    if (devis.client.contact) {
      doc.text(`Contact : ${devis.client.contact}`, margin + 6, y + 27);
    }
  }

  y = devis.client ? y + 40 : y + 24;

  // ── Lines table ──
  y += 4;
  const tableBody = devis.lignes.map((l, i) => [
    String(i + 1),
    l.description,
    String(l.quantite),
    formatMontant(l.prixUnitaire),
    formatMontant(l.montant),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qté", "Prix unitaire", "Montant"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 38, halign: "right" },
      4: { cellWidth: 38, halign: "right" },
    },
    theme: "grid",
    styles: {
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
    },
  });

  // ── Totals ──
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = pageWidth - margin - 80;

  const drawTotalLine = (label: string, value: string, yPos: number, bold = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? 30 : 100, bold ? 30 : 100, bold ? 30 : 100);
    doc.text(label, totalsX, yPos);
    doc.setTextColor(30, 30, 30);
    doc.text(value, pageWidth - margin, yPos, { align: "right" });
  };

  let tY = finalY;
  drawTotalLine("Sous-total HT", formatMontant(devis.montantHT), tY);
  tY += 7;

  if (devis.montantRemise > 0) {
    const remiseLabel = devis.typeRemise === "POURCENTAGE"
      ? `Remise (${devis.valeurRemise}%)`
      : "Remise";
    drawTotalLine(remiseLabel, `- ${formatMontant(devis.montantRemise)}`, tY);
    tY += 7;
  }

  drawTotalLine(`TVA (${devis.tauxTva}%)`, formatMontant(devis.montantTva), tY);
  tY += 3;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsX, tY, pageWidth - margin, tY);
  tY += 7;

  // Total TTC with background
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(totalsX - 4, tY - 5, pageWidth - margin - totalsX + 8, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL TTC", totalsX, tY + 2);
  doc.text(formatMontant(devis.montantTotal), pageWidth - margin, tY + 2, { align: "right" });

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("Civotech Flow — Transport & Logistique", pageWidth / 2, footerY, { align: "center" });
  doc.text("Ce devis est valable 30 jours à compter de sa date d'émission.", pageWidth / 2, footerY + 5, { align: "center" });

  // Save
  doc.save(`${devis.reference}.pdf`);
}
