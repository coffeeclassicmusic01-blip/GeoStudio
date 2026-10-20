import type { Client, Quote, QuoteItem } from '@/features/quotes/data';

export const invoiceTypes = ['Venda avulsa de produto', 'Simples remessa', 'Serviço (instalação)', 'Serviço (assistência técnica)', 'Venda entrega futura (simples faturamento)'] as const;
export type InvoiceType = string;
export const invoiceStatuses = ['Pendente', 'NF Emitida', 'Cancelada'] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];
export type ClientFiscal = { legalName: string; cnpj: string; ie: string; im: string; regime: string; address: string; city: string; uf: string; cep: string; fiscalEmail: string; number?: string; complement?: string; neighborhood?: string };
export type InvoiceItem = QuoteItem & { measure: string };
export type Attachment = { id: string; name: string; size: number; type: string; dataUrl: string };
export type Activity = { date: string; author: string; action: string; detail: string; status: InvoiceStatus };
export type Invoice = {
  id: string; quoteId: string; client: string; type: InvoiceType; status: InvoiceStatus;
  fiscal: ClientFiscal; person: 'PJ' | 'PF'; contact: string; email: string; phone: string;
  reference: string; cno: string; requestedBy: string; requesterEmail: string; date: string;
  items: InvoiceItem[]; value: number; discount: number; sourceValue: number | null;
  materials: string[]; freight: string; weight: string;
  site: { cep: string; city: string; uf: string; address: string };
  payment: { method: string; condition: string; terms: string; entry: number; count: number; firstDue: string; interval: number; notes: string };
  requirements: string; notes: string; additional: string; attachments: Attachment[];
  issuance: { number: string; date: string; pdf?: Attachment | undefined; xml?: Attachment | undefined; noXml: boolean };
  history: Activity[];
};
export const defaultMaterials = ['ATO 800', 'ATO 1000', 'ATO 1200', 'HMO 800', 'HMO 1000', 'HMO 1200', 'HMO 1200 UV', 'HMO 1500', 'HMO 1600', 'GEOTÊXTIL', 'GEOFIX', 'ESP 1000', 'ESP 1200', 'ESP 1500'];
export const freightOptions = ['Minha empresa (transportadora)', 'Meu cliente (transportadora)', 'Transporte próprio (Georevest)', 'Transporte próprio (por conta do destinatário)', 'Não haverá frete'];
export const paymentMethods = ['PIX', 'Boleto', 'Transferência bancária', 'Cartão', 'Outro', 'Não gera financeiro'];
export const installmentCounts = [2,3,4,5,6,7,8,9,10,12,18,24];
export const measures = ['UN','M','M²','M³','KG','L','CX','RL','PC'];
export const maxAttachmentBytes = 25 * 1024 * 1024;
export const fiscalMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
/** Dados fiscais demonstrativos do cadastro de clientes. */
export const clientFiscal: Record<string, ClientFiscal> = {
  'Nexum Tecnologia': { legalName: 'Nexum Tecnologia Ltda.', cnpj: '12.345.678/0001-90', ie: '123.456.789.110', im: '4.567.890-1', regime: 'Lucro Presumido', address: 'Av. Paulista, 1000 – Bela Vista', city: 'São Paulo', uf: 'SP', cep: '01310-100', fiscalEmail: 'fiscal@nexum.example' },
  'Studio Forma': { legalName: 'Studio Forma Design ME', cnpj: '23.456.789/0001-01', ie: 'Isento', im: '5.678.901-2', regime: 'Simples Nacional', address: 'Rua Augusta, 450 – Consolação', city: 'São Paulo', uf: 'SP', cep: '01305-000', fiscalEmail: 'nf@forma.example' },
  'Verde & Co.': { legalName: 'Verde e Companhia Comércio S.A.', cnpj: '34.567.890/0001-12', ie: '234.567.890.111', im: '6.789.012-3', regime: 'Lucro Real', address: 'Rua dos Pinheiros, 870 – Pinheiros', city: 'São Paulo', uf: 'SP', cep: '05422-001', fiscalEmail: 'fiscal@verde.example' },
  'Atlas Engenharia': { legalName: 'Atlas Engenharia e Projetos Ltda.', cnpj: '45.678.901/0001-23', ie: '345.678.901.112', im: '7.890.123-4', regime: 'Lucro Presumido', address: 'Av. Brigadeiro Faria Lima, 2200', city: 'São Paulo', uf: 'SP', cep: '01451-000', fiscalEmail: 'nfe@atlas.example' },
  'Café Aurora': { legalName: 'Café Aurora Torrefação Ltda.', cnpj: '56.789.012/0001-34', ie: '456.789.012.113', im: '8.901.234-5', regime: 'Simples Nacional', address: 'Rua Harmonia, 120 – Vila Madalena', city: 'São Paulo', uf: 'SP', cep: '05435-000', fiscalEmail: 'contas@aurora.example' },
  'Lumina Saúde': { legalName: 'Lumina Serviços de Saúde S.A.', cnpj: '67.890.123/0001-45', ie: 'Isento', im: '9.012.345-6', regime: 'Lucro Real', address: 'Av. Rebouças, 3000 – Pinheiros', city: 'São Paulo', uf: 'SP', cep: '05402-600', fiscalEmail: 'financeiro@lumina.example' },
  'Mova Fitness': { legalName: 'Mova Academia Ltda.', cnpj: '78.901.234/0001-56', ie: 'Isento', im: '0.123.456-7', regime: 'Simples Nacional', address: 'Rua Oscar Freire, 900 – Jardins', city: 'São Paulo', uf: 'SP', cep: '01426-001', fiscalEmail: 'adm@mova.example' },
};

export const emptyFiscal = (): ClientFiscal => ({ legalName:'', cnpj:'', ie:'', im:'', regime:'', address:'', city:'', uf:'', cep:'', fiscalEmail:'', number:'', complement:'', neighborhood:'' });
export function fiscalFor(quote: Quote, client?: Client): ClientFiscal {
  return { ...emptyFiscal(), ...clientFiscal[quote.client], ...client?.fiscal, legalName: client?.fiscal?.legalName || clientFiscal[quote.client]?.legalName || client?.name || quote.client };
}
export const invoiceSubtotal = (inv: Pick<Invoice,'items'|'value'>) => inv.items.length ? inv.items.reduce((s,i)=>s+i.qty*i.unit,0) : inv.value;
export const invoiceTotal = (inv: Pick<Invoice,'items'|'value'|'discount'>) => Math.round(invoiceSubtotal(inv)*(1-inv.discount/100)*100)/100;
export const remittanceReference = (inv: Invoice) => Math.round(invoiceTotal(inv)*65)/100;
export function invoicedValue(invoices: Invoice[], quoteId: string) { return invoices.filter(i=>i.quoteId===quoteId && i.status!=='Cancelada' && i.type!=='Simples remessa').reduce((s,i)=>s+invoiceTotal(i),0); }
export function nextId(invoices: Invoice[]) { return `NF-${new Date().getFullYear()}-${String(Math.max(0,...invoices.map(i=>Number(i.id.split('-').at(-1))||0))+1).padStart(4,'0')}`; }
export function blankInvoice(id: string): Invoice {
  return { id,quoteId:'',client:'',type:'',status:'Pendente',fiscal:emptyFiscal(),person:'PJ',contact:'',email:'',phone:'',reference:'',cno:'',requestedBy:'',requesterEmail:'',date:new Date().toISOString(),items:[],value:0,discount:0,sourceValue:null,materials:[],freight:'',weight:'',site:{cep:'',city:'',uf:'',address:''},payment:{method:'',condition:'À vista',terms:'',entry:0,count:2,firstDue:'',interval:30,notes:''},requirements:'',notes:'',additional:'',attachments:[],issuance:{number:'',date:'',noXml:false},history:[] };
}
export function draftInvoice(quote: Quote, type: InvoiceType, id: string, client?: Client): Invoice {
  const inv = blankInvoice(id);
  // Do not call quoteItems: its legacy fallback invents demonstration line items.
  return { ...inv,quoteId:quote.id,client:client?.name || quote.client,type,reference:quote.id,fiscal:fiscalFor(quote,client),contact:client?.contact ?? quote.contact,email:client?.email ?? quote.email,phone:client?.phone ?? quote.phone,requestedBy:quote.owner,items:(quote.items ?? []).map(i=>({...i,measure:i.measure ?? ''})),value:quote.value,sourceValue:quote.value,discount:quote.items?.length ? quote.discount ?? 0 : 0,additional:[quote.project,quote.terms?.delivery ? `Prazo de entrega: ${quote.terms.delivery}` : '',quote.terms?.validity ? `Validade: ${quote.terms.validity}` : '',quote.terms?.warranty ? `Garantia: ${quote.terms.warranty}` : ''].filter(Boolean).join('\n'),payment:{...inv.payment,terms:quote.terms?.payment ?? ''} };
}
export function changeInvoiceType(inv: Invoice, type: string): Invoice {
  return { ...inv,type,payment:type==='Simples remessa' ? {...inv.payment,method:'Não gera financeiro',condition:'Não gera financeiro'} : inv.type==='Simples remessa' ? {...inv.payment,method:'',condition:'À vista'} : inv.payment };
}
export function installments(inv: Invoice): { date: string; value: number }[] {
  if (inv.type==='Simples remessa' || inv.payment.condition!=='Parcelado') return [];
  const cents=Math.round(Math.max(0,invoiceTotal(inv)-inv.payment.entry)*100), count=inv.payment.count;
  if (!installmentCounts.includes(count)) return [];
  const base=Math.floor(cents/count), remainder=cents-base*count;
  return Array.from({length:count},(_,i)=>{
    const date=inv.payment.firstDue ? new Date(`${inv.payment.firstDue}T12:00:00Z`) : null;
    if (date) date.setUTCDate(date.getUTCDate()+i*inv.payment.interval);
    return {date:date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0,10) : '',value:(base+(i===0?remainder:0))/100};
  });
}
export function validDocument(value: string, person: 'PJ'|'PF') {
  const s=value.replace(/\D/g,'');
  if (/^(\d)\1+$/.test(s) || s.length!==(person==='PF'?11:14)) return false;
  if(person==='PF') {
    for(let t=9;t<11;t++){let sum=0;for(let i=0;i<t;i++)sum+=Number(s[i])*(t+1-i);if(((sum*10)%11)%10!==Number(s[t]))return false;}return true;
  }
  for(let t=12;t<14;t++){let sum=0,weight=t-7;for(let i=0;i<t;i++){sum+=Number(s[i])*weight;weight=weight===2?9:weight-1;}const digit=sum%11<2?0:11-sum%11;if(digit!==Number(s[t]))return false;}return true;
}
export function validateInvoice(inv: Invoice): string[] {
  const errors:string[]=[];
  const requiredFields: [string, string][] = [['Nome do solicitante',inv.requestedBy],['E-mail do solicitante',inv.requesterEmail],['Cliente',inv.fiscal.legalName],['Tipo de nota',inv.type],['Contrato ou proposta',inv.reference],['Responsável pelo frete',inv.freight],['CEP da obra',inv.site.cep],['Cidade da obra',inv.site.city],['UF da obra',inv.site.uf]];
  for(const [label,value] of requiredFields) if(!value.trim())errors.push(`Preencha: ${label}.`);
  if(!validDocument(inv.fiscal.cnpj,inv.person))errors.push(`${inv.person==='PF'?'CPF':'CNPJ'} inválido.`);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.requesterEmail))errors.push('Informe um e-mail válido do solicitante.');
  if(!Number.isFinite(invoiceTotal(inv)) || invoiceTotal(inv)<=0)errors.push('O valor total deve ser maior que zero.');
  if(inv.discount<0 || inv.discount>100)errors.push('Desconto deve estar entre 0% e 100%.');
  if(inv.items.some(i=>!i.description.trim() || !i.measure.trim() || !Number.isFinite(i.qty) || i.qty<=0 || !Number.isFinite(i.unit) || i.unit<0))errors.push('Confira descrição, unidade, quantidade e valor dos itens.');
  if(inv.type!=='Simples remessa' && (!inv.payment.method || !inv.payment.condition))errors.push('Preencha a forma e a condição de pagamento.');
  if(inv.type!=='Simples remessa' && inv.payment.condition==='Parcelado'){
    if(!inv.payment.firstDue)errors.push('Informe o primeiro vencimento.');
    if(!installmentCounts.includes(inv.payment.count))errors.push('Quantidade de parcelas inválida.');
    if(inv.payment.entry<0 || inv.payment.entry>invoiceTotal(inv))errors.push('A entrada deve estar entre zero e o valor total.');
  }
  return errors;
}
export function duplicateInvoice(inv: Invoice, all: Invoice[]) {
  return all.find(i=>i.id!==inv.id && i.status!=='Cancelada' && i.quoteId===inv.quoteId && i.reference===inv.reference && i.fiscal.cnpj===inv.fiscal.cnpj && i.type===inv.type && invoiceTotal(i)===invoiceTotal(inv) && JSON.stringify(i.items)===JSON.stringify(inv.items));
}
export function validateStatus(inv: Invoice, status: InvoiceStatus, author: string, reason: string): string[] {
  const errors:string[]=[];if(!author.trim())errors.push('Informe o responsável.');
  if(status==='Cancelada' && !reason.trim())errors.push('Informe a justificativa do cancelamento.');
  if(status==='Pendente' && status!==inv.status && !reason.trim())errors.push('Informe a justificativa da alteração.');
  if(status==='NF Emitida'){
    if(!inv.issuance.number.trim())errors.push('Informe o número da NF.');if(!inv.issuance.date)errors.push('Informe a data de emissão.');
    if(!inv.issuance.pdf)errors.push('Anexe o PDF da nota fiscal.');if(!inv.issuance.xml && !inv.issuance.noXml)errors.push('Anexe o XML ou informe que este documento não possui XML.');
  }return errors;
}
export function activity(author: string, action: string, detail: string, status: InvoiceStatus): Activity { return {date:new Date().toISOString(),author,action,detail,status}; }
export const initialInvoices: Invoice[] = [];
export function readAttachment(file: File): Promise<Attachment> {
  if(file.size>maxAttachmentBytes)return Promise.reject(new Error('O arquivo excede o limite de 25 MB.'));
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve({id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,dataUrl:reader.result}):reject(new Error('Arquivo inválido.'));reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file);});
}
