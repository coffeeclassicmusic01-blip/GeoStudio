import { jsPDF } from 'jspdf';
import { builderTotal, commercialTerms, moneyFull, quoteItems, type Quote } from './data';
import { company, letterTermLabels, letterTermOrder, longDate, titleLines } from './georevest';

type Img = { data: string; w: number; h: number };

/** Converte qualquer imagem do navegador (asset, data URL ou blob) em JPEG para o PDF. */
async function loadImage(src?: string): Promise<Img | null> {
  if (!src) return null;
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return { data: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height };
  } catch { return null; }
}

const W = 210, L = 20, R = 190, TOP = 46, BOTTOM = 266;
const period = (s: string) => /[.!?)]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`;

/** PDF da proposta no layout Georevest: papel timbrado, abertura, proposta comercial, condições e assinatura. */
export async function exportQuotePdf(q: Quote) {
  const t = q.terms ?? commercialTerms;
  const items = quoteItems(q);
  const [head, ...itemImgs] = await Promise.all([loadImage(company.letterhead), ...items.map(i => loadImage(i.image))]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let page = 1;
  const frame = () => {
    if (head) doc.addImage(head.data, 'JPEG', 0, 0, W, (W * head.h) / head.w);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60);
    company.footer.forEach((l, i) => doc.text(l, W / 2, 278 + i * 4, { align: 'center' }));
    doc.text(String(page), W / 2, 278 + company.footer.length * 4, { align: 'center' });
    doc.setTextColor(20);
  };
  frame();
  let y = TOP;
  const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); page += 1; frame(); y = TOP; } };
  const line = (text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right'; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal'); doc.setFontSize(opts.size ?? 10.5);
    const rows = doc.splitTextToSize(text, R - L) as string[];
    const h = rows.length * 5;
    ensure(h);
    const x = opts.align === 'right' ? R : opts.align === 'center' ? W / 2 : L;
    doc.text(rows, x, y, { align: opts.align ?? 'left', ...(opts.align ? {} : { maxWidth: R - L }) });
    y += h + (opts.gap ?? 2);
  };

  line(`${company.city}, ${longDate(q.date)}`, { align: 'right', gap: 5 });
  line(`Ao ${q.client}`, { bold: true });
  line(`N° DA PROPOSTA: ${q.id}`, { bold: true });
  if (q.contact) line(`Contato: ${q.contact}`);
  if (q.phone) line(`Telefone: ${q.phone}`);
  if (q.siteAddress) line(`Endereço da obra: ${q.siteAddress}`);
  y += 10;
  line(`Contato ${company.name}`, { bold: true, gap: 3 });
  company.contacts.forEach(c => { line(`${c.name} - ${c.role}`, { gap: 0 }); line(`Telefone: ${c.phone}`, { gap: 0 }); line(`e-mail: ${c.email}`, { gap: 5 }); });

  doc.addPage(); page += 1; frame(); y = TOP;
  line('Proposta Comercial.', { bold: true, align: 'center', gap: 8 });
  line(`Número da proposta: ${q.id}`, { bold: true, gap: 4 });
  items.forEach((it, i) => {
    const img = itemImgs[i];
    const imgW = img ? Math.min(72, (34 * img.w) / img.h) : 0;
    const imgH = img ? (imgW * img.h) / img.w : 0;
    const textX = img ? 108 : L;
    const lines: [string, boolean, number][] = [
      ...titleLines(it.description).map(l => [l, false, 10.5] as [string, boolean, number]),
      ...(it.details ? [['', false, 3] as [string, boolean, number], [it.details, false, 10.5] as [string, boolean, number]] : []),
      [`Valor: ${moneyFull(it.unit)}.`, true, 10.5],
      ...(it.qty !== 1 ? [[`Quantidade: ${it.qty}${it.measure ? ` ${it.measure}` : ''} · Total: ${moneyFull(it.qty * it.unit)}`, false, 10.5] as [string, boolean, number]] : []),
      ...(it.note ? [[it.note, false, 8.5] as [string, boolean, number]] : []),
    ];
    const textH = lines.reduce((s, [, , size]) => s + (size <= 3 ? 3 : size < 10 ? 5 : 5.4), 0);
    const rowH = Math.max(imgH, textH) + 8;
    ensure(rowH);
    if (img) doc.addImage(img.data, 'JPEG', L, y + (rowH - 8 - imgH) / 2, imgW, imgH);
    let ty = y + 4;
    lines.forEach(([text, bold, size]) => {
      if (size <= 3) { ty += 3; return; }
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
      const rows = doc.splitTextToSize(text, R - textX) as string[];
      doc.text(rows, textX, ty); ty += rows.length * (size < 10 ? 5 : 5.4);
    });
    y += rowH;
    if (i < items.length - 1) { doc.setDrawColor(40); doc.setLineWidth(0.3); doc.line(L, y - 3, R, y - 3); }
  });
  y += 4;
  if (q.discount) {
    line(`Subtotal: ${moneyFull(builderTotal(items, 0))}`, { align: 'right', gap: 0 });
    line(`Desconto (${q.discount}%): ${moneyFull(builderTotal(items, 0) - q.value)}`, { align: 'right', gap: 0 });
  }
  if (items.length > 1 || q.discount) line(`Valor total: ${moneyFull(q.value)}`, { bold: true, align: 'right', gap: 8 });

  ensure(60); y += 4;
  letterTermOrder.forEach(k => line(`${letterTermLabels[k]}: ${period(t[k])}`, { gap: 4 }));
  y += 8;
  line('Referências Bancárias:', { bold: true, gap: 2 });
  company.bank.forEach(l => line(l, { gap: 1 }));

  ensure(24); y = Math.max(y + 18, BOTTOM - 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
  doc.text('Atenciosamente,', L, y); doc.text(company.contacts[0]!.phone, R, y, { align: 'right' });
  doc.text(`${q.owner} · ${company.name}`, L, y + 7); doc.setTextColor(30, 80, 200); doc.text(company.contacts[0]!.email, R, y + 7, { align: 'right' });
  doc.save(`${q.id}-${q.client.replace(/\W+/g, '-')}.pdf`);
}
