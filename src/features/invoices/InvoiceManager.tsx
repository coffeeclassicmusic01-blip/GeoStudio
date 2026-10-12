import { useMemo, useState } from 'react';
import { ArrowLeft, FileCheck2, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, type Quote } from '@/features/quotes/data';
import { draftInvoice, invoiceStatuses, invoiceTotal, invoiceTypes, invoicedValue, typeDefaults, type Invoice, type InvoiceType } from './data';

type Props = { quotes: Quote[]; invoices: Invoice[]; setInvoices: (fn: (all: Invoice[]) => Invoice[]) => void; initialQuoteId: string | null; notify: (m: string) => void };

const stClass = (s: string) => ({ 'Solicitada': 'sent', 'Em emissão': 'negotiation', 'Emitida': 'approved', 'Cancelada': 'lost' } as Record<string, string>)[s] ?? 'draft';

export function InvoiceManager({ quotes, invoices, setInvoices, initialQuoteId, notify }: Props) {
  const [quoteFilter, setQuoteFilter] = useState(initialQuoteId ?? 'Todos');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Invoice | null>(() => {
    const q = quotes.find(x => x.id === initialQuoteId);
    return q ? draftInvoice(q, 'NFS-e · Serviço', nextId(invoices)) : null;
  });
  const list = useMemo(() => invoices.filter(i => (quoteFilter === 'Todos' || i.quoteId === quoteFilter) && `${i.id} ${i.client} ${i.type} ${i.number ?? ''}`.toLowerCase().includes(search.toLowerCase())), [invoices, quoteFilter, search]);

  function startNew(quoteId: string) {
    const q = quotes.find(x => x.id === quoteId); if (!q) return;
    setDraft(draftInvoice(q, 'NFS-e · Serviço', nextId(invoices)));
  }
  function save() {
    if (!draft) return;
    if (!draft.fiscal.cnpj) return notify('Preencha o CNPJ do cliente antes de solicitar.');
    if (!draft.items.length) return notify('Adicione ao menos um item à nota.');
    setInvoices(all => all.some(i => i.id === draft.id) ? all.map(i => i.id === draft.id ? draft : i) : [draft, ...all]);
    notify(`Nota ${draft.id} (${draft.type}) solicitada ao financeiro.`); setDraft(null);
  }
  function advance(inv: Invoice) {
    const next = inv.status === 'Solicitada' ? 'Em emissão' : 'Emitida';
    setInvoices(all => all.map(i => i.id === inv.id ? { ...i, status: next, number: next === 'Emitida' ? `000.${130 + all.filter(x => x.number).length}` : i.number } : i));
    notify(`Nota ${inv.id} agora está "${next}".`);
  }

  if (draft) {
    const q = quotes.find(x => x.id === draft.quoteId)!;
    const already = invoicedValue(invoices.filter(i => i.id !== draft.id), q.id);
    const set = (patch: Partial<Invoice>) => setDraft({ ...draft, ...patch });
    const setF = (k: keyof Invoice['fiscal'], v: string) => set({ fiscal: { ...draft.fiscal, [k]: v } });
    const setItem = (idx: number, patch: Partial<Invoice['items'][number]>) => set({ items: draft.items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
    return <div className="invoice-form">
      <div className="list-heading"><div><Button variant="ghost" size="sm" onClick={() => setDraft(null)}><ArrowLeft size={15} />Voltar às notas</Button><h2>Solicitar nota fiscal <span>{draft.id}</span></h2><p>Dados preenchidos a partir do orçamento {q.id} e do cadastro de {q.client}. Revise antes de enviar.</p></div></div>
      <div className="invoice-summary">
        <div><small>Orçamento</small><strong>{q.id}</strong><span>{q.project}</span></div>
        <div><small>Valor do orçamento</small><strong>{money(q.value)}</strong></div>
        <div><small>Já faturado</small><strong>{money(already)}</strong></div>
        <div><small>Saldo a faturar</small><strong>{money(Math.max(0, q.value - already))}</strong></div>
      </div>
      <section className="invoice-card"><h3>Tipo de nota</h3>
        <div className="invoice-types">{invoiceTypes.map(t => <Button key={t} variant={draft.type === t ? 'default' : 'outline'} size="sm" onClick={() => set({ type: t, ...typeDefaults[t as InvoiceType] })}>{t}</Button>)}</div>
        <div className="invoice-grid">
          <Field label="Natureza da operação" value={draft.nature} onChange={v => set({ nature: v })} />
          <Field label="CFOP" value={draft.cfop} onChange={v => set({ cfop: v })} />
          <Field label="Código de serviço" value={draft.serviceCode} onChange={v => set({ serviceCode: v })} />
          <Field label={draft.type.startsWith('NFS') ? 'Alíquota ISS (%)' : 'Alíquota ICMS (%)'} value={String(draft.taxRate)} onChange={v => set({ taxRate: Number(v) || 0 })} />
        </div>
      </section>
      <section className="invoice-card"><h3>Tomador / destinatário <small>do cadastro do cliente</small></h3>
        <div className="invoice-grid">
          <Field label="Razão social" value={draft.fiscal.legalName} onChange={v => setF('legalName', v)} wide />
          <Field label="CNPJ" value={draft.fiscal.cnpj} onChange={v => setF('cnpj', v)} />
          <Field label="Regime tributário" value={draft.fiscal.regime} onChange={v => setF('regime', v)} />
          <Field label="Inscrição estadual" value={draft.fiscal.ie} onChange={v => setF('ie', v)} />
          <Field label="Inscrição municipal" value={draft.fiscal.im} onChange={v => setF('im', v)} />
          <Field label="Endereço" value={draft.fiscal.address} onChange={v => setF('address', v)} wide />
          <Field label="Cidade" value={draft.fiscal.city} onChange={v => setF('city', v)} />
          <Field label="UF" value={draft.fiscal.uf} onChange={v => setF('uf', v)} />
          <Field label="CEP" value={draft.fiscal.cep} onChange={v => setF('cep', v)} />
          <Field label="E-mail para envio da nota" value={draft.fiscal.fiscalEmail} onChange={v => setF('fiscalEmail', v)} />
        </div>
      </section>
      <section className="invoice-card"><h3>Itens da nota <small>vindos do orçamento — remova ou ajuste para notas parciais</small></h3>
        <table className="invoice-items"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th><th /></tr></thead><tbody>
          {draft.items.map((it, i) => <tr key={i}><td><input value={it.description} onChange={e => setItem(i, { description: e.target.value })} /></td><td><input type="number" min={0} value={it.qty} onChange={e => setItem(i, { qty: Number(e.target.value) || 0 })} /></td><td><input type="number" min={0} value={it.unit} onChange={e => setItem(i, { unit: Number(e.target.value) || 0 })} /></td><td>{money(it.qty * it.unit)}</td><td><Button variant="ghost" size="icon" title="Remover item" onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })}><Trash2 size={15} /></Button></td></tr>)}
        </tbody></table>
        <Button variant="outline" size="sm" onClick={() => set({ items: [...draft.items, { description: 'Novo item', qty: 1, unit: 0 }] })}><Plus size={14} />Adicionar item</Button>
        <div className="invoice-totals"><span>Total da nota <strong>{money(invoiceTotal(draft))}</strong></span><span>Imposto estimado ({draft.taxRate}%) <strong>{money(invoiceTotal(draft) * draft.taxRate / 100)}</strong></span></div>
      </section>
      <section className="invoice-card"><h3>Informações complementares</h3><textarea rows={3} value={draft.notes} onChange={e => set({ notes: e.target.value })} /></section>
      <div className="invoice-actions"><Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button onClick={save}><FileCheck2 size={16} />Enviar solicitação</Button></div>
    </div>;
  }

  const billable = quotes.filter(q => q.status === 'Aprovado' || q.status === 'Em negociação');
  return <div>
    <div className="list-heading"><div><h2>Notas fiscais <span>{invoices.length}</span></h2><p>Solicite uma ou mais notas por orçamento: serviço, produto, simples remessa ou devolução.</p></div>
      <label className="invoice-new"><Receipt size={16} /><select value="" onChange={e => startNew(e.target.value)} aria-label="Nova nota a partir do orçamento"><option value="">+ Nova nota a partir do orçamento…</option>{(billable.length ? billable : quotes).map(q => <option key={q.id} value={q.id}>{q.id} · {q.client}</option>)}</select></label></div>
    <div className="filters"><label className="search-input"><Search size={17} /><input placeholder="Buscar nota, cliente ou tipo..." value={search} onChange={e => setSearch(e.target.value)} />{search && <Button variant="ghost" size="icon" title="Limpar busca" onClick={() => setSearch('')}><X /></Button>}</label>
      <select className="invoice-filter" value={quoteFilter} onChange={e => setQuoteFilter(e.target.value)} aria-label="Filtrar por orçamento"><option value="Todos">Todos os orçamentos</option>{quotes.map(q => <option key={q.id} value={q.id}>{q.id} · {q.client}</option>)}</select></div>
    <div className="table-frame"><div className="table-scroll"><table><thead><tr><th>NOTA</th><th>ORÇAMENTO / CLIENTE</th><th>TIPO</th><th>CFOP</th><th>VALOR</th><th>STATUS</th><th /></tr></thead><tbody>
      {list.map(inv => <tr key={inv.id}><td><span className="quote-id">{inv.id}</span>{inv.number && <small> Nº {inv.number}</small>}</td><td><div><strong>{inv.client}</strong><small>{inv.quoteId}</small></div></td><td>{inv.type}</td><td>{inv.cfop}</td><td className="value-cell">{money(invoiceTotal(inv))}</td><td><span className={`status-badge ${stClass(inv.status)}`}><i />{inv.status}</span></td>
        <td className="invoice-row-actions">{(inv.status === 'Solicitada' || inv.status === 'Em emissão') && <Button variant="outline" size="sm" onClick={() => advance(inv)}>{inv.status === 'Solicitada' ? 'Iniciar emissão' : 'Marcar emitida'}</Button>}{inv.status === 'Solicitada' && <Button variant="ghost" size="sm" onClick={() => setDraft(inv)}>Editar</Button>}{inv.status !== 'Cancelada' && <Button variant="ghost" size="sm" onClick={() => { setInvoices(all => all.map(i => i.id === inv.id ? { ...i, status: 'Cancelada' } : i)); notify(`Nota ${inv.id} cancelada.`); }}>Cancelar</Button>}</td></tr>)}
    </tbody></table>{list.length === 0 && <div className="empty-state"><Receipt /><h3>Nenhuma nota encontrada</h3><p>Escolha um orçamento acima para solicitar a primeira nota.</p></div>}</div>
    <div className="table-footer"><span>{invoiceStatuses.map(s => `${s}: ${invoices.filter(i => i.status === s).length}`).join(' · ')}</span></div></div>
  </div>;
}

function nextId(invoices: Invoice[]) { return `NF-${String(invoices.length + 1).padStart(4, '0')}`; }

function Field({ label, value, onChange, wide }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return <label className={`invoice-field ${wide ? 'wide' : ''}`}><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} /></label>;
}
