import { Fragment, useMemo, useRef, useState, type DragEvent } from 'react';
import { GripVertical, Plus, Save, Trash2, Download, Building2, ListChecks, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { builderTotal, commercialTerms, defaultCatalog, money, termLabels, termOptions, type Quote, type QuoteItem, type Terms } from './data';
import { exportQuotePdf } from './pdf';

type Drag = { kind: 'item'; item: QuoteItem } | { kind: 'field'; tag: string } | { kind: 'term'; key: keyof Terms; value: string };
const fieldTags = ['Cliente', 'Contato', 'E-mail', 'Telefone', 'Projeto', 'Responsável', 'Valor total', 'Validade', 'Pagamento'];

export function QuoteBuilder({ quotes, nextId, onCreate, notify }: { quotes: Quote[]; nextId: string; onCreate: (q: Quote) => void; notify: (t: string) => void }) {
  const clients = useMemo(() => Array.from(new Map(quotes.map(q => [q.client, q])).values()), [quotes]);
  const [catalog, setCatalog] = useState(defaultCatalog);
  const [client, setClient] = useState(clients[0]?.client ?? '');
  const base = clients.find(c => c.client === client);
  const [contact, setContact] = useState(base?.contact ?? ''); const [email, setEmail] = useState(base?.email ?? ''); const [phone, setPhone] = useState(base?.phone ?? '');
  const [project, setProject] = useState('Nova proposta'); const [owner, setOwner] = useState('Marina');
  const [items, setItems] = useState<QuoteItem[]>([]); const [terms, setTerms] = useState<Terms>(commercialTerms); const [discount, setDiscount] = useState(0);
  const [intro, setIntro] = useState('Prezado(a) {{Contato}}, apresentamos a proposta para {{Projeto}} da {{Cliente}}, no valor de {{Valor total}}.');
  const [over, setOver] = useState(''); const introRef = useRef<HTMLTextAreaElement>(null);
  const [newItem, setNewItem] = useState({ description: '', unit: '' });
  const total = builderTotal(items, discount);
  const values: Record<string, string> = { Cliente: client, Contato: contact, 'E-mail': email, Telefone: phone, Projeto: project, 'Responsável': owner, 'Valor total': money(total), Validade: terms.validity, Pagamento: terms.payment };
  const filled = intro.replace(/\{\{(.+?)\}\}/g, (m, k: string) => values[k] ?? m);

  function pickClient(name: string) { setClient(name); const c = clients.find(x => x.client === name); if (c) { setContact(c.contact); setEmail(c.email); setPhone(c.phone); setProject(c.project); setOwner(c.owner); } }
  const start = (d: Drag) => (e: DragEvent) => { e.dataTransfer.setData('application/json', JSON.stringify(d)); e.dataTransfer.effectAllowed = 'copy'; };
  const read = (e: DragEvent): Drag | null => { try { return JSON.parse(e.dataTransfer.getData('application/json')); } catch { return null; } };
  const zone = (name: string, onDrop: (d: Drag) => void) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(name); }, onDragLeave: () => setOver(''),
    onDrop: (e: DragEvent) => { e.preventDefault(); setOver(''); const d = read(e); if (d) onDrop(d); },
    className: `rounded-md border-2 border-dashed p-3 transition-colors ${over === name ? 'border-primary bg-accent' : 'border-transparent'}`,
  });
  function addItem(it: QuoteItem) { setItems(all => { const i = all.findIndex(x => x.description === it.description && x.unit === it.unit); return i >= 0 ? all.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x) : [...all, { ...it }]; }); }
  function insertTag(tag: string) { const el = introRef.current; const pos = el?.selectionStart ?? intro.length; setIntro(intro.slice(0, pos) + `{{${tag}}}` + intro.slice(pos)); }
  function build(): Quote | null {
    if (!client.trim() || !items.length) { notify('Informe o cliente e arraste ao menos um item para o documento.'); return null; }
    return { id: nextId, client, initials: client.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase(), project, value: total, status: 'Em elaboração', owner, date: '2026-10-10', followup: '2026-10-13', contact, email, phone, notes: ['10 out · Orçamento montado no editor.'], color: 'teal', items, terms, discount };
  }
  const chip = 'flex cursor-grab items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm hover:border-primary active:cursor-grabbing';

  return <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
    <aside className="space-y-5 rounded-lg border bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <p className="text-xs text-muted-foreground">Arraste os blocos para dentro do documento.</p>
      <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Tag size={15} />Campos automáticos</h3>
        <div className="flex flex-wrap gap-1.5">{fieldTags.map(t => <span key={t} draggable onDragStart={start({ kind: 'field', tag: t })} onDoubleClick={() => insertTag(t)} className="cursor-grab rounded-full border bg-secondary px-2.5 py-1 text-xs">{t}</span>)}</div></section>
      <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListChecks size={15} />Serviços</h3>
        <div className="space-y-1.5">{catalog.map(it => <div key={it.description} draggable onDragStart={start({ kind: 'item', item: it })} onDoubleClick={() => addItem(it)} className={chip}><GripVertical size={14} className="text-muted-foreground" /><span className="flex-1">{it.description}</span><strong className="text-xs">{money(it.unit)}</strong></div>)}</div>
        <form className="mt-2 flex gap-1.5" onSubmit={e => { e.preventDefault(); const unit = Number(newItem.unit); if (!newItem.description.trim() || !(unit > 0)) return; setCatalog([...catalog, { description: newItem.description.trim(), qty: 1, unit }]); setNewItem({ description: '', unit: '' }); }}>
          <input className="min-w-0 flex-1 rounded-md border bg-background px-2 text-xs" placeholder="Novo serviço" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
          <input className="w-20 rounded-md border bg-background px-2 text-xs" type="number" min="1" placeholder="R$" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
          <Button size="icon" variant="outline" type="submit" title="Adicionar ao catálogo"><Plus /></Button>
        </form></section>
      <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Building2 size={15} />Condições comerciais</h3>
        {(Object.keys(termOptions) as (keyof Terms)[]).map(k => <div key={k} className="mb-2"><small className="text-muted-foreground">{termLabels[k]}</small>
          <div className="mt-1 space-y-1">{termOptions[k].map(v => <div key={v} draggable onDragStart={start({ kind: 'term', key: k, value: v })} onDoubleClick={() => setTerms({ ...terms, [k]: v })} className={`${chip} py-1.5 text-xs`}><GripVertical size={12} className="text-muted-foreground" />{v}</div>)}</div></div>)}
      </section>
    </aside>

    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Dica: dê dois cliques em um bloco para adicioná-lo direto.</p>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { const q = build(); if (q) exportQuotePdf(q); }}><Download />Pré-visualizar PDF</Button><Button onClick={() => { const q = build(); if (q) onCreate(q); }}><Save />Salvar orçamento</Button></div></div>
      <article className="mx-auto max-w-[820px] rounded-sm border bg-card p-6 shadow-lg sm:p-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-4"><div><div className="text-2xl font-bold">órbita<span className="text-primary">.</span></div><small className="text-muted-foreground">Studio Criativo</small></div><div className="text-right"><strong className="block">PROPOSTA COMERCIAL</strong><small className="text-muted-foreground">{nextId} · 10 out, 2026</small></div></header>

        <div {...zone('client', d => { if (d.kind === 'field') insertTag(d.tag); })}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field-label">Cliente<select value={client} onChange={e => pickClient(e.target.value)}>{clients.map(c => <option key={c.client}>{c.client}</option>)}</select></label>
            <label className="field-label">Projeto<input value={project} onChange={e => setProject(e.target.value)} /></label>
            <label className="field-label">Contato<input value={contact} onChange={e => setContact(e.target.value)} /></label>
            <label className="field-label">Responsável<select value={owner} onChange={e => setOwner(e.target.value)}><option>Marina</option><option>Lucas</option><option>Pedro</option></select></label>
            <label className="field-label">E-mail<input value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="field-label">Telefone<input value={phone} onChange={e => setPhone(e.target.value)} /></label>
          </div>
        </div>

        <div {...zone('intro', d => { if (d.kind === 'field') insertTag(d.tag); })}>
          <label className="field-label">Apresentação (solte campos aqui)<textarea ref={introRef} rows={3} value={intro} onChange={e => setIntro(e.target.value)} /></label>
          <p className="mt-2 rounded-md bg-secondary p-3 text-sm">{filled}</p>
        </div>

        <div {...zone('items', d => { if (d.kind === 'item') addItem(d.item); })}>
          <h3 className="mb-2 font-semibold">Itens e escopo</h3>
          {items.length === 0 ? <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Arraste serviços do painel para cá</div> :
            <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Descrição</th><th className="w-16">Qtd.</th><th className="w-28">Unitário</th><th className="w-28 text-right">Total</th><th className="w-8" /></tr></thead>
              <tbody>{items.map((it, i) => <tr key={i} className="border-b">
                <td className="py-1.5 pr-2"><input className="w-full bg-transparent" value={it.description} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
                <td><input aria-label="Quantidade" type="number" min="1" className="w-14 rounded border bg-background px-1" value={it.qty} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} /></td>
                <td><input aria-label="Valor unitário" type="number" min="0" className="w-24 rounded border bg-background px-1" value={it.unit} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, unit: Math.max(0, Number(e.target.value)) } : x))} /></td>
                <td className="text-right font-medium">{money(it.qty * it.unit)}</td>
                <td><Button size="icon" variant="ghost" title="Remover item" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={14} /></Button></td></tr>)}</tbody></table>}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-4 text-sm"><label className="flex items-center gap-2">Desconto (%)<input type="number" min="0" max="100" className="w-16 rounded border bg-background px-1" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></label><span>Total: <strong className="text-lg">{money(total)}</strong></span></div>
        </div>

        <div {...zone('terms', d => { if (d.kind === 'term') setTerms({ ...terms, [d.key]: d.value }); })}>
          <h3 className="mb-2 font-semibold">Condições comerciais <small className="font-normal text-muted-foreground">(solte condições aqui)</small></h3>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[160px_1fr]">{(Object.keys(termLabels) as (keyof Terms)[]).map(k => <Fragment key={k}><dt className="font-medium">{termLabels[k]}</dt><dd><input aria-label={termLabels[k]} className="w-full bg-transparent" value={terms[k]} onChange={e => setTerms({ ...terms, [k]: e.target.value })} /></dd></Fragment>)}</dl>
        </div>
        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-muted-foreground"><div className="border-t pt-2">{contact} · {client}</div><div className="border-t pt-2">{owner} · Studio Criativo</div></footer>
      </article>
    </div>
  </div>;
}
