import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fiscalMoney, installments, invoiceTotal, remittanceReference, type Invoice } from './data';
export function printInvoice(inv: Invoice, preview = false) {
  const doc=new jsPDF({format:'a4'});
  doc.setFontSize(17);doc.text('Solicitação de Nota Fiscal',12,17);
  doc.setFontSize(9);doc.text(`${inv.id} · ${inv.status}`,12,24);
  const rows: string[][]=[
    ['Origem',`${inv.quoteId || 'Avulsa'} · ${inv.reference}`],['Solicitante',`${inv.requestedBy} · ${inv.requesterEmail}`],
    ['Cliente',`${inv.fiscal.legalName} · ${inv.fiscal.cnpj}`],['Contato',`${inv.contact} · ${inv.email} · ${inv.phone}`],
    ['Endereço',`${inv.fiscal.address} ${inv.fiscal.number ?? ''} · ${inv.fiscal.city}/${inv.fiscal.uf} · ${inv.fiscal.cep}`],
    ['Inscrições',`IE: ${inv.fiscal.ie || '—'} · IM: ${inv.fiscal.im || '—'}`],['Tipo / CNO ou ART',`${inv.type} · ${inv.cno || '—'}`],
    ['Valor',`${fiscalMoney(invoiceTotal(inv))} · Desconto: ${inv.discount}%${inv.type==='Simples remessa'?` · Referência 65%: ${fiscalMoney(remittanceReference(inv))}`:''}`],
    ['Materiais',inv.materials.join(', ') || '—'],['Frete / Peso',`${inv.freight} · ${inv.weight || '—'} kg`],
    ['Obra',`${inv.site.address} · ${inv.site.city}/${inv.site.uf} · ${inv.site.cep}`],
    ['Pagamento',`${inv.payment.method} · ${inv.payment.condition} · ${inv.payment.terms}`],
    ['Parcelas',installments(inv).map((p,i)=>`${i+1}: ${p.date} ${fiscalMoney(p.value)}`).join(' / ') || '—'],
    ['Cobrança',inv.payment.notes],['Exigências',inv.requirements],['Observações',inv.notes],['Informações adicionais',inv.additional],
    ['Anexos',[...inv.attachments,inv.issuance.pdf,inv.issuance.xml].filter(x=>x).map(x=>x?.name).join(', ') || '—'],
    ['Emissão',`${inv.issuance.number || '—'} · ${inv.issuance.date || '—'}`],
  ];
  inv.items.forEach((it,i)=>rows.splice(7+i,0,[`Item ${i+1}`,`${it.description} · ${it.qty} ${it.measure} × ${fiscalMoney(it.unit)} = ${fiscalMoney(it.qty*it.unit)}`]));
  // Fit all content without truncation; oversized requests intentionally scale down to retain a single A4 page.
  const chars=rows.reduce((s,r)=>s+r.join('').length,0);
  const font=Math.min(9,Math.max(3,2100/(chars+rows.length*120)*9));
  autoTable(doc,{startY:30,body:rows,theme:'plain',margin:{left:12,right:12,top:10,bottom:18},styles:{fontSize:font,cellPadding:1.2,overflow:'linebreak'},columnStyles:{0:{cellWidth:36,fontStyle:'bold'},1:{cellWidth:150}}});
  doc.setFontSize(7);doc.text('Solicitante: ____________________    Conferência: ____________________',12,285);
  doc.text('Ambiente de testes · Documento de solicitação, não é uma nota fiscal.',12,291);
  if(preview){doc.autoPrint();const url=URL.createObjectURL(doc.output('blob'));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);}else doc.save(`${inv.id}.pdf`);
}
