export const statuses = ['Em elaboração', 'Enviado', 'Em negociação', 'Aprovado', 'Perdido'] as const;
export type Status = typeof statuses[number];
export type Quote = {
  id: string; client: string; initials: string; project: string; value: number;
  status: Status; owner: string; date: string; followup: string; contact: string;
  email: string; phone: string; notes: string[]; color: string;
  items?: QuoteItem[]; terms?: Terms; discount?: number;
  revisionOf?: string; revisionNumber?: number;
  partnerIds?: string[] | undefined;
};
export type Partner = {
  id: string; name: string; initials: string; category: string;
  contact: string; email: string; phone: string;
  notes: string; color: string;
};
export type Client = {
  id: string; name: string; initials: string; contact: string;
  email: string; phone: string; notes: string; color: string;
};

export const partnerCategories = ['Design', 'Desenvolvimento', 'Marketing', 'Consultoria', 'Gráfica'] as const;

export const initialClients: Client[] = [
  { id:'CLI-001', name:'Nexum Tecnologia', initials:'NX', contact:'Rafael Oliveira', email:'rafael@nexum.example', phone:'(11) 99000-1048', notes:'Cliente recorrente, foco em plataformas digitais.', color:'teal' },
  { id:'CLI-002', name:'Studio Forma', initials:'SF', contact:'Beatriz Costa', email:'beatriz@forma.example', phone:'(11) 99000-1047', notes:'Estúdio de design, interessado em identidade visual.', color:'violet' },
  { id:'CLI-003', name:'Verde & Co.', initials:'VC', contact:'Ana Martins', email:'ana@verde.example', phone:'(11) 99000-1046', notes:'E-commerce em crescimento, projetos de integração.', color:'green' },
  { id:'CLI-004', name:'Atlas Engenharia', initials:'AE', contact:'Fernando Lima', email:'fernando@atlas.example', phone:'(11) 99000-1045', notes:'Empresa tradicional, primeiro projeto web.', color:'blue' },
  { id:'CLI-005', name:'Café Aurora', initials:'CA', contact:'Clara Souza', email:'clara@aurora.example', phone:'(11) 99000-1044', notes:'Marca emergente, campanhas de lançamento.', color:'amber' },
  { id:'CLI-006', name:'Lumina Saúde', initials:'LS', contact:'Luiza Mendes', email:'luiza@lumina.example', phone:'(11) 99000-1043', notes:'Setor de saúde, portal de agendamento.', color:'rose' },
  { id:'CLI-007', name:'Mova Fitness', initials:'MF', contact:'Gustavo Alves', email:'gustavo@mova.example', phone:'(11) 99000-1042', notes:'Projeto pausado por orçamento, retomar no próximo trimestre.', color:'lime' },
];

export function filterClients(clients: Client[], quotes: Quote[], search: string, statusFilter: string) {
  return clients.filter(c => {
    const matchesSearch = `${c.name} ${c.contact} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'Todos os status') return true;
    const clientQuotes = quotes.filter(q => q.client === c.name);
    if (statusFilter === 'Com orçamentos aprovados') return clientQuotes.some(q => q.status === 'Aprovado');
    if (statusFilter === 'Em negociação') return clientQuotes.some(q => q.status === 'Em negociação');
    if (statusFilter === 'Sem propostas') return clientQuotes.length === 0;
    if (statusFilter === 'Com propostas ativas') return clientQuotes.some(q => !['Aprovado','Perdido'].includes(q.status));
    return true;
  });
}

export function filterPartners(partners: Partner[], quotes: Quote[], search: string, categoryFilter: string) {
  return partners.filter(p => {
    const matchesSearch = `${p.name} ${p.category} ${p.contact} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === 'Todas as categorias') return true;
    return p.category === categoryFilter;
  });
}

export const initialPartners: Partner[] = [
  { id:'PAR-001', name:'Pixel Studio', initials:'PS', category:'Design', contact:'Júlia Reis', email:'julia@pixelstudio.example', phone:'(11) 98800-0101', notes:'Parceiro para projetos de design de interface e identidade visual.', color:'violet' },
  { id:'PAR-002', name:'CodeForge', initials:'CF', category:'Desenvolvimento', contact:'Thiago Nunes', email:'thiago@codeforge.example', phone:'(11) 98800-0102', notes:'Equipe de desenvolvimento full-stack para projetos web e mobile.', color:'blue' },
  { id:'PAR-003', name:'Mídia Fluxo', initials:'MF', category:'Marketing', contact:'Camila Duarte', email:'camila@midiafluxo.example', phone:'(11) 98800-0103', notes:'Agência de marketing digital e tráfego pago.', color:'amber' },
  { id:'PAR-004', name:'Consult Pro', initials:'CP', category:'Consultoria', contact:'Ricardo Pessoa', email:'ricardo@consultpro.example', phone:'(11) 98800-0104', notes:'Consultoria em estratégia e gestão de projetos.', color:'green' },
  { id:'PAR-005', name:'Printech Gráfica', initials:'PG', category:'Gráfica', contact:'Sandra Lopes', email:'sandra@printech.example', phone:'(11) 98800-0105', notes:'Materiais impressos, brindes e sinalização.', color:'rose' },
];

export const initialQuotes: Quote[] = [
  { id:'ORC-2026-048',client:'Nexum Tecnologia',initials:'NX',project:'Redesign de plataforma digital',value:24500,status:'Em negociação',owner:'Marina',date:'2026-10-09',followup:'2026-10-10',contact:'Rafael Oliveira',email:'rafael@nexum.example',phone:'(11) 99000-1048',notes:['09 out · Marina enviou a proposta revisada.','08 out · Cliente solicitou ajuste no escopo e prazo de entrega.'],color:'teal',partnerIds:['PAR-001','PAR-002'] },
  { id:'ORC-2026-047',client:'Studio Forma',initials:'SF',project:'Identidade visual e brandbook',value:12800,status:'Enviado',owner:'Lucas',date:'2026-10-08',followup:'2026-10-10',contact:'Beatriz Costa',email:'beatriz@forma.example',phone:'(11) 99000-1047',notes:['08 out · Proposta enviada por e-mail. Aguardando avaliação.'],color:'violet',partnerIds:['PAR-001'] },
  { id:'ORC-2026-046',client:'Verde & Co.',initials:'VC',project:'E-commerce e integração de estoque',value:38750,status:'Aprovado',owner:'Marina',date:'2026-10-07',followup:'',contact:'Ana Martins',email:'ana@verde.example',phone:'(11) 99000-1046',notes:['09 out · Proposta aprovada. Contrato em preparação.'],color:'green',partnerIds:['PAR-002','PAR-004'] },
  { id:'ORC-2026-045',client:'Atlas Engenharia',initials:'AE',project:'Website institucional',value:18500,status:'Em negociação',owner:'Pedro',date:'2026-10-06',followup:'2026-10-09',contact:'Fernando Lima',email:'fernando@atlas.example',phone:'(11) 99000-1045',notes:['06 out · Reunião realizada. Retomar contato sobre o prazo de implantação.'],color:'blue',partnerIds:['PAR-002'] },
  { id:'ORC-2026-044',client:'Café Aurora',initials:'CA',project:'Campanha de lançamento',value:8900,status:'Em elaboração',owner:'Lucas',date:'2026-10-05',followup:'2026-10-12',contact:'Clara Souza',email:'clara@aurora.example',phone:'(11) 99000-1044',notes:['05 out · Briefing recebido. Elaborar proposta criativa.'],color:'amber',partnerIds:['PAR-003','PAR-005'] },
  { id:'ORC-2026-043',client:'Lumina Saúde',initials:'LS',project:'Portal de agendamento online',value:32000,status:'Enviado',owner:'Marina',date:'2026-10-04',followup:'2026-10-13',contact:'Luiza Mendes',email:'luiza@lumina.example',phone:'(11) 99000-1043',notes:['04 out · Proposta enviada ao financeiro.'],color:'rose',partnerIds:['PAR-002','PAR-004'] },
  { id:'ORC-2026-042',client:'Mova Fitness',initials:'MF',project:'Landing page e automação',value:14500,status:'Perdido',owner:'Pedro',date:'2026-10-03',followup:'',contact:'Gustavo Alves',email:'gustavo@mova.example',phone:'(11) 99000-1042',notes:['08 out · Cliente adiou o projeto por restrição de orçamento.'],color:'lime' },
];

const partnerColorCycle = ['violet','blue','amber','green','rose','teal','lime'] as const;
const colorCycle = ['teal','violet','green','blue','amber','rose','lime'] as const;
export function pickColor(index: number) { return colorCycle[index % colorCycle.length]!; }
export function pickPartnerColor(index: number) { return partnerColorCycle[index % partnerColorCycle.length]!; }
export const money = (value: number) => value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
export const shortDate = (date: string) => date ? `${date.slice(8,10)} out, 2026` : '—';
export function filterQuotes(quotes: Quote[], search: string, status: string, owner: string, period: string) {
 return quotes.filter(q => `${q.client} ${q.project} ${q.id}`.toLowerCase().includes(search.toLowerCase()) && (status === 'Todos os status' || q.status === status) && (owner === 'Todos os responsáveis' || q.owner === owner) && (period !== 'Últimos 7 dias' || q.date >= '2026-10-04'));
}

/** Returns quotes linked to a given client name. */
export function quotesForClient(quotes: Quote[], clientName: string): Quote[] {
  return quotes.filter(q => q.client === clientName);
}

/** Returns quotes linked to a given partner ID. */
export function quotesForPartner(quotes: Quote[], partnerId: string): Quote[] {
  return quotes.filter(q => q.partnerIds?.includes(partnerId));
}

/** Returns all revisions of a quote (including the original). */
export function revisionsOf(quotes: Quote[], quote: Quote): Quote[] {
  const rootId = quote.revisionOf ?? quote.id;
  return quotes.filter(q => (q.id === rootId || q.revisionOf === rootId)).sort((a, b) => {
    const aN = a.revisionNumber ?? 1;
    const bN = b.revisionNumber ?? 1;
    return aN - bN;
  });
}

/** Returns the latest revision of a quote (or the quote itself if no revisions). */
export function latestRevision(quotes: Quote[], quote: Quote): Quote {
  const revs = revisionsOf(quotes, quote);
  return revs[revs.length - 1] ?? quote;
}

/** Generates a revision ID from a base quote ID. */
export function revisionId(baseId: string, revisionNumber: number): string {
  return `${baseId}-R${String(revisionNumber).padStart(2, '0')}`;
}

export type QuoteItem = { description: string; qty: number; unit: number };
export type Terms = { validity: string; payment: string; delivery: string; warranty: string };
export const commercialTerms: Terms = { validity: '15 dias corridos', payment: '50% na aprovação e 50% na entrega', delivery: 'Conforme cronograma acordado após aprovação', warranty: '90 dias de suporte para correções' };
/** Divide o valor do orçamento em itens demonstrativos cuja soma é exatamente o valor total. */
export function quoteItems(q: Quote): QuoteItem[] {
  if (q.items?.length) return q.items;
  const parts: [string, number][] = [['Diagnóstico e planejamento', 0.2], [q.project, 0.6], ['Gestão, testes e entrega', 0.2]];
  const items = parts.map(([description, share]) => ({ description, qty: 1, unit: Math.round(q.value * share) }));
  items[1]!.unit += q.value - items.reduce((s, i) => s + i.unit, 0);
  return items;
}

/** Catálogo padrão de serviços (editável na tela de montagem). */
export const defaultCatalog: QuoteItem[] = [
  { description: 'Diagnóstico e planejamento estratégico', qty: 1, unit: 3500 },
  { description: 'Design de interface (por tela)', qty: 1, unit: 900 },
  { description: 'Desenvolvimento de website institucional', qty: 1, unit: 12000 },
  { description: 'Loja virtual / e-commerce', qty: 1, unit: 25000 },
  { description: 'Identidade visual e brandbook', qty: 1, unit: 9800 },
  { description: 'Hora de consultoria', qty: 1, unit: 250 },
  { description: 'Suporte e manutenção mensal', qty: 1, unit: 1200 },
];
export const termOptions: Record<keyof Terms, string[]> = {
  validity: ['15 dias corridos', '30 dias corridos', '7 dias corridos'],
  payment: ['50% na aprovação e 50% na entrega', 'À vista com 5% de desconto', '3x sem juros no boleto', '30% de entrada + 2 parcelas'],
  delivery: ['Conforme cronograma acordado após aprovação', '30 dias úteis', '60 dias úteis'],
  warranty: ['90 dias de suporte para correções', '30 dias de suporte', '6 meses de suporte'],
};
export const termLabels: Record<keyof Terms, string> = { validity: 'Validade', payment: 'Pagamento', delivery: 'Prazo de entrega', warranty: 'Garantia' };
export function builderTotal(items: QuoteItem[], discountPct: number) {
  const sub = items.reduce((s, i) => s + i.qty * i.unit, 0);
  return Math.round(sub * (1 - Math.min(100, Math.max(0, discountPct)) / 100) * 100) / 100;
}
