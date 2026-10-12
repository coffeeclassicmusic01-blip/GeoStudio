import { quoteItems, type Quote, type QuoteItem } from '@/features/quotes/data';

export const invoiceTypes = ['NFS-e · Serviço', 'NF-e · Produto', 'NF-e · Simples remessa', 'NF-e · Devolução'] as const;
export type InvoiceType = typeof invoiceTypes[number];
export const invoiceStatuses = ['Solicitada', 'Em emissão', 'Emitida', 'Cancelada'] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

export type ClientFiscal = {
  legalName: string; cnpj: string; ie: string; im: string; regime: string;
  address: string; city: string; uf: string; cep: string; fiscalEmail: string;
};

export type Invoice = {
  id: string; quoteId: string; client: string; type: InvoiceType; status: InvoiceStatus;
  number?: string | undefined; nature: string; cfop: string; serviceCode: string;
  items: QuoteItem[]; taxRate: number; fiscal: ClientFiscal;
  notes: string; requestedBy: string; date: string;
};

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

export function fiscalFor(quote: Quote): ClientFiscal {
  return clientFiscal[quote.client] ?? { legalName: quote.client, cnpj: '', ie: '', im: '', regime: 'Simples Nacional', address: '', city: '', uf: 'SP', cep: '', fiscalEmail: quote.email };
}

/** Valores fiscais padrão por tipo de nota (sugestões editáveis). */
export const typeDefaults: Record<InvoiceType, { nature: string; cfop: string; serviceCode: string; taxRate: number }> = {
  'NFS-e · Serviço': { nature: 'Prestação de serviços', cfop: '—', serviceCode: '1.05 – Licenciamento/Desenvolvimento', taxRate: 5 },
  'NF-e · Produto': { nature: 'Venda de mercadoria', cfop: '5.102', serviceCode: '—', taxRate: 18 },
  'NF-e · Simples remessa': { nature: 'Simples remessa', cfop: '5.949', serviceCode: '—', taxRate: 0 },
  'NF-e · Devolução': { nature: 'Devolução de mercadoria', cfop: '5.202', serviceCode: '—', taxRate: 18 },
};

export const invoiceTotal = (inv: Pick<Invoice, 'items'>) => inv.items.reduce((s, i) => s + i.qty * i.unit, 0);

/** Valor já faturado (exclui canceladas, simples remessa e devolução, que não geram receita). */
export function invoicedValue(invoices: Invoice[], quoteId: string) {
  return invoices.filter(i => i.quoteId === quoteId && i.status !== 'Cancelada' && (i.type === 'NFS-e · Serviço' || i.type === 'NF-e · Produto')).reduce((s, i) => s + invoiceTotal(i), 0);
}

export function draftInvoice(quote: Quote, type: InvoiceType, id: string, items?: QuoteItem[]): Invoice {
  const d = typeDefaults[type];
  return { id, quoteId: quote.id, client: quote.client, type, status: 'Solicitada', nature: d.nature, cfop: d.cfop, serviceCode: d.serviceCode, taxRate: d.taxRate, items: items ?? quoteItems(quote).map(i => ({ ...i })), fiscal: { ...fiscalFor(quote) }, notes: `Referente ao orçamento ${quote.id} – ${quote.project}.`, requestedBy: quote.owner, date: '2026-10-12' };
}

const q46 = { id: 'ORC-2026-046', client: 'Verde & Co.', project: 'E-commerce e integração de estoque', owner: 'Marina', value: 38750 } as Quote;
export const initialInvoices: Invoice[] = [
  { ...draftInvoice(q46, 'NFS-e · Serviço', 'NF-0001', [{ description: 'Desenvolvimento de e-commerce e integração de estoque', qty: 1, unit: 30000 }]), status: 'Emitida', number: '000.128', date: '2026-10-09' },
  { ...draftInvoice(q46, 'NF-e · Produto', 'NF-0002', [{ description: 'Leitor de código de barras para estoque', qty: 5, unit: 1750 }]), status: 'Em emissão', date: '2026-10-10' },
  { ...draftInvoice(q46, 'NF-e · Simples remessa', 'NF-0003', [{ description: 'Remessa de equipamentos para instalação', qty: 5, unit: 0 }]), status: 'Solicitada', date: '2026-10-11' },
];
