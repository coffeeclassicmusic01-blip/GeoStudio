import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brand, brandLogoData, preloadBrandLogo } from '@/features/brand';
import { fiscalMoney, installments, invoiceTotal, remittanceReference, type Invoice } from './data';
void preloadBrandLogo();
export function printInvoice(inv: Invoice, preview = false) {
  let doc=new jsPDF({format:'a4'});
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
  // Measure real layout and regenerate until every row fits the same A4 page.
  let font=9;
  let padding=1.2;
  for(let attempt=0;attempt<40;attempt++){
    doc=new jsPDF({format:'a4'});
    const logo=brandLogoData();
    if(logo){const w=40;doc.addImage(logo,'PNG',198-w,9,w,w/brand.ratio);}else{doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text(brand.name,198,15,{align:'right'});doc.setFont('helvetica','normal');}
    doc.setTextColor(20);doc.setFontSize(17);doc.text('Solicitação de Nota Fiscal',12,17);
    doc.setFontSize(9);doc.setTextColor(90);doc.text(`${inv.id} · ${inv.status}`,12,24);doc.setTextColor(20);
    doc.setDrawColor(0,153,220);doc.setLineWidth(0.6);doc.line(12,27,198,27);
    let bottom=30;
    autoTable(doc,{startY:30,body:rows,theme:'plain',margin:{left:12,right:12,top:30,bottom:23},styles:{fontSize:font,cellPadding:padding,overflow:'linebreak'},columnStyles:{0:{cellWidth:36,fontStyle:'bold'},1:{cellWidth:150}},didDrawCell:data=>{bottom=Math.max(bottom,data.cell.y+data.cell.height);}});
    if(doc.getNumberOfPages()===1 && bottom<278)break;
    font*=.85;padding*=.85;
  }
  doc.setFontSize(7);doc.text('Solicitante: ____________________    Conferência: ____________________',12,285);
  doc.text('Ambiente de testes · Documento de solicitação, não é uma nota fiscal.',12,291);
  if(preview){doc.autoPrint();const url=URL.createObjectURL(doc.output('blob'));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);}else doc.save(`${inv.id}.pdf`);
}
