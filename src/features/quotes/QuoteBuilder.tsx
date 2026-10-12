import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Bold, ChevronLeft, ChevronRight, Copy, DollarSign, Eye, EyeOff, FileSignature, Hash, Image as ImageIcon, Italic, List, ListOrdered, Minus, Pilcrow, Plus, Redo2, Save, ScrollText, Search, Strikethrough, Table2, Trash2, Type, Underline, Undo2, User, Wrench, Building2, Download, AlignLeft, AlignCenter, AlignRight, AlignJustify, PanelTop, PanelBottom } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { builderTotal, commercialTerms, defaultCatalog, money, pickColor, quoteItems, termLabels, termOptions, type Partner, type Quote, type QuoteItem, type Terms } from './data';
import { exportQuotePdf } from './pdf';

type BlockType = 'header' | 'logo' | 'title' | 'number' | 'client' | 'products' | 'services' | 'financial' | 'terms' | 'text' | 'image' | 'signature' | 'footer';
type Block = {
  id: string; type: BlockType; label: string; visible: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  accent: string; spacing: 'compact' | 'normal' | 'wide';
  html?: string; img?: string;
  headerHtml?: string; headerImg?: string;
  footerHtml?: string; footerImg?: string;
  showDiscount?: boolean;
  customTerms?: Partial<Record<keyof Terms, string>>;
  useCustomTerms?: Partial<Record<keyof Terms, boolean>>;
  signatureHtml?: string;
};
type Drag = { kind: 'block'; type: BlockType } | { kind: 'move'; id: string } | { kind: 'item'; item: QuoteItem; service?: boolean };

const palette: { group: string; items: { type: BlockType; label: string; hint: string; icon: typeof Type }[] }[] = [
  { group: 'Identificação', items: [
    { type: 'header', label: 'Cabeçalho personalizado', hint: 'Logo, cores e dados — com imagem', icon: PanelTop },
    { type: 'logo', label: 'Logotipo', hint: 'Marca e dados da empresa', icon: Building2 },
    { type: 'title', label: 'Título do orçamento', hint: 'Título e descrição', icon: Type },
    { type: 'number', label: 'Número e validade', hint: 'Referência e vencimento', icon: Hash },
  ] },
  { group: 'Dados vinculados', items: [
    { type: 'client', label: 'Dados do cliente', hint: 'Identificação e contato', icon: User },
    { type: 'products', label: 'Tabela de produtos', hint: 'Itens, quantidades e valores', icon: Table2 },
    { type: 'services', label: 'Tabela de serviços', hint: 'Escopo e execução', icon: Wrench },
  ] },
  { group: 'Comercial', items: [
    { type: 'financial', label: 'Resumo financeiro', hint: 'Subtotal, descontos e total', icon: DollarSign },
    { type: 'terms', label: 'Condições comerciais', hint: 'Prazo, validade e pagamento', icon: ScrollText },
    { type: 'text', label: 'Texto livre', hint: 'Conteúdo independente', icon: Pilcrow },
    { type: 'image', label: 'Imagem', hint: 'Foto, esquema ou logotipo', icon: ImageIcon },
    { type: 'signature', label: 'Assinatura e aceite', hint: 'Responsáveis e aprovação', icon: FileSignature },
    { type: 'footer', label: 'Rodapé personalizado', hint: 'Texto, imagem e contato — com imagem', icon: PanelBottom },
  ] },
];
const labelOf = (t: BlockType) => palette.flatMap(g => g.items).find(i => i.type === t)?.label ?? t;
let seq = 0; const uid = () => `b${++seq}`;
const mk = (type: BlockType, extra: Partial<Block> = {}): Block => ({ id: uid(), type, label: labelOf(type), visible: true, align: 'left', accent: '#0f4c46', spacing: 'normal', showDiscount: true, ...extra });
const gap = { compact: 'mb-3', normal: 'mb-6', wide: 'mb-10' };

function Editable({ html, onChange, className, placeholder, readOnly }: { html: string; onChange: (h: string) => void; className?: string; placeholder?: string; readOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html; }, [html]);
  return <div ref={ref} contentEditable={!readOnly} suppressContentEditableWarning data-placeholder={placeholder} onBlur={e => onChange(e.currentTarget.innerHTML)} className={`outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] ${className ?? ''}`} />;
}

type MarginKey = 'top' | 'bottom' | 'left' | 'right';

export function QuoteBuilder({ quotes, partners, nextId, editQuote, isRevision, onCreate, onUpdate, onClose, notify }: { quotes: Quote[]; partners: Partner[]; nextId: string; editQuote?: Quote | null; isRevision?: boolean; onCreate: (q: Quote) => void; onUpdate: (q: Quote) => void; onClose: () => void; notify: (t: string) => void }) {
  const clients = useMemo(() => Array.from(new Map(quotes.map(q => [q.client, q])).values()), [quotes]);
  const isEditing = !!editQuote;
  const existingItems = editQuote?.items?.length ? editQuote.items : quoteItems(editQuote ?? { value: 0, project: '' } as Quote);
  const [client, setClient] = useState(editQuote?.client ?? clients[0]?.client ?? '');
  const c = clients.find(x => x.client === client);
  const [project, setProject] = useState(editQuote?.project ?? c?.project ?? 'Nova proposta');
  const [owner, setOwner] = useState(editQuote?.owner ?? c?.owner ?? 'Marina');
  const [followup, setFollowup] = useState(editQuote?.followup ?? '2026-10-13');
  const [items, setItems] = useState<QuoteItem[]>(isEditing ? existingItems : [defaultCatalog[2]!]);
  const [services, setServices] = useState<QuoteItem[]>(isEditing ? [] : [defaultCatalog[0]!]);
  const [terms, setTerms] = useState<Terms>(editQuote?.terms ?? commercialTerms);
  const [discount, setDiscount] = useState(editQuote?.discount ?? 0);
  const [selectedPartners, setSelectedPartners] = useState<string[]>(editQuote?.partnerIds ?? []);
  const [blocks, setBlocks] = useState<Block[]>(() => [
    mk('header', { headerHtml: '<strong>Órbita Studio Criativo</strong><p>Design · Tecnologia · Estratégia<br>comercial@orbita.example · (11) 4000-1234</p>' }),
    mk('title', { html: `<h2>Proposta comercial — ${editQuote?.client ?? c?.client ?? ''}</h2><p>Solução personalizada para ${editQuote?.project ?? c?.project ?? 'o seu projeto'}.</p>` }),
    mk('client'), mk('products'), mk('services'), mk('financial'), mk('terms'),
    mk('signature', { signatureHtml: '<p>Assinatura do cliente</p><p>Assinatura do fornecedor</p>' }),
    mk('footer', { footerHtml: '<p>Documento gerado por Órbita · Studio Criativo — dados demonstrativos.</p>' }),
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [tab, setTab] = useState<'Blocos' | 'Clientes' | 'Parceiros' | 'Produtos'>('Blocos');
  const [q, setQ] = useState('');
  const [rightTab, setRightTab] = useState<'Bloco' | 'Comentários' | 'Documento'>('Bloco');
  const [comments, setComments] = useState<string[]>(['Marina: revisar prazo de entrega antes de enviar.']);
  const [comment, setComment] = useState('');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [preview, setPreview] = useState(false);
  const [margins, setMargins] = useState({ top: 40, bottom: 40, left: 64, right: 64 });
  const all = [...items, ...services];
  const subtotal = builderTotal(all, 0);
  const total = builderTotal(all, discount);
  const sel = blocks.find(b => b.id === selected);
  const update = (id: string, p: Partial<Block>) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...p } : b));

  function selectClient(name: string) {
    setClient(name);
    const found = clients.find(x => x.client === name);
    if (found) { setOwner(found.owner); if (!isEditing) setProject(found.project); }
  }

  function insert(type: BlockType, at = blocks.length) {
    const b = mk(type, type === 'text' ? { html: '<p>Escreva aqui…</p>' } : type === 'footer' ? { footerHtml: '<p>Escreva aqui…</p>' } : {});
    setBlocks(bs => [...bs.slice(0, at), b, ...bs.slice(at)]); setSelected(b.id);
  }
  function move(id: string, to: number) {
    setBlocks(bs => { const from = bs.findIndex(b => b.id === id); const b = bs[from]!; const rest = bs.filter(x => x.id !== id); const idx = to > from ? to - 1 : to; return [...rest.slice(0, idx), b, ...rest.slice(idx)]; });
  }
  function addItem(it: QuoteItem, service: boolean) {
    (service ? setServices : setItems)(list => { const i = list.findIndex(x => x.description === it.description); return i >= 0 ? list.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x) : [...list, { ...it }]; });
  }
  const start = (d: Drag) => (e: DragEvent) => { e.dataTransfer.setData('application/json', JSON.stringify(d)); e.stopPropagation(); };
  const read = (e: DragEvent): Drag | null => { try { return JSON.parse(e.dataTransfer.getData('application/json')); } catch { return null; } };
  function onDocDrop(e: DragEvent) {
    e.preventDefault(); const d = read(e); const at = dropAt ?? blocks.length; setDropAt(null); if (!d) return;
    if (d.kind === 'block') insert(d.type, at); else if (d.kind === 'move') move(d.id, at);
    else { const target = d.service ? 'services' : 'products'; if (!blocks.some(b => b.type === target)) insert(target, at); addItem(d.item, !!d.service); }
  }
  const fmt = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

  function startMarginDrag(key: MarginKey, e: React.PointerEvent) {
    e.stopPropagation();
    const startCoord = key === 'top' || key === 'bottom' ? e.clientY : e.clientX;
    const startVal = margins[key];
    const invert = key === 'bottom' || key === 'right';
    const onMove = (ev: PointerEvent) => {
      const delta = invert ? startCoord - ev.clientY : ev.clientY - startCoord;
      void delta;
      const raw = invert ? startCoord - (key === 'bottom' ? ev.clientY : ev.clientX) : (key === 'top' ? ev.clientY : ev.clientX) - startCoord;
      const clamped = Math.max(10, Math.min(120, startVal + raw));
      setMargins(m => ({ ...m, [key]: clamped }));
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleImageUpload(field: 'img' | 'headerImg' | 'footerImg', blockId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) update(blockId, { [field]: URL.createObjectURL(f) });
  }

  function build(): Quote | null {
    if (!client || !all.length) { notify('Escolha um cliente e adicione ao menos um item.'); return null; }
    return {
      id: editQuote?.id ?? nextId, client,
      initials: editQuote?.initials ?? client.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase(),
      project, value: total, status: editQuote?.status ?? 'Em elaboração', owner,
      date: editQuote?.date ?? '2026-10-10', followup,
      contact: c?.contact ?? editQuote?.contact ?? '', email: c?.email ?? editQuote?.email ?? '', phone: c?.phone ?? editQuote?.phone ?? '',
      notes: editQuote?.notes ?? ['10 out · Orçamento criado no editor.'],
      color: editQuote?.color ?? pickColor(quotes.length), items: all, terms, discount,
      partnerIds: selectedPartners.length ? selectedPartners : undefined,
    };
  }
  const save = () => { const qq = build(); if (!qq) return; if (isEditing) { onUpdate(qq); notify(isRevision ? 'Revisão salva com sucesso.' : 'Orçamento atualizado com sucesso.'); } else { onCreate(qq); } };
  const pdf = () => { const qq = build(); if (qq) { exportQuotePdf(qq); notify('PDF da proposta gerado.'); } };

  function table(list: QuoteItem[], set: (l: QuoteItem[]) => void, title: string, service: boolean, accent: string) {
    return <div onDragOver={e => e.preventDefault()} onDrop={e => { const d = read(e); if (d?.kind === 'item') { e.preventDefault(); e.stopPropagation(); setDropAt(null); addItem(d.item, service); } }}>
      <div className="mb-2 flex justify-between"><h4 className="text-xs font-bold tracking-widest" style={{ color: accent }}>{title.toUpperCase()}</h4><small className="text-muted-foreground">{list.length} ITENS</small></div>
      <table className="w-full text-sm"><thead><tr className="bg-secondary text-left text-[11px] text-muted-foreground"><th className="p-2">DESCRIÇÃO</th><th className="w-16">QTD.</th><th className="w-28">UNITÁRIO</th><th className="w-28 pr-2 text-right">TOTAL</th>{!preview && <th className="w-8" />}</tr></thead>
        <tbody>{list.map((it, i) => <tr key={i} className="border-b">
          <td className="p-2"><input aria-label="Descrição" readOnly={preview} className="w-full bg-transparent font-medium" value={it.description} onChange={e => set(list.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
          <td><input aria-label="Quantidade" readOnly={preview} type="number" min={1} className="w-14 bg-transparent" value={it.qty} onChange={e => set(list.map((x, j) => j === i ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} /></td>
          <td><input aria-label="Valor unitário" readOnly={preview} type="number" min={0} className="w-24 bg-transparent" value={it.unit} onChange={e => set(list.map((x, j) => j === i ? { ...x, unit: Math.max(0, Number(e.target.value)) } : x))} /></td>
          <td className="pr-2 text-right">{money(it.qty * it.unit)}</td>
          {!preview && <td><Button size="icon" variant="ghost" className="h-7 w-7" title="Remover" onClick={() => set(list.filter((_, j) => j !== i))}><Trash2 size={13} /></Button></td>}</tr>)}</tbody></table>
      {!preview && <p className="mt-1 text-[11px] text-muted-foreground">Arraste itens da aba Produtos para cá.</p>}
    </div>;
  }

  function render(b: Block): ReactNode {
    const A = b.accent;
    const head = (t: string, r?: string) => <div className="mb-2 flex justify-between"><h4 className="text-xs font-bold tracking-widest" style={{ color: A }}>{t}</h4>{r && <small className="text-[11px] text-muted-foreground">{r}</small>}</div>;
    switch (b.type) {
      case 'header':
        return <div className="flex items-start justify-between gap-4 border-b pb-5" style={{ borderColor: A }}>
          <div className="flex items-start gap-3">
            {b.headerImg ? <img src={b.headerImg} alt="Logo" className="max-h-16 max-w-48 rounded-md object-contain" /> : <span className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-primary-foreground" style={{ background: A }}>Ó</span>}
            {preview
              ? <div className="text-sm [&_p]:text-xs [&_p]:text-muted-foreground [&_strong]:text-base [&_strong]:font-bold" dangerouslySetInnerHTML={{ __html: b.headerHtml ?? '' }} />
              : <Editable html={b.headerHtml ?? ''} onChange={h => update(b.id, { headerHtml: h })} className="text-sm [&_p]:text-xs [&_p]:text-muted-foreground [&_strong]:text-base [&_strong]:font-bold" placeholder="Nome da empresa e dados de contato" />}
          </div>
          <div className="text-right"><small className="text-[11px] font-bold tracking-widest text-muted-foreground">ORÇAMENTO COMERCIAL</small><div className="text-xl font-bold" style={{ color: A }}>{editQuote?.id ?? nextId}</div><small className="text-xs text-muted-foreground">10 out 2026 · Versão 01</small></div>
        </div>;
      case 'logo':
        return <div className="flex items-start justify-between gap-4 border-b pb-5"><div className="flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-primary-foreground" style={{ background: A }}>Ó</span><div><strong>Órbita Studio Criativo</strong><p className="text-xs text-muted-foreground">Design · Tecnologia · Estratégia<br />comercial@orbita.example · (11) 4000-1234</p></div></div><div className="text-right"><small className="text-[11px] tracking-widest text-muted-foreground">ORÇAMENTO COMERCIAL</small><div className="text-xl font-bold" style={{ color: A }}>{editQuote?.id ?? nextId}</div><small className="text-xs text-muted-foreground">10 out 2026 · Versão 01</small></div></div>;
      case 'title':
        return <div><small className="text-[11px] font-bold tracking-widest" style={{ color: A }}>PROPOSTA COMERCIAL</small><Editable html={b.html ?? ''} onChange={h => update(b.id, { html: h })} className="[&_h2]:text-2xl [&_h2]:font-bold [&_p]:text-sm [&_p]:text-muted-foreground" placeholder="Título da proposta" /></div>;
      case 'number':
        return <div className="grid grid-cols-3 gap-3 text-sm">{[['Número', editQuote?.id ?? nextId], ['Emissão', '10 out 2026'], ['Validade', terms.validity]].map(([k, v]) => <div key={k}><small className="text-muted-foreground">{k}</small><p className="font-medium">{v}</p></div>)}</div>;
      case 'client':
        return <div>{head('DADOS DO CLIENTE', 'VINCULADO AO CADASTRO')}<div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">{[['Razão social', client], ['Projeto', project], ['Contato', c?.contact ?? editQuote?.contact], ['E-mail', c?.email ?? editQuote?.email], ['Telefone', c?.phone ?? editQuote?.phone], ['Responsável', owner]].map(([k, v]) => <div key={k}><small className="text-xs text-muted-foreground">{k}</small><p className="font-medium">{v || '—'}</p></div>)}</div></div>;
      case 'products': return table(items, setItems, 'Produtos', false, A);
      case 'services': return table(services, setServices, 'Serviços', true, A);
      case 'financial':
        return <div>{head('RESUMO FINANCEIRO')}<div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {b.showDiscount !== false && <div className="flex items-center justify-between"><span>Desconto (%)</span>{preview ? <span>{discount}%</span> : <input aria-label="Desconto" type="number" min={0} max={100} className="w-16 rounded border bg-background px-1 text-right" value={discount} onChange={e => setDiscount(Number(e.target.value))} />}</div>}
          <div className="flex justify-between border-t pt-2 text-base font-bold" style={{ color: A }}><span>Total</span><span>{money(total)}</span></div>
        </div></div>;
      case 'terms':
        return <div>{head('CONDIÇÕES COMERCIAIS')}<dl className="grid grid-cols-[150px_1fr] gap-y-1.5 text-sm">{(Object.keys(termLabels) as (keyof Terms)[]).map(k => {
          const useCustom = b.useCustomTerms?.[k] === true;
          const customVal = b.customTerms?.[k] ?? '';
          return <div key={k} className="contents"><dt className="text-muted-foreground">{termLabels[k]}</dt><dd>{preview ? (useCustom ? customVal : terms[k]) : useCustom
            ? <input aria-label={termLabels[k]} className="w-full rounded border bg-background px-2 py-0.5" value={customVal} onChange={e => update(b.id, { customTerms: { ...b.customTerms, [k]: e.target.value } })} placeholder="Digite seu texto personalizado" />
            : <select aria-label={termLabels[k]} className="w-full bg-transparent" value={terms[k]} onChange={e => setTerms({ ...terms, [k]: e.target.value })}>{Array.from(new Set([terms[k], ...termOptions[k]])).map(o => <option key={o}>{o}</option>)}</select>}</dd></div>;
        })}</dl></div>;
      case 'text':
        return <Editable html={b.html ?? ''} onChange={h => update(b.id, { html: h })} className="text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5" placeholder="Escreva aqui…" />;
      case 'image':
        return b.img ? <img src={b.img} alt="Imagem do orçamento" className="max-h-72 rounded-md" style={{ display: 'inline-block' }} /> : <label className="grid h-32 cursor-pointer place-items-center rounded-md border border-dashed text-sm text-muted-foreground"><span><ImageIcon className="mx-auto mb-1" />Clique para escolher uma imagem</span><input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('img', b.id, e)} /></label>;
      case 'signature':
        return <div>{head('ASSINATURA E ACEITE')}<div className="mt-10 grid grid-cols-2 gap-10 text-center text-xs text-muted-foreground">
          <div className="border-t pt-2">{c?.contact ?? editQuote?.contact} · {client}</div>
          <div className="border-t pt-2">{owner} · Órbita Studio</div>
        </div></div>;
      case 'footer':
        return <div className="border-t pt-4" style={{ borderColor: A }}>
          <div className="flex items-center justify-between gap-4">
            {preview
              ? <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: b.footerHtml ?? '' }} />
              : <Editable html={b.footerHtml ?? ''} onChange={h => update(b.id, { footerHtml: h })} className="text-xs text-muted-foreground [&_p]:text-xs" placeholder="Texto do rodapé" />}
            {b.footerImg && <img src={b.footerImg} alt="Logo do rodapé" className="max-h-12 max-w-32 rounded-md object-contain" />}
          </div>
          {!preview && !b.footerImg && <label className="mt-2 flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground"><ImageIcon size={12} />Adicionar imagem ao rodapé<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('footerImg', b.id, e)} /></label>}
          {!preview && b.footerImg && <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => update(b.id, { footerImg: undefined })}>Remover imagem</Button>}
        </div>;
    }
  }

  const filteredPalette = palette.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) })).filter(g => g.items.length);
  const visibleBlocks = blocks.filter(b => !preview || b.visible);
  const menu = (label: string, entries: [string, () => void][]) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 font-normal">{label}</Button></DropdownMenuTrigger><DropdownMenuContent align="start">{entries.map(([l, f], i) => l === '-' ? <DropdownMenuSeparator key={i} /> : <DropdownMenuItem key={l} onSelect={f}>{l}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
  const tb = (title: string, icon: ReactNode, cmd: () => void) => <Button variant="ghost" size="icon" className="h-8 w-8" title={title} onMouseDown={e => { e.preventDefault(); cmd(); }}>{icon}</Button>;
  const docStyle = { paddingTop: margins.top, paddingBottom: margins.bottom, paddingLeft: margins.left, paddingRight: margins.right } as React.CSSProperties;

  function MarginSlider({ label: ml, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return <label className="block"><div className="mb-1 flex items-center justify-between text-xs"><span>{ml}</span><span className="text-muted-foreground">{value}px</span></div><input type="range" min={10} max={120} value={value} className="w-full accent-primary" onChange={e => onChange(Number(e.target.value))} /></label>;
  }

  const alignOptions: [string, typeof AlignLeft][] = [['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify]];

  return <div className="fixed inset-0 z-40 flex flex-col bg-background text-foreground">
    <header className="flex flex-wrap items-center gap-3 border-b px-3 py-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">Ó</span>
      <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate">{isRevision ? 'Revisão de' : isEditing ? 'Editar' : 'Novo'} orçamento — {project}</strong><span className="rounded bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{isRevision ? `Revisão ${editQuote?.revisionNumber ?? 2}` : isEditing ? 'Edição' : 'Rascunho'}</span></div><small className="text-muted-foreground">{editQuote?.id ?? nextId} · {isRevision ? `Revisão ${editQuote?.revisionNumber ?? 2}` : 'Versão 01'}</small></div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">Projeto<input className="h-7 w-40 rounded border bg-background px-2 text-xs" value={project} onChange={e => setProject(e.target.value)} /></label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">Follow-up<input type="date" className="h-7 rounded border bg-background px-2 text-xs" value={followup} onChange={e => setFollowup(e.target.value)} /></label>
        <Button variant="outline" size="sm" onClick={onClose}><ArrowLeft />Voltar</Button>
        <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>{preview ? <EyeOff /> : <Eye />}{preview ? 'Editar' : 'Visualizar'}</Button>
        <Button variant="outline" size="sm" onClick={save}><Save />{isEditing ? 'Salvar alterações' : 'Salvar'}</Button>
        <Button size="sm" onClick={pdf}><Download />Exportar PDF</Button>
      </div>
    </header>
    <nav className="flex flex-wrap gap-0.5 border-b px-2 text-sm">
      {menu('Arquivo', [[isEditing ? 'Salvar alterações' : 'Salvar orçamento', save], ['Exportar PDF', pdf], ['-', () => {}], ['Fechar editor', onClose]])}
      {menu('Editar', [['Desfazer', () => fmt('undo')], ['Refazer', () => fmt('redo')], ['-', () => {}], ['Excluir bloco selecionado', () => { if (selected) { setBlocks(bs => bs.filter(b => b.id !== selected)); setSelected(null); } }]])}
      {menu('Inserir', palette.flatMap(g => g.items).map(i => [i.label, () => insert(i.type)] as [string, () => void]))}
      {menu('Formatar', [['Negrito', () => fmt('bold')], ['Itálico', () => fmt('italic')], ['Sublinhado', () => fmt('underline')], ['Tachado', () => fmt('strikeThrough')], ['Lista com marcadores', () => fmt('insertUnorderedList')], ['Lista numerada', () => fmt('insertOrderedList')]])}
      {menu('Exibir', [[leftOpen ? 'Ocultar blocos' : 'Mostrar blocos', () => setLeftOpen(!leftOpen)], [rightOpen ? 'Ocultar propriedades' : 'Mostrar propriedades', () => setRightOpen(!rightOpen)], ['Zoom 100%', () => setZoom(100)]])}
    </nav>
    <div className="flex min-h-0 flex-1">
      {leftOpen && <aside className="flex w-72 shrink-0 flex-col border-r max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-10 max-md:bg-background">
        <div className="flex items-center justify-between p-3"><strong className="text-sm">Espaço de trabalho</strong><Button variant="ghost" size="icon" className="h-7 w-7" title="Recolher" onClick={() => setLeftOpen(false)}><ChevronLeft size={15} /></Button></div>
        <div className="flex gap-1 px-3">{(['Blocos', 'Clientes', 'Parceiros', 'Produtos'] as const).map(t => <Button key={t} size="sm" variant={tab === t ? 'secondary' : 'ghost'} className="h-7" onClick={() => setTab(t)}>{t}</Button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === 'Blocos' && <><label className="mb-3 flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"><Search size={14} /><input className="w-full bg-transparent outline-none" placeholder="Buscar blocos…" value={q} onChange={e => setQ(e.target.value)} /></label>
            {filteredPalette.map(g => <div key={g.group} className="mb-4"><small className="text-[11px] font-bold tracking-widest text-muted-foreground">{g.group.toUpperCase()}</small>
              {g.items.map(i => <div key={i.type} draggable onDragStart={start({ kind: 'block', type: i.type })} className="mt-1 flex cursor-grab items-center gap-3 rounded-md p-2 hover:bg-secondary active:cursor-grabbing">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground"><i.icon size={15} /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{i.label}</p><p className="truncate text-[11px] text-muted-foreground">{i.hint}</p></div>
                <Button variant="ghost" size="icon" className="h-7 w-7" title={`Inserir ${i.label}`} onClick={() => insert(i.type)}><Plus size={14} /></Button>
              </div>)}</div>)}</>}
          {tab === 'Clientes' && clients.map(x => <button key={x.client} onClick={() => { selectClient(x.client); notify(`Dados de ${x.client} vinculados ao documento.`); }} className={`mb-1 w-full rounded-md border p-2 text-left text-sm ${x.client === client ? 'border-primary bg-accent' : ''}`}><strong>{x.client}</strong><p className="text-xs text-muted-foreground">{x.contact} · {x.email}</p></button>)}
          {tab === 'Parceiros' && <><p className="mb-3 text-[11px] text-muted-foreground">Selecione os parceiros que participam desta proposta.</p>{partners.map(p => <label key={p.id} className={`mb-1 flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm ${selectedPartners.includes(p.id) ? 'border-primary bg-accent' : ''}`}><input type="checkbox" className="h-4 w-4" checked={selectedPartners.includes(p.id)} onChange={e => { setSelectedPartners(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)); }} /><span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">{p.initials}</span><div className="min-w-0 flex-1"><strong className="block truncate">{p.name}</strong><small className="text-muted-foreground">{p.category}</small></div></label>)}</>}
          {tab === 'Produtos' && <>{[['Produtos', false], ['Serviços', true]].map(([t, s]) => <div key={String(t)} className="mb-4"><small className="text-[11px] font-bold tracking-widest text-muted-foreground">{String(t).toUpperCase()} — ARRASTE PARA A TABELA</small>
            {defaultCatalog.map(it => <div key={it.description} draggable onDragStart={start({ kind: 'item', item: it, service: !!s })} onDoubleClick={() => addItem(it, !!s)} className="mt-1 flex cursor-grab items-center justify-between gap-2 rounded-md border p-2 text-xs hover:border-primary"><span>{it.description}</span><strong>{money(it.unit)}</strong></div>)}</div>)}</>}
        </div>
      </aside>}
      <section className="flex min-w-0 flex-1 flex-col">
        {!preview && <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
          {!leftOpen && <Button variant="ghost" size="icon" className="h-8 w-8" title="Mostrar blocos" onClick={() => setLeftOpen(true)}><ChevronRight size={15} /></Button>}
          {tb('Desfazer', <Undo2 size={15} />, () => fmt('undo'))}{tb('Refazer', <Redo2 size={15} />, () => fmt('redo'))}
          <select aria-label="Estilo" className="h-8 rounded border bg-background px-1 text-xs" onChange={e => fmt('formatBlock', e.target.value)} defaultValue="p"><option value="p">Texto normal</option><option value="h2">Título</option><option value="h3">Subtítulo</option></select>
          <select aria-label="Fonte" className="h-8 rounded border bg-background px-1 text-xs" onChange={e => fmt('fontName', e.target.value)}><option>DM Sans</option><option>Georgia</option><option>Arial</option><option>Courier New</option></select>
          <select aria-label="Tamanho" className="h-8 rounded border bg-background px-1 text-xs" defaultValue="3" onChange={e => fmt('fontSize', e.target.value)}>{[['2', '10 pt'], ['3', '12 pt'], ['4', '14 pt'], ['5', '18 pt'], ['6', '24 pt']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {tb('Negrito', <Bold size={15} />, () => fmt('bold'))}{tb('Itálico', <Italic size={15} />, () => fmt('italic'))}{tb('Sublinhado', <Underline size={15} />, () => fmt('underline'))}{tb('Tachado', <Strikethrough size={15} />, () => fmt('strikeThrough'))}
          {tb('Marcadores', <List size={15} />, () => fmt('insertUnorderedList'))}{tb('Numeração', <ListOrdered size={15} />, () => fmt('insertOrderedList'))}
          <Button variant="ghost" size="sm" className="h-8" onClick={() => insert('text', selected ? blocks.findIndex(b => b.id === selected) + 1 : blocks.length)}><Plus size={14} />Bloco</Button>
          <div className="ml-auto flex items-center gap-1 text-xs">{tb('Diminuir zoom', <Minus size={14} />, () => setZoom(z => Math.max(50, z - 10)))}<span className="w-10 text-center">{zoom}%</span>{tb('Aumentar zoom', <Plus size={14} />, () => setZoom(z => Math.min(150, z + 10)))}</div>
        </div>}
        <div className="min-h-0 flex-1 overflow-auto bg-muted p-4 sm:p-8" onClick={() => setSelected(null)}>
          <div className="mx-auto mb-2 flex max-w-[794px] justify-between text-[11px] text-muted-foreground"><span>DOCUMENTO · A4</span><span>{zoom}%</span></div>
          <div className="mx-auto origin-top" style={{ width: 794, maxWidth: '100%', zoom: zoom / 100 }}>
            <article className="relative min-h-[1123px] bg-card shadow-lg" onDragOver={e => { e.preventDefault(); }} onDragLeave={() => setDropAt(null)} onDrop={onDocDrop} style={docStyle}>
              {!preview && <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto absolute left-0 top-0 z-20 flex w-full cursor-ns-resize items-center justify-center" style={{ height: margins.top }} onPointerDown={e => startMarginDrag('top', e)}><div className="h-1 w-16 rounded-full bg-primary/40 hover:bg-primary hover:h-1.5 transition-all" /></div>
                <div className="pointer-events-auto absolute left-0 bottom-0 z-20 flex w-full cursor-ns-resize items-center justify-center" style={{ height: margins.bottom }} onPointerDown={e => startMarginDrag('bottom', e)}><div className="h-1 w-16 rounded-full bg-primary/40 hover:bg-primary hover:h-1.5 transition-all" /></div>
                <div className="pointer-events-auto absolute left-0 top-0 z-20 flex h-full cursor-ew-resize items-center justify-center" style={{ width: margins.left }} onPointerDown={e => startMarginDrag('left', e)}><div className="h-16 w-1 rounded-full bg-primary/40 hover:bg-primary hover:w-1.5 transition-all" /></div>
                <div className="pointer-events-auto absolute right-0 top-0 z-20 flex h-full cursor-ew-resize items-center justify-center" style={{ width: margins.right }} onPointerDown={e => startMarginDrag('right', e)}><div className="h-16 w-1 rounded-full bg-primary/40 hover:bg-primary hover:w-1.5 transition-all" /></div>
              </div>}
              {visibleBlocks.map((b, i) => <div key={b.id}>
                {dropAt === i && <div className="mb-2 h-1 rounded bg-primary" />}
                <div draggable={!preview} onDragStart={start({ kind: 'move', id: b.id })}
                  onDragOver={e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1); }}
                  onClick={e => { e.stopPropagation(); if (!preview) setSelected(b.id); }}
                  className={`group relative rounded-md ${gap[b.spacing]} ${preview ? '' : 'p-3 ring-1'} ${selected === b.id ? 'ring-2 ring-primary' : preview ? '' : 'ring-transparent hover:ring-border'} ${!b.visible ? 'opacity-40' : ''}`}
                  style={{ textAlign: b.align }}>
                  {selected === b.id && <div className="absolute -top-4 right-2 z-10 flex rounded-md border bg-card shadow-sm">
                    {tb('Mover para cima', <ArrowUp size={13} />, () => i > 0 && move(b.id, i - 1))}{tb('Mover para baixo', <ArrowDown size={13} />, () => move(b.id, i + 2))}
                    {tb('Duplicar', <Copy size={13} />, () => setBlocks(bs => [...bs.slice(0, i + 1), { ...b, id: uid() }, ...bs.slice(i + 1)]))}
                    {tb(b.visible ? 'Ocultar' : 'Mostrar', b.visible ? <EyeOff size={13} /> : <Eye size={13} />, () => update(b.id, { visible: !b.visible }))}
                    {tb('Excluir', <Trash2 size={13} />, () => { setBlocks(bs => bs.filter(x => x.id !== b.id)); setSelected(null); })}
                  </div>}
                  {render(b)}
                </div>
              </div>)}
              {dropAt === visibleBlocks.length && <div className="h-1 rounded bg-primary" />}
              {!preview && <div className="mt-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Arraste blocos da lateral esquerda para cá</div>}
            </article>
          </div>
        </div>
      </section>
      {rightOpen && !preview && <aside className="w-72 shrink-0 overflow-y-auto border-l p-4 max-lg:hidden">
        <div className="mb-3 flex items-center justify-between"><strong className="text-sm">Propriedades</strong><Button variant="ghost" size="icon" className="h-7 w-7" title="Recolher" onClick={() => setRightOpen(false)}><ChevronRight size={15} /></Button></div>
        <div className="mb-4 flex gap-1">{(['Bloco', 'Comentários', 'Documento'] as const).map(t => <Button key={t} size="sm" variant={rightTab === t ? 'secondary' : 'ghost'} className="h-7" onClick={() => setRightTab(t)}>{t}{t === 'Comentários' && ` ${comments.length}`}</Button>)}</div>
        {rightTab === 'Comentários' ? <div className="space-y-2 text-sm">{comments.map((m, i) => <p key={i} className="rounded-md bg-secondary p-2">{m}</p>)}<form onSubmit={e => { e.preventDefault(); if (comment.trim()) { setComments([...comments, `Marina: ${comment.trim()}`]); setComment(''); } }}><textarea className="w-full rounded-md border bg-background p-2" rows={3} placeholder="Adicionar comentário" value={comment} onChange={e => setComment(e.target.value)} /><Button size="sm" type="submit" className="w-full">Comentar</Button></form></div>
        : rightTab === 'Documento' ? <div className="space-y-4 text-sm">
            <div><strong className="mb-3 block">Margens do documento</strong><p className="mb-3 text-[11px] text-muted-foreground">Arraste as guias no documento ou ajuste com os controles deslizantes.</p></div>
            <MarginSlider label="Margem superior" value={margins.top} onChange={v => setMargins(m => ({ ...m, top: v }))} />
            <MarginSlider label="Margem inferior" value={margins.bottom} onChange={v => setMargins(m => ({ ...m, bottom: v }))} />
            <MarginSlider label="Margem esquerda" value={margins.left} onChange={v => setMargins(m => ({ ...m, left: v }))} />
            <MarginSlider label="Margem direita" value={margins.right} onChange={v => setMargins(m => ({ ...m, right: v }))} />
            <Button variant="outline" size="sm" className="w-full" onClick={() => setMargins({ top: 40, bottom: 40, left: 64, right: 64 })}>Restaurar margens padrão</Button>
          </div>
        : !sel ? <p className="text-sm text-muted-foreground">Selecione um bloco no documento para editar suas propriedades.</p>
        : <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between"><strong>{sel.label}</strong><small className="text-muted-foreground">{labelOf(sel.type)}</small></div>
            <label className="flex items-center justify-between">Mostrar no documento<Switch checked={sel.visible} onCheckedChange={v => update(sel.id, { visible: v })} /></label>
            <label className="block">Nome do bloco<input className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={sel.label} onChange={e => update(sel.id, { label: e.target.value })} /></label>
            <div><p className="mb-1">Alinhamento</p><div className="flex gap-1">{alignOptions.map(([v, I]) => <Button key={v} size="icon" variant={sel.align === v ? 'secondary' : 'outline'} className="h-8 w-8" title={v} onClick={() => update(sel.id, { align: v as Block['align'] })}><I size={14} /></Button>)}</div></div>
            <label className="block">Espaçamento inferior<select className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={sel.spacing} onChange={e => update(sel.id, { spacing: e.target.value as Block['spacing'] })}><option value="compact">Compacto</option><option value="normal">Normal</option><option value="wide">Amplo</option></select></label>
            <label className="flex items-center justify-between">Cor de destaque<input type="color" value={sel.accent} onChange={e => update(sel.id, { accent: e.target.value })} /></label>
            {sel.type === 'header' && <div className="border-t pt-3">
              <strong className="mb-2 block text-xs">Imagem do cabeçalho</strong>
              {sel.headerImg
                ? <div className="flex items-center gap-2"><img src={sel.headerImg} alt="Preview" className="h-12 rounded border" /><Button variant="outline" size="sm" onClick={() => update(sel.id, { headerImg: undefined })}>Remover</Button></div>
                : <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground"><ImageIcon size={14} />Enviar imagem de logo<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('headerImg', sel.id, e)} /></label>}
            </div>}
            {sel.type === 'footer' && <div className="border-t pt-3">
              <strong className="mb-2 block text-xs">Imagem do rodapé</strong>
              {sel.footerImg
                ? <div className="flex items-center gap-2"><img src={sel.footerImg} alt="Preview" className="h-12 rounded border" /><Button variant="outline" size="sm" onClick={() => update(sel.id, { footerImg: undefined })}>Remover</Button></div>
                : <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground"><ImageIcon size={14} />Enviar imagem para o rodapé<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload('footerImg', sel.id, e)} /></label>}
            </div>}
            {sel.type === 'financial' && <div className="border-t pt-3">
              <label className="flex items-center justify-between">Mostrar desconto (%)<Switch checked={sel.showDiscount !== false} onCheckedChange={v => update(sel.id, { showDiscount: v })} /></label>
              <p className="mt-1 text-[11px] text-muted-foreground">Desmarque para ocultar o campo de desconto do resumo financeiro.</p>
            </div>}
            {sel.type === 'terms' && <div className="border-t pt-3">
              <strong className="mb-2 block text-xs">Tipo de cada condição</strong>
              <p className="mb-2 text-[11px] text-muted-foreground">Alterne entre as opções predefinidas e texto personalizado.</p>
              {(Object.keys(termLabels) as (keyof Terms)[]).map(k => <label key={k} className="mb-2 flex items-center justify-between rounded-md border p-2 text-xs"><span>{termLabels[k]}</span><Switch checked={sel.useCustomTerms?.[k] === true} onCheckedChange={v => update(sel.id, { useCustomTerms: { ...sel.useCustomTerms, [k]: v } })} /></label>)}
            </div>}
            {sel.type === 'client' && <label className="block">Cliente vinculado<select className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={client} onChange={e => selectClient(e.target.value)}>{clients.map(x => <option key={x.client}>{x.client}</option>)}</select></label>}
            {sel.type === 'client' && <label className="block">Responsável<select className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={owner} onChange={e => setOwner(e.target.value)}><option>Marina</option><option>Lucas</option><option>Pedro</option></select></label>}
            {sel.type === 'client' && <label className="block">Projeto<input className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={project} onChange={e => setProject(e.target.value)} /></label>}
            {sel.type === 'client' && <label className="block">Próximo follow-up<input type="date" className="mt-1 w-full rounded-md border bg-background px-2 py-1.5" value={followup} onChange={e => setFollowup(e.target.value)} /></label>}
            <p className="text-xs text-muted-foreground">{['client', 'products', 'services', 'financial', 'terms'].includes(sel.type) ? 'Bloco vinculado ao cadastro: os dados se atualizam automaticamente. Use as opções acima para personalizar a exibição.' : 'Conteúdo editável independente, sem vínculo com cadastro.'}</p>
          </div>}
      </aside>}
    </div>
  </div>;
}
