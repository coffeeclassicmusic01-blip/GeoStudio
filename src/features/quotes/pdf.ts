import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { builderTotal, commercialTerms, money, quoteItems, shortDate, type Quote } from './data';

export function exportQuotePdf(q: Quote) {
  const t = q.terms ?? commercialTerms;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  doc.setFillColor(15, 76, 70); doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('órbita.', 15, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Studio Criativo · contato@orbita.example', 15, 25);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('PROPOSTA COMERCIAL', W - 15, 17, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`${q.id} · Emitida em ${shortDate(q.date)}`, W - 15, 25, { align: 'right' });
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Cliente', 15, 46); doc.text('Responsável', 120, 46);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  [q.client, q.contact, q.email, q.phone].forEach((l, i) => doc.text(l, 15, 53 + i * 5.5));
  [q.owner, 'Studio Criativo', `Projeto: ${q.project}`].forEach((l, i) => doc.text(doc.splitTextToSize(l, 75), 120, 53 + i * 5.5));
  autoTable(doc, {
    startY: 80, head: [['Descrição', 'Qtd.', 'Valor unitário', 'Total']],
    body: quoteItems(q).map(i => [i.description, String(i.qty), money(i.unit), money(i.unit * i.qty)]),
    foot: q.discount ? [['', '', `Desconto (${q.discount}%)`, money(builderTotal(quoteItems(q), 0) - q.value)], ['', '', 'Valor total', money(q.value)]] : [['', '', 'Valor total', money(q.value)]],
    headStyles: { fillColor: [15, 76, 70] }, footStyles: { fillColor: [235, 243, 241], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }, styles: { fontSize: 9.5, cellPadding: 3 },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Condições comerciais', 15, y); y += 7;
  doc.setFontSize(9.5);
  ([['Validade da proposta', t.validity], ['Pagamento', t.payment], ['Prazo de entrega', t.delivery], ['Garantia', t.warranty]] as const).forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, 15, y); doc.setFont('helvetica', 'normal'); doc.text(v, 60, y); y += 6;
  });
  y += 16; doc.setDrawColor(150); doc.line(15, y, 90, y); doc.line(120, y, 195, y);
  doc.setFontSize(8.5); doc.text(`${q.contact} · ${q.client}`, 15, y + 5); doc.text(`${q.owner} · Studio Criativo`, 120, y + 5);
  doc.setTextColor(120); doc.setFontSize(8); doc.text('Documento gerado a partir de dados demonstrativos.', W / 2, 287, { align: 'center' });
  doc.save(`${q.id}-${q.client.replace(/\W+/g, '-')}.pdf`);
}
