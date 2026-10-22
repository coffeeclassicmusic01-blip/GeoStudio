import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileSignature,
  FileText,
  Filter,
  Hash,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Italic,
  Layers,
  List,
  ListOrdered,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  PanelBottom,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelTop,
  Phone,
  Pilcrow,
  Plus,
  Printer,
  Redo2,
  Save,
  ScrollText,
  Search,
  SeparatorHorizontal,
  Sparkles,
  Strikethrough,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { clientFiscal } from '@/features/invoices/data';
import {
  builderTotal,
  defaultCatalog,
  money,
  moneyFull,
  pickColor,
  quoteItems,
  termLabels,
  termOptions,
  type Client,
  type Partner,
  type Quote,
  type QuoteItem,
  type Terms,
} from './data';
import {
  company,
  formatAddress,
  georevestCatalog,
  georevestTerms,
  letterTermLabels,
  letterTermOrder,
  longDate,
  templateHtml,
  titleLines,
} from './georevest';

export type BlockType =
  | 'header'
  | 'logo'
  | 'title'
  | 'number'
  | 'opening'
  | 'client'
  | 'products'
  | 'services'
  | 'financial'
  | 'terms'
  | 'text'
  | 'image'
  | 'signature'
  | 'footer'
  | 'pagebreak';

export type Block = {
  id: string;
  type: BlockType;
  label: string;
  visible: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  accent: string;
  spacing: 'compact' | 'normal' | 'wide';
  html?: string;
  img?: string;
  headerHtml?: string;
  headerImg?: string;
  footerHtml?: string;
  footerImg?: string;
  showDiscount?: boolean;
  customTerms?: Partial<Record<keyof Terms, string>>;
  useCustomTerms?: Partial<Record<keyof Terms, boolean>>;
  signatureHtml?: string;
  layout?: 'table' | 'cards' | 'letter' | 'accept';
};

type Letterhead = {
  enabled: boolean;
  img: string;
  footer: string;
  city: string;
  pageNumbers: boolean;
};

const PAGE_W = 794;
const PAGE_H = 1123;
const defaultMargins = { top: 28, bottom: 24, left: 76, right: 76 };

type Drag =
  | { kind: 'block'; type: BlockType }
  | { kind: 'move'; id: string }
  | { kind: 'item'; item: QuoteItem; service?: boolean };

const palette: { group: string; items: { type: BlockType; label: string; hint: string; icon: typeof Type }[] }[] = [
  {
    group: 'Identificação',
    items: [
      { type: 'opening', label: 'Abertura da proposta', hint: 'Data, destinatário, nº e endereço da obra', icon: Mail },
      { type: 'header', label: 'Cabeçalho personalizado', hint: 'Logo, cores e dados — com imagem', icon: PanelTop },
      { type: 'logo', label: 'Logotipo da empresa', hint: 'Marca e dados institucionais', icon: Building2 },
      { type: 'title', label: 'Título da proposta', hint: 'Título, subtítulo e escopo', icon: Type },
      { type: 'number', label: 'Número e validade', hint: 'Referência, data e vencimento', icon: Hash },
    ],
  },
  {
    group: 'Dados Vinculados',
    items: [
      { type: 'client', label: 'Dados do cliente', hint: 'Razão social, contato e responsável', icon: User },
      { type: 'products', label: 'Tabela de produtos', hint: 'Itens, quantidades e valores da manta', icon: Table2 },
      { type: 'services', label: 'Tabela de serviços', hint: 'Escopo de instalação e execução', icon: Wrench },
    ],
  },
  {
    group: 'Comercial & Conteúdo',
    items: [
      { type: 'financial', label: 'Resumo financeiro', hint: 'Subtotal, desconto e valor global', icon: DollarSign },
      { type: 'terms', label: 'Condições comerciais', hint: 'Pagamento, prazo, garantia e validade', icon: ScrollText },
      { type: 'text', label: 'Texto livre', hint: 'Parágrafos, listas e formatação rica', icon: Pilcrow },
      { type: 'image', label: 'Imagem / Esquema', hint: 'Fotos da obra, esquema ou logotipo', icon: ImageIcon },
      { type: 'signature', label: 'Assinatura e aceite', hint: 'Responsáveis, contato e aprovação', icon: FileSignature },
      { type: 'footer', label: 'Rodapé personalizado', hint: 'Texto e contatos no fim da página', icon: PanelBottom },
      { type: 'pagebreak', label: 'Quebra de página', hint: 'Inicia uma nova folha A4 no documento', icon: SeparatorHorizontal },
    ],
  },
];

const labelOf = (t: BlockType) => palette.flatMap(g => g.items).find(i => i.type === t)?.label ?? t;
let seq = 0;
const uid = () => `b${++seq}_${Date.now().toString(36)}`;
const mk = (type: BlockType, extra: Partial<Block> = {}): Block => ({
  id: uid(),
  type,
  label: labelOf(type),
  visible: true,
  align: 'left',
  accent: '#0f4c46',
  spacing: 'normal',
  showDiscount: true,
  ...extra,
});
const gap = { compact: 'mb-3', normal: 'mb-6', wide: 'mb-14' };

function Editable({
  html,
  onChange,
  className,
  placeholder,
  readOnly,
}: {
  html: string;
  onChange: (h: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => onChange(e.currentTarget.innerHTML)}
      className={`outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] ${
        className ?? ''
      }`}
    />
  );
}

type MarginKey = 'top' | 'bottom' | 'left' | 'right';

export function QuoteBuilder({
  quotes,
  partners,
  clientRecords = [],
  nextId,
  editQuote,
  isRevision,
  onCreate,
  onUpdate,
  onClose,
  notify,
}: {
  quotes: Quote[];
  partners: Partner[];
  clientRecords?: Client[];
  nextId: string;
  editQuote?: Quote | null;
  isRevision?: boolean;
  onCreate: (q: Quote) => void;
  onUpdate: (q: Quote) => void;
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const clients = useMemo(() => Array.from(new Map(quotes.map(q => [q.client, q])).values()), [quotes]);
  const isEditing = !!editQuote;
  const existingItems = editQuote?.items?.length
    ? editQuote.items
    : quoteItems(editQuote ?? ({ value: 0, project: '' } as Quote));

  const [client, setClient] = useState(editQuote?.client ?? clients[0]?.client ?? '');
  const c = clients.find(x => x.client === client);

  const registeredAddress = (name: string) =>
    formatAddress({ ...clientFiscal[name], ...clientRecords.find(r => r.name === name)?.fiscal });

  const [siteAddress, setSiteAddress] = useState(
    editQuote?.siteAddress ?? registeredAddress(editQuote?.client ?? clients[0]?.client ?? '')
  );
  const [project, setProject] = useState(editQuote?.project ?? c?.project ?? 'Nova proposta comercial');
  const [owner, setOwner] = useState(editQuote?.owner ?? c?.owner ?? 'Marina');
  const [followup, setFollowup] = useState(editQuote?.followup ?? '2026-10-13');
  const [items, setItems] = useState<QuoteItem[]>(isEditing ? existingItems : [{ ...georevestCatalog[0]! }]);
  const [services, setServices] = useState<QuoteItem[]>([]);
  const [terms, setTerms] = useState<Terms>(editQuote?.terms ?? georevestTerms);
  const [discount, setDiscount] = useState(editQuote?.discount ?? 0);
  const [selectedPartners, setSelectedPartners] = useState<string[]>(editQuote?.partnerIds ?? []);

  const [blocks, setBlocks] = useState<Block[]>(() => [
    mk('opening', { label: 'Abertura da proposta', spacing: 'wide' }),
    mk('text', { label: 'Contato Georevest', html: templateHtml.contacts }),
    mk('pagebreak'),
    mk('text', { label: 'Título — Clientes atendidos', html: templateHtml.clientsTitle, align: 'center', spacing: 'compact' }),
    mk('image', { label: 'Clientes atendidos', img: company.clientsShowcase, align: 'center' }),
    mk('pagebreak'),
    mk('text', { label: 'Título — Proposta técnica', html: templateHtml.technicalTitle, align: 'center', spacing: 'compact' }),
    mk('text', { label: 'Proposta técnica', html: templateHtml.technical, align: 'justify' }),
    mk('pagebreak'),
    mk('text', { label: 'Obrigações', html: templateHtml.obligations, align: 'justify' }),
    mk('pagebreak'),
    mk('text', { label: 'Título — Proposta comercial', html: templateHtml.commercialTitle, align: 'center', spacing: 'compact' }),
    mk('products', { label: 'Proposta comercial', layout: 'cards', html: templateHtml.commercialIntro }),
    mk('pagebreak'),
    mk('terms', { label: 'Condições comerciais', layout: 'letter', spacing: 'wide' }),
    mk('text', { label: 'Referências bancárias', html: templateHtml.bank, spacing: 'wide' }),
    mk('signature', { label: 'Assinatura', layout: 'letter', signatureHtml: templateHtml.signLeft, html: templateHtml.signRight }),
  ]);

  const [selected, setSelected] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [tab, setTab] = useState<'Blocos' | 'Produtos' | 'Clientes' | 'Parceiros'>('Blocos');
  const [q, setQ] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'georevest' | 'services'>('all');
  const [rightTab, setRightTab] = useState<'Bloco' | 'Documento' | 'Comentários'>('Bloco');
  const [comments, setComments] = useState<string[]>(['Marina: revisar prazo de entrega antes de enviar.']);
  const [comment, setComment] = useState('');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [margins, setMargins] = useState(defaultMargins);
  const [letter, setLetter] = useState<Letterhead>({
    enabled: true,
    img: company.letterhead,
    footer: company.footer.join('\n'),
    city: company.city,
    pageNumbers: true,
  });
  const pageRefs = useRef<(HTMLElement | null)[]>([]);
  const [overflowPages, setOverflowPages] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activePage, setActivePage] = useState(0);

  // Dialogs
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogTarget, setCatalogTarget] = useState<'products' | 'services'>('products');
  const [catalogModalSearch, setCatalogModalSearch] = useState('');

  const all = [...items, ...services];
  const subtotal = builderTotal(all, 0);
  const total = builderTotal(all, discount);
  const sel = blocks.find(b => b.id === selected);
  const quoteId = editQuote?.id ?? nextId;
  const quoteDate = editQuote?.date ?? '2026-10-10';

  const update = (id: string, p: Partial<Block>) => {
    setBlocks(bs => bs.map(b => (b.id === id ? { ...b, ...p } : b)));
    setDirty(true);
  };

  function selectClient(name: string) {
    setClient(name);
    setSiteAddress(registeredAddress(name));
    const found = clients.find(x => x.client === name);
    if (found) {
      setOwner(found.owner);
      if (!isEditing) setProject(found.project);
    }
  }

  function insert(type: BlockType, at = blocks.length) {
    const b = mk(
      type,
      type === 'text'
        ? { html: '<p>Escreva seu conteúdo aqui…</p>' }
        : type === 'footer'
        ? { footerHtml: '<p>Georevest · Contato da proposta</p>' }
        : {}
    );
    setBlocks(bs => [...bs.slice(0, at), b, ...bs.slice(at)]);
    setSelected(b.id);
    setRightTab('Bloco');
    setDirty(true);
    notify(`Bloco "${b.label}" inserido na proposta.`);
  }

  function move(id: string, to: number) {
    setBlocks(bs => {
      const from = bs.findIndex(b => b.id === id);
      if (from < 0) return bs;
      const b = bs[from]!;
      const rest = bs.filter(x => x.id !== id);
      const idx = to > from ? to - 1 : to;
      const clamped = Math.max(0, Math.min(rest.length, idx));
      return [...rest.slice(0, clamped), b, ...rest.slice(clamped)];
    });
    setDirty(true);
  }

  function duplicateBlock(b: Block) {
    const idx = blocks.findIndex(x => x.id === b.id);
    const copy: Block = { ...b, id: uid(), label: `${b.label} (cópia)` };
    setBlocks(bs => [...bs.slice(0, idx + 1), copy, ...bs.slice(idx + 1)]);
    setSelected(copy.id);
    setDirty(true);
    notify(`Bloco "${b.label}" duplicado.`);
  }

  function addItem(it: QuoteItem, service: boolean) {
    (service ? setServices : setItems)(list => {
      const i = list.findIndex(x => x.description === it.description);
      return i >= 0
        ? list.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x))
        : [...list, { ...it }];
    });
    setDirty(true);
    notify(`Item "${titleLines(it.description)[0] || it.description}" adicionado.`);
  }

  const start = (d: Drag) => (e: DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(d));
    e.stopPropagation();
  };

  const read = (e: DragEvent): Drag | null => {
    try {
      return JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return null;
    }
  };

  function onDocDrop(e: DragEvent) {
    e.preventDefault();
    const d = read(e);
    const at = dropAt ?? blocks.length;
    setDropAt(null);
    if (!d) return;
    if (d.kind === 'block') insert(d.type, at);
    else if (d.kind === 'move') move(d.id, at);
    else {
      const target = d.service ? 'services' : 'products';
      if (!blocks.some(b => b.type === target)) insert(target, at);
      addItem(d.item, !!d.service);
    }
  }

  const fmt = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

  function startMarginDrag(key: MarginKey, e: React.PointerEvent) {
    e.stopPropagation();
    const startCoord = key === 'top' || key === 'bottom' ? e.clientY : e.clientX;
    const startVal = margins[key];
    const invert = key === 'bottom' || key === 'right';
    const onMove = (ev: PointerEvent) => {
      const raw = invert
        ? startCoord - (key === 'bottom' ? ev.clientY : ev.clientX)
        : (key === 'top' ? ev.clientY : ev.clientX) - startCoord;
      const clamped = Math.max(10, Math.min(120, startVal + raw));
      setMargins(m => ({ ...m, [key]: clamped }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleImageUpload(
    field: 'img' | 'headerImg' | 'footerImg',
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const f = e.target.files?.[0];
    if (f) update(blockId, { [field]: URL.createObjectURL(f) });
  }

  function readImage(e: React.ChangeEvent<HTMLInputElement>, done: (url: string) => void) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => done(String(r.result));
    r.readAsDataURL(f);
  }

  function build(): Quote | null {
    if (!client || !all.length) {
      notify('Escolha um cliente e adicione ao menos um item à proposta.');
      return null;
    }
    return {
      id: quoteId,
      client,
      initials: editQuote?.initials ?? client.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase(),
      project,
      value: total,
      status: editQuote?.status ?? 'Em elaboração',
      owner,
      date: quoteDate,
      followup,
      contact: c?.contact ?? editQuote?.contact ?? '',
      email: c?.email ?? editQuote?.email ?? '',
      phone: c?.phone ?? editQuote?.phone ?? '',
      notes: editQuote?.notes ?? ['10 out · Orçamento criado no editor.'],
      color: editQuote?.color ?? pickColor(quotes.length),
      items: all,
      terms,
      discount,
      partnerIds: selectedPartners.length ? selectedPartners : undefined,
      siteAddress: siteAddress.trim() || undefined,
    };
  }

  const save = () => {
    const qq = build();
    if (!qq) return;
    setDirty(false);
    if (isEditing) {
      onUpdate(qq);
      notify(isRevision ? 'Revisão salva com sucesso.' : 'Orçamento atualizado com sucesso.');
    } else {
      onCreate(qq);
    }
  };

  function handleAttemptClose() {
    if (dirty) {
      setConfirmExitOpen(true);
    } else {
      onClose();
    }
  }

  async function pdf() {
    const qq = build();
    if (!qq || exporting) return;
    const was = { preview, zoom };
    setExporting(true);
    setSelected(null);
    setPreview(true);
    setZoom(100);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80))));
    try {
      const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const els = pageRefs.current.filter((el): el is HTMLElement => !!el);
      for (const [n, el] of els.entries()) {
        const w = el.offsetWidth,
          h = el.offsetHeight;
        const url = await toJpeg(el, {
          pixelRatio: 2,
          quality: 0.92,
          width: w,
          height: h,
          backgroundColor: getComputedStyle(el).backgroundColor,
          skipFonts: true,
        });
        if (n) doc.addPage();
        const scale = Math.min(1, (297 * w) / (210 * h));
        const iw = 210 * scale,
          ih = ((210 * h) / w) * scale;
        doc.addImage(url, 'JPEG', (210 - iw) / 2, 0, iw, ih);
      }
      doc.save(`${qq.id}-${qq.client.replace(/\W+/g, '-')}.pdf`);
      notify(`PDF da proposta gerado (${els.length} ${els.length === 1 ? 'página' : 'páginas'}).`);
    } catch {
      notify('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setPreview(was.preview);
      setZoom(was.zoom);
      setExporting(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        void pdf();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape' && !preview) {
        if (selected) setSelected(null);
        else handleAttemptClose();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const over = pageRefs.current
      .map((el, i) => (el && el.offsetHeight > (el.offsetWidth * PAGE_H) / PAGE_W + 2 ? i : -1))
      .filter(i => i >= 0);
    setOverflowPages(prev => (prev.join() === over.join() ? prev : over));
  });

  const visibleBlocks = blocks.filter(b => !preview || b.visible);
  const allPages: { b: Block; i: number }[][] = [[]];
  visibleBlocks.forEach((b, i) => {
    allPages[allPages.length - 1]!.push({ b, i });
    if (b.type === 'pagebreak') allPages.push([]);
  });
  const pages = preview ? allPages.filter((pg, n) => n === 0 || pg.some(x => x.b.type !== 'pagebreak')) : allPages;
  pageRefs.current.length = pages.length;

  function scrollToPage(p: number) {
    setActivePage(p);
    pageRefs.current[p]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getPageLabel(pg: { b: Block; i: number }[], idx: number) {
    const firstNonPb = pg.find(x => x.b.type !== 'pagebreak');
    if (!firstNonPb) return `Folha ${idx + 1}`;
    if (firstNonPb.b.type === 'opening') return 'Abertura';
    if (firstNonPb.b.type === 'products') return 'Comercial';
    if (firstNonPb.b.type === 'terms') return 'Condições';
    if (firstNonPb.b.type === 'signature') return 'Assinatura';
    if (firstNonPb.b.label.includes('Clientes')) return 'Clientes';
    if (firstNonPb.b.label.includes('Técnica')) return 'Técnica';
    if (firstNonPb.b.label.includes('Obrigações')) return 'Obrigações';
    return firstNonPb.b.label.slice(0, 14);
  }

  function table(list: QuoteItem[], set: (l: QuoteItem[]) => void, title: string, service: boolean, accent: string) {
    return (
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const d = read(e);
          if (d?.kind === 'item') {
            e.preventDefault();
            e.stopPropagation();
            setDropAt(null);
            addItem(d.item, service);
          }
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold tracking-widest" style={{ color: accent }}>
              {title.toUpperCase()}
            </h4>
            <span className="text-[11px] text-muted-foreground">{list.length} item(ns) na proposta</span>
          </div>
          {!preview && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setCatalogTarget(service ? 'services' : 'products');
                  setCatalogModalOpen(true);
                }}
              >
                <Plus size={13} />
                Catálogo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  set([
                    ...list,
                    {
                      description: service ? 'Novo serviço especializado' : 'Novo produto / revestimento',
                      qty: 1,
                      unit: 1000,
                    },
                  ]);
                  setDirty(true);
                }}
              >
                + Avulso
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-left text-[11px] text-muted-foreground">
                <th className="p-2">DESCRIÇÃO</th>
                <th className="w-16 p-2">QTD.</th>
                <th className="w-28 p-2">UNITÁRIO</th>
                <th className="w-28 p-2 text-right">TOTAL</th>
                {!preview && <th className="w-16 p-2 text-center">AÇÕES</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((it, i) => (
                <tr key={i} className="border-t hover:bg-muted/50">
                  <td className="p-2">
                    <input
                      aria-label="Descrição"
                      readOnly={preview}
                      className="w-full bg-transparent font-medium outline-none"
                      value={it.description}
                      onChange={e =>
                        set(list.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label="Quantidade"
                      readOnly={preview}
                      type="number"
                      min={1}
                      className="w-14 rounded border bg-background px-1 text-center"
                      value={it.qty}
                      onChange={e =>
                        set(list.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x)))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label="Valor unitário"
                      readOnly={preview}
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-24 rounded border bg-background px-1 text-right font-medium"
                      value={it.unit}
                      onChange={e =>
                        set(list.map((x, j) => (j === i ? { ...x, unit: Math.max(0, Number(e.target.value)) } : x)))
                      }
                    />
                  </td>
                  <td className="p-2 text-right font-semibold">{money(it.qty * it.unit)}</td>
                  {!preview && (
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Remover"
                          onClick={() => set(list.filter((_, j) => j !== i))}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function cards(b: Block, list: QuoteItem[], set: (l: QuoteItem[]) => void, service: boolean) {
    const patch = (i: number, p: Partial<QuoteItem>) => {
      set(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
      setDirty(true);
    };
    const moveItem = (from: number, to: number) => {
      if (to < 0 || to >= list.length) return;
      const target = list[from]!;
      const rest = list.filter((_, idx) => idx !== from);
      set([...rest.slice(0, to), target, ...rest.slice(to)]);
      setDirty(true);
    };
    const field =
      'w-full rounded border border-dashed border-border bg-transparent px-2 py-0.5 transition-colors focus:border-primary focus:bg-background';

    return (
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const d = read(e);
          if (d?.kind === 'item') {
            e.preventDefault();
            e.stopPropagation();
            setDropAt(null);
            addItem(d.item, service);
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <p className="font-bold">Número da proposta: {quoteId}</p>
          {!preview && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  setCatalogTarget(service ? 'services' : 'products');
                  setCatalogModalOpen(true);
                }}
              >
                <Plus size={13} />
                Do Catálogo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  set([
                    ...list,
                    {
                      description: 'Blocos de 12 Andares · Novo Reservatório',
                      details: 'Área de Manta Engenheirada ATO 800: 30,00 m²',
                      note: '(Valor por reservatório)',
                      qty: 1,
                      unit: 20000,
                      measure: 'UN',
                    },
                  ]);
                  setDirty(true);
                }}
              >
                + Novo Item
              </Button>
            </div>
          )}
        </div>

        <Editable
          html={b.html ?? ''}
          readOnly={preview}
          onChange={h => update(b.id, { html: h })}
          className="mt-3 text-sm text-muted-foreground"
          placeholder="Descrição geral ou observações sobre a proposta comercial (opcional)"
        />

        <div className="mt-4 space-y-4">
          {list.map((it, i) => (
            <div
              key={i}
              className={`group relative grid grid-cols-[minmax(0,44%)_1fr] items-center gap-5 rounded-lg py-3 text-left transition-colors ${
                i < list.length - 1 ? 'border-b border-foreground/30' : ''
              } ${!preview ? 'hover:bg-accent/30' : ''}`}
            >
              <div className="flex flex-col items-center justify-center">
                {it.image ? (
                  <div className="relative">
                    <img
                      src={it.image}
                      alt={titleLines(it.description).join(' ')}
                      className="max-h-36 max-w-full rounded object-contain shadow-sm"
                    />
                    {!preview && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute right-1 top-1 h-6 px-2 text-[10px] shadow"
                        onClick={() => patch(i, { image: undefined })}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ) : preview ? null : (
                  <label className="grid h-28 w-full cursor-pointer place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <span className="text-center">
                      <ImageIcon className="mx-auto mb-1 text-muted-foreground" size={20} />
                      Adicionar imagem
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => readImage(e, url => patch(i, { image: url }))}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-1">
                {!preview && (
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">Item {i + 1}</span>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title="Subir item"
                        disabled={i === 0}
                        onClick={() => moveItem(i, i - 1)}
                      >
                        <ArrowUp size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title="Descer item"
                        disabled={i === list.length - 1}
                        onClick={() => moveItem(i, i + 1)}
                      >
                        <ArrowDown size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        title="Remover item"
                        onClick={() => set(list.filter((_, j) => j !== i))}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                )}

                {preview ? (
                  titleLines(it.description).map((l, k) => (
                    <p key={k} className="mb-0 font-medium">
                      {l}
                    </p>
                  ))
                ) : (
                  <input
                    aria-label="Descrição do item"
                    title="Separe partes com ' · ' para criar linhas elegantes"
                    className={`${field} font-semibold`}
                    value={it.description}
                    onChange={e => patch(i, { description: e.target.value })}
                  />
                )}

                {preview ? (
                  it.details && <p className="mb-0 pt-2 text-xs">{it.details}</p>
                ) : (
                  <input
                    aria-label="Detalhes do item"
                    placeholder="Área ou especificações técnicas (ex.: Área de Manta: 34,77 m²)"
                    className={`${field} text-xs`}
                    value={it.details ?? ''}
                    onChange={e => patch(i, { details: e.target.value || undefined })}
                  />
                )}

                <div className="pt-1">
                  <p className="mb-0 font-bold">
                    {preview ? (
                      `Valor: ${moneyFull(it.unit)}.`
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-normal text-muted-foreground">Valor unitário: R$</span>
                        <input
                          aria-label="Valor unitário"
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${field} inline w-36 font-bold`}
                          value={it.unit}
                          onChange={e => patch(i, { unit: Math.max(0, Number(e.target.value)) })}
                        />
                      </span>
                    )}
                  </p>
                </div>

                {preview ? (
                  it.qty !== 1 && (
                    <p className="mb-0 text-xs text-muted-foreground">
                      Quantidade: {it.qty}
                      {it.measure ? ` ${it.measure}` : ''} · Total: {moneyFull(it.qty * it.unit)}
                    </p>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span>Qtd:</span>
                    <input
                      aria-label="Quantidade"
                      type="number"
                      min={1}
                      className="w-16 rounded border bg-background px-1 py-0.5 text-center font-medium"
                      value={it.qty}
                      onChange={e => patch(i, { qty: Math.max(1, Number(e.target.value)) })}
                    />
                    <input
                      aria-label="Unidade"
                      placeholder="UN"
                      className="w-14 rounded border bg-background px-1 py-0.5 text-center"
                      value={it.measure ?? 'UN'}
                      onChange={e => patch(i, { measure: e.target.value })}
                    />
                    <span className="font-semibold text-foreground">Subtotal: {moneyFull(it.qty * it.unit)}</span>
                  </div>
                )}

                {preview ? (
                  it.note && <p className="mb-0 pt-1 text-[11px] text-muted-foreground italic">{it.note}</p>
                ) : (
                  <input
                    aria-label="Observação do item"
                    placeholder="Observação complementar (ex.: Valor por reservatório)"
                    className={`${field} text-[11px] italic`}
                    value={it.note ?? ''}
                    onChange={e => patch(i, { note: e.target.value || undefined })}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function render(b: Block): ReactNode {
    const A = b.accent;
    const head = (t: string, r?: string) => (
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-xs font-bold tracking-widest" style={{ color: A }}>
          {t}
        </h4>
        {r && <small className="text-[11px] text-muted-foreground">{r}</small>}
      </div>
    );

    switch (b.type) {
      case 'header':
        return (
          <div className="flex items-start justify-between gap-4 border-b pb-5" style={{ borderColor: A }}>
            <div className="flex items-start gap-3">
              {b.headerImg ? (
                <img src={b.headerImg} alt="Logo" className="max-h-16 max-w-48 rounded-md object-contain" />
              ) : (
                <span
                  className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-primary-foreground shadow-sm"
                  style={{ background: A }}
                >
                  G
                </span>
              )}
              {preview ? (
                <div
                  className="text-sm [&_p]:text-xs [&_p]:text-muted-foreground [&_strong]:text-base [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{ __html: b.headerHtml ?? '' }}
                />
              ) : (
                <Editable
                  html={b.headerHtml ?? ''}
                  onChange={h => update(b.id, { headerHtml: h })}
                  className="text-sm [&_p]:text-xs [&_p]:text-muted-foreground [&_strong]:text-base [&_strong]:font-bold"
                  placeholder="Nome da empresa e contatos"
                />
              )}
            </div>
            <div className="text-right">
              <small className="text-[11px] font-bold tracking-widest text-muted-foreground">ORÇAMENTO COMERCIAL</small>
              <div className="text-xl font-bold" style={{ color: A }}>
                {quoteId}
              </div>
              <small className="text-xs text-muted-foreground">10 out 2026 · Versão 01</small>
            </div>
          </div>
        );

      case 'logo':
        return (
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div className="flex gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-primary-foreground shadow-sm"
                style={{ background: A }}
              >
                G
              </span>
              <div>
                <strong>{company.name}</strong>
                <p className="text-xs text-muted-foreground">{company.footer.join(' · ')}</p>
              </div>
            </div>
            <div className="text-right">
              <small className="text-[11px] tracking-widest text-muted-foreground">ORÇAMENTO COMERCIAL</small>
              <div className="text-xl font-bold" style={{ color: A }}>
                {quoteId}
              </div>
              <small className="text-xs text-muted-foreground">10 out 2026 · Versão 01</small>
            </div>
          </div>
        );

      case 'title':
        return (
          <div>
            <small className="text-[11px] font-bold tracking-widest" style={{ color: A }}>
              PROPOSTA COMERCIAL
            </small>
            <Editable
              html={b.html ?? ''}
              onChange={h => update(b.id, { html: h })}
              className="[&_h2]:text-2xl [&_h2]:font-bold [&_p]:text-sm [&_p]:text-muted-foreground"
              placeholder="Título da proposta e escopo"
            />
          </div>
        );

      case 'number':
        return (
          <div className="grid grid-cols-3 gap-3 rounded-md bg-secondary/30 p-3 text-sm">
            {[
              ['Número da proposta', quoteId],
              ['Data de emissão', '10 out 2026'],
              ['Validade', terms.validity],
            ].map(([k, v]) => (
              <div key={k}>
                <small className="text-xs text-muted-foreground">{k}</small>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>
        );

      case 'opening':
        return (
          <div className="text-left">
            <p className="mb-4 text-right">
              {letter.city}, {longDate(quoteDate)}
            </p>
            <p className="font-bold">Ao {client || '—'}</p>
            <p className="font-bold">N° DA PROPOSTA: {quoteId}</p>
            <p>Contato: {c?.contact ?? editQuote?.contact ?? '—'}</p>
            <p>Telefone: {c?.phone ?? editQuote?.phone ?? '—'}</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">Endereço da obra:</span>
              {preview ? (
                <span>{siteAddress || '—'}</span>
              ) : (
                <input
                  aria-label="Endereço da obra"
                  className="min-w-0 flex-1 rounded border border-dashed border-border bg-transparent px-2 py-0.5 text-sm transition-colors focus:border-primary focus:bg-background"
                  placeholder="Endereço completo da obra..."
                  value={siteAddress}
                  onChange={e => {
                    setSiteAddress(e.target.value);
                    setDirty(true);
                  }}
                />
              )}
            </p>
          </div>
        );

      case 'pagebreak':
        return preview ? null : (
          <div className="my-2 flex items-center gap-3 text-[11px] font-bold tracking-widest text-muted-foreground">
            <span className="flex-1 border-t border-dashed border-primary/40" />
            <span className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5">
              <SeparatorHorizontal size={13} className="text-primary" />
              QUEBRA DE PÁGINA (A4)
            </span>
            <span className="flex-1 border-t border-dashed border-primary/40" />
          </div>
        );

      case 'client':
        return (
          <div>
            {head('DADOS DO CLIENTE', 'VINCULADO AO CADASTRO')}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-secondary/20 p-3 text-sm">
              {[
                ['Razão social', client],
                ['Projeto', project],
                ['Contato', c?.contact ?? editQuote?.contact],
                ['E-mail', c?.email ?? editQuote?.email],
                ['Telefone', c?.phone ?? editQuote?.phone],
                ['Responsável', owner],
              ].map(([k, v]) => (
                <div key={k}>
                  <small className="text-xs text-muted-foreground">{k}</small>
                  <p className="font-medium">{v || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'products':
        return b.layout === 'cards' ? cards(b, items, setItems, false) : table(items, setItems, 'Produtos', false, A);

      case 'services':
        return b.layout === 'cards' ? cards(b, services, setServices, true) : table(services, setServices, 'Serviços', true, A);

      case 'financial':
        return (
          <div>
            {head('RESUMO FINANCEIRO')}
            <div className="ml-auto max-w-sm rounded-lg border bg-secondary/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal dos itens</span>
                <span className="font-medium text-foreground">{money(subtotal)}</span>
              </div>
              {b.showDiscount !== false && (
                <div className="flex items-center justify-between">
                  <span>Desconto aplicado (%)</span>
                  {preview ? (
                    <span className="font-semibold text-rose">{discount}%</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        aria-label="Desconto"
                        type="number"
                        min={0}
                        max={100}
                        className="w-16 rounded border bg-background px-2 py-0.5 text-right font-medium"
                        value={discount}
                        onChange={e => {
                          setDiscount(Math.max(0, Math.min(100, Number(e.target.value))));
                          setDirty(true);
                        }}
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs text-rose">
                  <span>Economia do cliente</span>
                  <span>- {money(subtotal - total)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 text-lg font-bold" style={{ color: A }}>
                <span>Valor Total da Proposta</span>
                <span>{money(total)}</span>
              </div>
            </div>
          </div>
        );

      case 'terms': {
        const value = (k: keyof Terms) =>
          b.useCustomTerms?.[k] === true ? b.customTerms?.[k] ?? '' : terms[k];
        const control = (k: keyof Terms, label: string) =>
          b.useCustomTerms?.[k] === true ? (
            <input
              aria-label={label}
              className="w-full rounded border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
              value={b.customTerms?.[k] ?? ''}
              onChange={e =>
                update(b.id, { customTerms: { ...b.customTerms, [k]: e.target.value } })
              }
              placeholder="Digite o texto personalizado para esta condição..."
            />
          ) : (
            <select
              aria-label={label}
              className="w-full rounded border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
              value={terms[k]}
              onChange={e => {
                setTerms({ ...terms, [k]: e.target.value });
                setDirty(true);
              }}
            >
              {Array.from(new Set([terms[k], ...termOptions[k]])).map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          );

        if (b.layout === 'letter') {
          return (
            <div className="space-y-3">
              {letterTermOrder.map(k => {
                const v = value(k).trim();
                return (
                  <p key={k} className="mb-0">
                    <strong className="text-foreground">{letterTermLabels[k]}:</strong>{' '}
                    {preview ? (
                      /[.!?)]$/.test(v) ? (
                        v
                      ) : (
                        `${v}.`
                      )
                    ) : (
                      <span className="mt-1 block">{control(k, letterTermLabels[k])}</span>
                    )}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <div>
            {head('CONDIÇÕES COMERCIAIS')}
            <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
              {(Object.keys(termLabels) as (keyof Terms)[]).map(k => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-muted-foreground">{termLabels[k]}</dt>
                  <dd>{preview ? value(k) : control(k, termLabels[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      }

      case 'text':
        return (
          <Editable
            html={b.html ?? ''}
            readOnly={preview}
            onChange={h => update(b.id, { html: h })}
            className="[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            placeholder="Escreva seu parágrafo ou lista aqui…"
          />
        );

      case 'image':
        return b.img ? (
          <div className="relative inline-block">
            <img
              src={b.img}
              alt="Imagem do documento"
              className="max-h-[640px] max-w-full rounded-md shadow-sm"
            />
            {!preview && (
              <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded bg-background/90 px-2 py-1 text-xs font-medium shadow backdrop-blur hover:bg-background">
                <ImageIcon size={13} /> Trocar imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleImageUpload('img', b.id, e)}
                />
              </label>
            )}
          </div>
        ) : (
          <label className="grid h-36 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-muted/20 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <span className="text-center">
              <ImageIcon className="mx-auto mb-1 text-muted-foreground" size={24} />
              Clique para selecionar uma imagem ou foto técnica
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleImageUpload('img', b.id, e)}
            />
          </label>
        );

      case 'signature':
        if (b.layout === 'letter') {
          return (
            <div className="mt-20 flex justify-between gap-6 text-left [&_p]:mb-1">
              <Editable
                html={b.signatureHtml ?? ''}
                readOnly={preview}
                onChange={h => update(b.id, { signatureHtml: h })}
                placeholder="Atenciosamente, Nome"
              />
              <Editable
                html={b.html ?? ''}
                readOnly={preview}
                onChange={h => update(b.id, { html: h })}
                className="text-right"
                placeholder="Telefone e e-mail"
              />
            </div>
          );
        }
        return (
          <div>
            {head('ASSINATURA E ACEITE')}
            <div className="mt-12 grid grid-cols-2 gap-10 text-center text-xs text-muted-foreground">
              <div className="border-t pt-2">
                <strong>{c?.contact ?? editQuote?.contact}</strong> · {client}
              </div>
              <div className="border-t pt-2">
                <strong>{owner}</strong> · {company.name}
              </div>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="border-t pt-4" style={{ borderColor: A }}>
            <div className="flex items-center justify-between gap-4">
              {preview ? (
                <div
                  className="text-xs text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: b.footerHtml ?? '' }}
                />
              ) : (
                <Editable
                  html={b.footerHtml ?? ''}
                  onChange={h => update(b.id, { footerHtml: h })}
                  className="text-xs text-muted-foreground [&_p]:text-xs"
                  placeholder="Texto do rodapé institucional"
                />
              )}
              {b.footerImg && (
                <img src={b.footerImg} alt="Logo rodapé" className="max-h-12 max-w-32 rounded object-contain" />
              )}
            </div>
          </div>
        );
    }
  }

  const filteredPalette = palette
    .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) }))
    .filter(g => g.items.length);

  const filteredClients = clients.filter(
    cl =>
      cl.client.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (cl.contact && cl.contact.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const filteredPartnersList = partners.filter(
    pt =>
      pt.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      pt.category.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const docStyle = {
    paddingTop: margins.top,
    paddingBottom: margins.bottom,
    paddingLeft: margins.left,
    paddingRight: margins.right,
  } as React.CSSProperties;

  function MarginSlider({ label: ml, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <label className="block">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span>{ml}</span>
          <span className="font-semibold text-primary">{value}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={120}
          value={value}
          className="w-full accent-primary"
          onChange={e => onChange(Number(e.target.value))}
        />
      </label>
    );
  }

  const alignOptions: [string, typeof AlignLeft][] = [
    ['left', AlignLeft],
    ['center', AlignCenter],
    ['right', AlignRight],
    ['justify', AlignJustify],
  ];

  const isFocusMode = !leftOpen && !rightOpen;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background text-foreground">
      {/* Top Bar Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2 shadow-sm no-print">
        {/* Left: Identity and title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 font-medium"
            onClick={handleAttemptClose}
            title="Voltar para a listagem (Esc)"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Voltar</span>
          </Button>

          <div className="h-5 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground shadow">
              G
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Nome do projeto"
                  className="font-bold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors max-w-[260px] truncate"
                  value={project}
                  onChange={e => {
                    setProject(e.target.value);
                    setDirty(true);
                  }}
                  title="Clique para editar o nome do projeto"
                />
                <Badge variant={isRevision ? 'secondary' : 'default'} className="text-[10px]">
                  {isRevision ? `R${editQuote?.revisionNumber ?? 2}` : isEditing ? 'Edição' : 'Novo'}
                </Badge>
                {dirty ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber">
                    <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
                    <span className="hidden md:inline">Não salvo</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-green">
                    <Check size={13} />
                    <span className="hidden md:inline">Salvo</span>
                  </span>
                )}
              </div>
              <small className="text-xs text-muted-foreground block truncate">
                {quoteId} · {client || 'Cliente não selecionado'}
              </small>
            </div>
          </div>
        </div>

        {/* Center: Live metrics pill */}
        <div className="hidden lg:flex items-center gap-4 rounded-full border bg-secondary/50 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total:</span>
            <strong className="text-primary font-bold text-sm tabular-nums">{money(total)}</strong>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <Layers size={13} />
            <span>{all.length} itens</span>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText size={13} />
            <span>{pages.length} páginas</span>
          </div>
          {discount > 0 && (
            <>
              <span className="h-3 w-px bg-border" />
              <Badge variant="outline" className="text-rose border-rose/30 text-[10px]">
                -{discount}% desc.
              </Badge>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center rounded-md border bg-background px-1 py-0.5 text-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Reduzir zoom"
              onClick={() => setZoom(z => Math.max(50, z - 10))}
            >
              <Minus size={12} />
            </Button>
            <span className="w-10 text-center font-medium">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Aumentar zoom"
              onClick={() => setZoom(z => Math.min(150, z + 10))}
            >
              <Plus size={12} />
            </Button>
          </div>

          {/* Focus mode */}
          <Button
            variant={isFocusMode ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 hidden sm:inline-flex"
            title={isFocusMode ? 'Restaurar painéis laterais' : 'Modo Foco (ocultar painéis)'}
            onClick={() => {
              if (isFocusMode) {
                setLeftOpen(true);
                setRightOpen(true);
              } else {
                setLeftOpen(false);
                setRightOpen(false);
              }
            }}
          >
            {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>

          {/* Preview toggle */}
          <Button
            variant={preview ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setPreview(!preview)}
            title="Alternar entre modo de edição e visualização final do documento"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{preview ? 'Modo Edição' : 'Visualizar'}</span>
          </Button>

          {/* Print button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 hidden md:inline-flex"
            onClick={() => window.print()}
            title="Imprimir documento via navegador (Ctrl+P)"
          >
            <Printer size={14} />
          </Button>

          {/* Export PDF */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => void pdf()}
            title="Exportar documento no formato PDF A4 (Ctrl+E)"
          >
            <Download size={14} />
            <span>{exporting ? 'Gerando…' : 'Baixar PDF'}</span>
          </Button>

          {/* Save button */}
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow"
            onClick={save}
            title="Salvar alterações na proposta (Ctrl+S)"
          >
            <Save size={14} />
            <span>Salvar</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setShortcutsOpen(true)}
            title="Atalhos de teclado (?)"
          >
            <HelpCircle size={16} />
          </Button>
        </div>
      </header>

      {/* Editor Subheader Toolbar */}
      {!preview && (
        <div className="flex flex-wrap items-center justify-between gap-1 border-b bg-muted/40 px-3 py-1 text-xs no-print">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={leftOpen ? 'Ocultar catálogo e blocos' : 'Mostrar catálogo e blocos'}
              onClick={() => setLeftOpen(!leftOpen)}
            >
              {leftOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </Button>
            <span className="h-4 w-px bg-border" />
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Desfazer" onMouseDown={e => { e.preventDefault(); fmt('undo'); }}>
              <Undo2 size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Refazer" onMouseDown={e => { e.preventDefault(); fmt('redo'); }}>
              <Redo2 size={14} />
            </Button>
            <span className="h-4 w-px bg-border" />
            <select
              aria-label="Estilo do texto"
              className="h-7 rounded border bg-background px-2 text-xs"
              onChange={e => fmt('formatBlock', e.target.value)}
              defaultValue="p"
            >
              <option value="p">Normal</option>
              <option value="h2">Título 2</option>
              <option value="h3">Subtítulo</option>
            </select>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Negrito" onMouseDown={e => { e.preventDefault(); fmt('bold'); }}>
              <Bold size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Itálico" onMouseDown={e => { e.preventDefault(); fmt('italic'); }}>
              <Italic size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Sublinhado" onMouseDown={e => { e.preventDefault(); fmt('underline'); }}>
              <Underline size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcadores" onMouseDown={e => { e.preventDefault(); fmt('insertUnorderedList'); }}>
              <List size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Lista numerada" onMouseDown={e => { e.preventDefault(); fmt('insertOrderedList'); }}>
              <ListOrdered size={14} />
            </Button>
            <span className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => insert('pagebreak', selected ? blocks.findIndex(b => b.id === selected) + 1 : blocks.length)}
            >
              <SeparatorHorizontal size={13} />
              + Quebra de Página
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Dica: arraste blocos ou dê duplo clique em produtos para inseri-los.
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={rightOpen ? 'Ocultar propriedades' : 'Mostrar propriedades'}
              onClick={() => setRightOpen(!rightOpen)}
            >
              {rightOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </Button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar: Workspace / Palette / Catalog */}
        {leftOpen && (
          <aside className="flex w-72 shrink-0 flex-col border-r bg-card no-print max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:shadow-2xl">
            <div className="flex items-center justify-between border-b p-3">
              <strong className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Espaço de Trabalho
              </strong>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Recolher lateral" onClick={() => setLeftOpen(false)}>
                <ChevronLeft size={15} />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-1 p-2 border-b bg-muted/30">
              {(['Blocos', 'Produtos', 'Clientes', 'Parceiros'] as const).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={tab === t ? 'secondary' : 'ghost'}
                  className={`h-7 px-1 text-xs ${tab === t ? 'font-bold text-primary shadow-xs' : 'text-muted-foreground'}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </Button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {/* Tab: Blocos */}
              {tab === 'Blocos' && (
                <>
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
                      placeholder="Buscar blocos do documento…"
                      value={q}
                      onChange={e => setQ(e.target.value)}
                    />
                  </div>

                  {filteredPalette.map(g => (
                    <div key={g.group} className="mb-4">
                      <small className="text-[11px] font-bold tracking-widest text-muted-foreground">
                        {g.group.toUpperCase()}
                      </small>
                      <div className="mt-1 space-y-1">
                        {g.items.map(i => (
                          <div
                            key={i.type}
                            draggable
                            onDragStart={start({ kind: 'block', type: i.type })}
                            className="flex cursor-grab items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-secondary active:cursor-grabbing"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                              <i.icon size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold leading-tight">{i.label}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{i.hint}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                              title={`Inserir ${i.label}`}
                              onClick={() => insert(i.type)}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Tab: Produtos & Mantas Georevest */}
              {tab === 'Produtos' && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <small className="text-[11px] font-bold tracking-widest text-muted-foreground">
                      CATÁLOGO DE PRODUTOS
                    </small>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1"
                      onClick={() => {
                        setCatalogTarget('products');
                        setCatalogModalOpen(true);
                      }}
                    >
                      <Plus size={12} />
                      Navegar
                    </Button>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" />
                      <span className="text-xs font-bold">Manta Engenheirada Georevest</span>
                    </div>
                    <div className="space-y-1.5">
                      {georevestCatalog.map(it => (
                        <div
                          key={it.description}
                          draggable
                          onDragStart={start({ kind: 'item', item: it })}
                          onDoubleClick={() => addItem(it, false)}
                          className="group relative flex cursor-grab flex-col rounded-lg border bg-background p-2 text-xs transition-all hover:border-primary hover:shadow-xs active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2">
                            {it.image && (
                              <img
                                src={it.image}
                                alt=""
                                className="h-10 w-12 shrink-0 rounded object-contain bg-secondary/30 p-0.5"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate text-foreground">{it.description}</strong>
                              <small className="block truncate text-muted-foreground">{it.details}</small>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between border-t pt-1.5">
                            <span className="font-bold text-primary">{moneyFull(it.unit)}</span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => addItem(it, false)}
                            >
                              <Plus size={11} /> Adicionar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs font-bold block mb-2 text-muted-foreground">Serviços e Manutenção</span>
                    <div className="space-y-1">
                      {defaultCatalog.map(it => (
                        <div
                          key={it.description}
                          draggable
                          onDragStart={start({ kind: 'item', item: it, service: true })}
                          onDoubleClick={() => addItem(it, true)}
                          className="flex cursor-grab items-center justify-between gap-2 rounded-lg border p-2 text-xs hover:border-primary active:cursor-grabbing"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{it.description}</span>
                            <strong className="text-[11px] text-primary">{money(it.unit)}</strong>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Adicionar à proposta"
                            onClick={() => addItem(it, true)}
                          >
                            <Plus size={13} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Tab: Clientes */}
              {tab === 'Clientes' && (
                <>
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
                      placeholder="Buscar cliente cadastrado…"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                    />
                  </div>

                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Clique para vincular o cliente e dados fiscais a esta proposta.
                  </p>

                  <div className="space-y-1.5">
                    {filteredClients.map(x => {
                      const isSelected = x.client === client;
                      const addr = registeredAddress(x.client);
                      return (
                        <div
                          key={x.client}
                          className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                            isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-sm font-semibold text-foreground">{x.client}</strong>
                            {isSelected && (
                              <Badge variant="default" className="text-[9px] h-4 px-1.5">
                                Selecionado
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {x.contact} · {x.email}
                          </p>
                          {addr && (
                            <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
                              <MapPin size={10} className="inline mr-1 text-primary" />
                              {addr}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t pt-1.5">
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => {
                                selectClient(x.client);
                                notify(`Cliente "${x.client}" vinculado à proposta.`);
                              }}
                            >
                              {isSelected ? 'Cliente Ativo' : 'Vincular'}
                            </Button>
                            {isSelected && addr && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-primary"
                                onClick={() => {
                                  setSiteAddress(addr);
                                  notify('Endereço cadastrado copiado para endereço da obra.');
                                }}
                              >
                                Usar end. obra
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Tab: Parceiros */}
              {tab === 'Parceiros' && (
                <>
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
                      placeholder="Buscar parceiros…"
                      value={partnerSearch}
                      onChange={e => setPartnerSearch(e.target.value)}
                    />
                  </div>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Marque os parceiros que participam ou recebem comissão nesta proposta.
                  </p>
                  <div className="space-y-1.5">
                    {filteredPartnersList.map(p => {
                      const isChecked = selectedPartners.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-xs transition-colors ${
                            isChecked ? 'border-primary bg-primary/5' : 'hover:border-border'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-primary"
                            checked={isChecked}
                            onChange={e => {
                              setSelectedPartners(prev =>
                                e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                              );
                              setDirty(true);
                            }}
                          />
                          <span className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-xs font-bold text-foreground">
                            {p.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-foreground">{p.name}</strong>
                            <small className="text-muted-foreground">{p.category}</small>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Center Canvas: A4 Document Pages View */}
        <section className="flex min-w-0 flex-1 flex-col bg-muted/50 overflow-hidden relative">
          <div
            className="min-h-0 flex-1 overflow-auto p-4 sm:p-8"
            onClick={() => setSelected(null)}
          >
            {/* Document Header info */}
            <div className="mx-auto mb-3 flex max-w-[794px] items-center justify-between text-[11px] text-muted-foreground no-print">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-foreground">PROPOSTA COMERCIAL GEOREVEST</span>
                <span>·</span>
                <span>A4 (210 × 297 mm)</span>
                <span>·</span>
                <span className="font-medium text-primary">
                  {pages.length} {pages.length === 1 ? 'PÁGINA' : 'PÁGINAS'}
                </span>
              </span>
              <span>{exporting ? 'Renderizando PDF…' : `Zoom: ${zoom}%`}</span>
            </div>

            {/* A4 Pages Canvas */}
            <div
              className="mx-auto origin-top space-y-8 pb-20"
              style={{ width: PAGE_W, maxWidth: '100%', zoom: zoom / 100 }}
            >
              {pages.map((page, p) => (
                <div key={p} className="relative group/page">
                  {/* Overflow alert */}
                  {overflowPages.includes(p) && !preview && (
                    <div className="mb-2 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive no-print">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        <strong>A página {p + 1} ultrapassou o limite A4.</strong> Sugerimos inserir uma quebra de página.
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => insert('pagebreak', page[Math.max(0, page.length - 2)]?.i ?? blocks.length)}
                      >
                        Dividir página
                      </Button>
                    </div>
                  )}

                  {/* A4 Page Container */}
                  <article
                    ref={el => {
                      pageRefs.current[p] = el;
                    }}
                    className="quote-doc relative flex flex-col rounded-sm shadow-xl transition-shadow hover:shadow-2xl"
                    style={{ minHeight: PAGE_H }}
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={() => setDropAt(null)}
                    onDrop={onDocDrop}
                  >
                    {/* Letterhead Header image */}
                    {letter.enabled && letter.img && (
                      <img
                        src={letter.img}
                        alt={`Papel timbrado ${company.name}`}
                        className="block w-full select-none"
                        draggable={false}
                      />
                    )}

                    {/* Page Content Body with customizable margins */}
                    <div className="relative flex-1" style={docStyle}>
                      {/* Margin Guides on first page */}
                      {!preview && p === 0 && (
                        <div className="pointer-events-none absolute inset-0 no-print">
                          <div
                            className="pointer-events-auto absolute left-0 top-0 z-20 flex w-full cursor-ns-resize items-center justify-center"
                            style={{ height: margins.top }}
                            onPointerDown={e => startMarginDrag('top', e)}
                          >
                            <div className="h-1 w-16 rounded-full bg-primary/40 transition-all hover:h-1.5 hover:bg-primary" />
                          </div>
                          <div
                            className="pointer-events-auto absolute left-0 top-0 z-20 flex h-full cursor-ew-resize items-center justify-center"
                            style={{ width: margins.left }}
                            onPointerDown={e => startMarginDrag('left', e)}
                          >
                            <div className="h-16 w-1 rounded-full bg-primary/40 transition-all hover:w-1.5 hover:bg-primary" />
                          </div>
                          <div
                            className="pointer-events-auto absolute right-0 top-0 z-20 flex h-full cursor-ew-resize items-center justify-center"
                            style={{ width: margins.right }}
                            onPointerDown={e => startMarginDrag('right', e)}
                          >
                            <div className="h-16 w-1 rounded-full bg-primary/40 transition-all hover:w-1.5 hover:bg-primary" />
                          </div>
                        </div>
                      )}

                      {/* Render blocks of this page */}
                      {page.map(({ b, i }) => (
                        <div key={b.id} className="relative">
                          {/* Drop indicator */}
                          {dropAt === i && <div className="mb-2 h-1 rounded bg-primary animate-pulse" />}

                          {/* Block Wrapper */}
                          <div
                            draggable={!preview}
                            onDragStart={start({ kind: 'move', id: b.id })}
                            onDragOver={e => {
                              e.preventDefault();
                              const r = e.currentTarget.getBoundingClientRect();
                              setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              if (!preview) {
                                setSelected(b.id);
                                setRightTab('Bloco');
                              }
                            }}
                            className={`group/block relative rounded-md transition-all ${
                              b.type === 'pagebreak' ? (preview ? '' : 'mt-4') : gap[b.spacing]
                            } ${preview ? '' : 'p-3 ring-1'} ${
                              selected === b.id
                                ? 'ring-2 ring-primary bg-primary/[0.02]'
                                : preview
                                ? ''
                                : 'ring-transparent hover:ring-border'
                            } ${!b.visible ? 'opacity-40' : ''}`}
                            style={{ textAlign: b.align }}
                          >
                            {/* Floating Toolbar on Selected Block */}
                            {selected === b.id && !preview && (
                              <div className="block-floating-bar absolute -top-4 right-2 z-30 flex items-center rounded-lg border bg-card p-0.5 shadow-md no-print">
                                <span className="px-2 text-[10px] font-bold text-muted-foreground uppercase">
                                  {b.label}
                                </span>
                                <span className="h-3.5 w-px bg-border" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Mover para cima"
                                  disabled={i === 0}
                                  onClick={() => i > 0 && move(b.id, i - 1)}
                                >
                                  <ArrowUp size={13} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Mover para baixo"
                                  disabled={i >= blocks.length - 1}
                                  onClick={() => move(b.id, i + 2)}
                                >
                                  <ArrowDown size={13} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Duplicar bloco"
                                  onClick={() => duplicateBlock(b)}
                                >
                                  <Copy size={13} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title={b.visible ? 'Ocultar bloco' : 'Mostrar bloco'}
                                  onClick={() => update(b.id, { visible: !b.visible })}
                                >
                                  {b.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                                </Button>
                                <span className="h-3.5 w-px bg-border" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  title="Excluir bloco"
                                  onClick={() => {
                                    setBlocks(bs => bs.filter(x => x.id !== b.id));
                                    setSelected(null);
                                    setDirty(true);
                                  }}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            )}

                            {render(b)}
                          </div>

                          {/* Hover inserter between blocks */}
                          {!preview && (
                            <div className="block-hover-inserter no-print">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="block-hover-inserter-btn bg-card text-muted-foreground hover:text-primary gap-1"
                                  >
                                    <Plus size={12} /> Inserir bloco aqui
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-56">
                                  <DropdownMenuItem onClick={() => insert('text', i + 1)}>
                                    <Pilcrow size={14} className="mr-2" /> Texto livre
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('products', i + 1)}>
                                    <Table2 size={14} className="mr-2" /> Tabela de produtos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('services', i + 1)}>
                                    <Wrench size={14} className="mr-2" /> Tabela de serviços
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('terms', i + 1)}>
                                    <ScrollText size={14} className="mr-2" /> Condições comerciais
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('financial', i + 1)}>
                                    <DollarSign size={14} className="mr-2" /> Resumo financeiro
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('image', i + 1)}>
                                    <ImageIcon size={14} className="mr-2" /> Imagem / Foto
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insert('signature', i + 1)}>
                                    <FileSignature size={14} className="mr-2" /> Assinatura e aceite
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => insert('pagebreak', i + 1)}>
                                    <SeparatorHorizontal size={14} className="mr-2 text-primary" /> Quebra de página (A4)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Bottom drop target */}
                      {p === pages.length - 1 && dropAt === visibleBlocks.length && (
                        <div className="h-1 rounded bg-primary animate-pulse" />
                      )}

                      {!preview && p === pages.length - 1 && (
                        <div className="mt-6 rounded-lg border-2 border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground no-print">
                          <p className="font-medium">Final da proposta</p>
                          <p className="mt-1">Arraste novos blocos aqui ou use o botão abaixo para criar uma nova folha.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5 text-xs"
                            onClick={() => insert('pagebreak')}
                          >
                            <Plus size={13} /> + Nova Página A4
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Letterhead Footer */}
                    {letter.enabled && (
                      <footer className="quote-doc-footer px-8 pb-5 text-center">
                        {letter.footer
                          .split('\n')
                          .filter(Boolean)
                          .map((l, k) => (
                            <p key={k} className={/www\.|https?:/.test(l) ? 'underline' : ''}>
                              {l}
                            </p>
                          ))}
                        {letter.pageNumbers && <p className="font-semibold text-xs mt-1">{p + 1}</p>}
                      </footer>
                    )}
                  </article>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Page Navigator Dock */}
          <div className="page-navigator-dock no-print">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Layers size={13} className="text-primary" />
              Páginas ({pages.length}):
            </span>
            {pages.map((pg, idx) => {
              const isOver = overflowPages.includes(idx);
              const label = getPageLabel(pg, idx);
              return (
                <button
                  key={idx}
                  className={`page-nav-pill ${activePage === idx ? 'active' : ''} ${isOver ? 'overflow' : ''}`}
                  onClick={() => scrollToPage(idx)}
                  title={`Ir para folha ${idx + 1} (${label})${isOver ? ' · Atenção: folha com excesso de altura' : ''}`}
                >
                  <span className="opacity-70">{idx + 1}.</span>
                  <span>{label}</span>
                  {isOver && <AlertTriangle size={11} className="text-destructive inline" />}
                </button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-full px-2 text-xs font-medium text-primary hover:bg-primary/10 gap-1 ml-1"
              onClick={() => insert('pagebreak')}
              title="Adicionar nova página A4 no final da proposta"
            >
              <Plus size={12} /> Nova Página
            </Button>
          </div>
        </section>

        {/* Right Sidebar: Properties & Document settings */}
        {rightOpen && !preview && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l bg-card p-4 no-print max-lg:hidden">
            <div className="mb-3 flex items-center justify-between border-b pb-2">
              <strong className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Propriedades
              </strong>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Recolher painel" onClick={() => setRightOpen(false)}>
                <ChevronRight size={15} />
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-muted/40 p-1">
              {(['Bloco', 'Documento', 'Comentários'] as const).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={rightTab === t ? 'secondary' : 'ghost'}
                  className={`h-7 px-1 text-xs ${rightTab === t ? 'font-bold text-primary shadow-xs' : 'text-muted-foreground'}`}
                  onClick={() => setRightTab(t)}
                >
                  {t}
                  {t === 'Comentários' && ` (${comments.length})`}
                </Button>
              ))}
            </div>

            {/* Tab: Comentários */}
            {rightTab === 'Comentários' && (
              <div className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Anotações internas entre a equipe de vendas e projetos:
                </p>
                <div className="space-y-2">
                  {comments.map((m, i) => (
                    <div key={i} className="rounded-lg border bg-secondary/30 p-2.5 text-xs">
                      <span className="font-semibold text-primary">{m.split(':')[0]}:</span>
                      <p className="mt-0.5 text-foreground">{m.split(':').slice(1).join(':')}</p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (comment.trim()) {
                      setComments([...comments, `${owner}: ${comment.trim()}`]);
                      setComment('');
                      notify('Comentário registrado na proposta.');
                    }
                  }}
                  className="space-y-2 pt-2"
                >
                  <textarea
                    className="w-full rounded-md border bg-background p-2 text-xs outline-none focus:border-primary"
                    rows={3}
                    placeholder="Adicionar nota interna sobre este orçamento..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <Button size="sm" type="submit" className="w-full text-xs">
                    Adicionar Comentário
                  </Button>
                </form>
              </div>
            )}

            {/* Tab: Documento & Papel Timbrado */}
            {rightTab === 'Documento' && (
              <div className="space-y-4 text-sm">
                <div className="space-y-3 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <strong className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Papel Timbrado
                    </strong>
                    <Switch
                      checked={letter.enabled}
                      onCheckedChange={v => setLetter(l => ({ ...l, enabled: v }))}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Exibe o cabeçalho oficial e rodapé da Georevest em todas as páginas.
                  </p>

                  {letter.img ? (
                    <div className="space-y-2 rounded-lg border p-2 bg-muted/20">
                      <img src={letter.img} alt="Cabeçalho atual" className="w-full rounded border bg-background" />
                      <div className="flex gap-1.5">
                        <label className="flex-1 cursor-pointer rounded-md border bg-background px-2 py-1 text-center text-xs font-medium hover:border-primary">
                          Trocar imagem
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => readImage(e, url => setLetter(l => ({ ...l, img: url })))}
                          />
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setLetter(l => ({ ...l, img: company.letterhead }))}
                        >
                          Padrão
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground hover:border-primary">
                      <ImageIcon size={16} /> Enviar imagem do cabeçalho
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => readImage(e, url => setLetter(l => ({ ...l, img: url })))}
                      />
                    </label>
                  )}

                  <label className="block text-xs">
                    <span className="font-medium text-muted-foreground">Texto do rodapé institucional</span>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-md border bg-background p-2 text-xs outline-none focus:border-primary"
                      value={letter.footer}
                      onChange={e => setLetter(l => ({ ...l, footer: e.target.value }))}
                    />
                  </label>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium">Numerar páginas</span>
                    <Switch
                      checked={letter.pageNumbers}
                      onCheckedChange={v => setLetter(l => ({ ...l, pageNumbers: v }))}
                    />
                  </div>

                  <label className="block text-xs">
                    <span className="font-medium text-muted-foreground">Cidade de emissão</span>
                    <input
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                      value={letter.city}
                      onChange={e => setLetter(l => ({ ...l, city: e.target.value }))}
                    />
                  </label>
                </div>

                {/* Margins */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Margens da Página
                    </strong>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-primary"
                      onClick={() => setMargins(defaultMargins)}
                    >
                      Restaurar
                    </Button>
                  </div>
                  <MarginSlider
                    label="Superior"
                    value={margins.top}
                    onChange={v => setMargins(m => ({ ...m, top: v }))}
                  />
                  <MarginSlider
                    label="Inferior"
                    value={margins.bottom}
                    onChange={v => setMargins(m => ({ ...m, bottom: v }))}
                  />
                  <MarginSlider
                    label="Esquerda"
                    value={margins.left}
                    onChange={v => setMargins(m => ({ ...m, left: v }))}
                  />
                  <MarginSlider
                    label="Direita"
                    value={margins.right}
                    onChange={v => setMargins(m => ({ ...m, right: v }))}
                  />
                </div>
              </div>
            )}

            {/* Tab: Bloco Selecionado */}
            {rightTab === 'Bloco' && (
              <>
                {!sel ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground space-y-3">
                    <Info size={20} className="mx-auto text-primary opacity-60" />
                    <div>
                      <strong className="block font-semibold text-foreground">Nenhum bloco selecionado</strong>
                      <p className="mt-1">
                        Clique em qualquer bloco no documento para ajustar formatação, cores e opções.
                      </p>
                    </div>
                    <div className="border-t pt-3 text-left space-y-1.5">
                      <span className="font-semibold text-foreground block text-[11px]">Resumo do documento:</span>
                      <p>• {blocks.length} blocos configurados</p>
                      <p>• {pages.length} páginas geradas</p>
                      <p>• Total: {money(total)}</p>
                      <p>• Cliente: {client || 'Pendente'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <strong className="font-bold text-foreground">{sel.label}</strong>
                        <small className="block text-[10px] text-muted-foreground">{labelOf(sel.type)}</small>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {sel.visible ? 'Visível' : 'Oculto'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Exibir no documento</span>
                      <Switch checked={sel.visible} onCheckedChange={v => update(sel.id, { visible: v })} />
                    </div>

                    <label className="block text-xs">
                      <span className="font-medium text-muted-foreground">Rótulo do bloco</span>
                      <input
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        value={sel.label}
                        onChange={e => update(sel.id, { label: e.target.value })}
                      />
                    </label>

                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Alinhamento do conteúdo</p>
                      <div className="flex gap-1">
                        {alignOptions.map(([v, I]) => (
                          <Button
                            key={v}
                            size="icon"
                            variant={sel.align === v ? 'secondary' : 'outline'}
                            className="h-8 w-8"
                            title={v}
                            onClick={() => update(sel.id, { align: v as Block['align'] })}
                          >
                            <I size={14} />
                          </Button>
                        ))}
                      </div>
                    </div>

                    <label className="block text-xs">
                      <span className="font-medium text-muted-foreground">Espaçamento inferior</span>
                      <select
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        value={sel.spacing}
                        onChange={e => update(sel.id, { spacing: e.target.value as Block['spacing'] })}
                      >
                        <option value="compact">Compacto (menor espaço)</option>
                        <option value="normal">Normal (padrão)</option>
                        <option value="wide">Amplo (maior respiro)</option>
                      </select>
                    </label>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Cor de destaque</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-6 w-8 cursor-pointer rounded border"
                          value={sel.accent}
                          onChange={e => update(sel.id, { accent: e.target.value })}
                        />
                        <span className="text-xs font-mono">{sel.accent}</span>
                      </div>
                    </div>

                    {(sel.type === 'products' || sel.type === 'services') && (
                      <label className="block text-xs">
                        <span className="font-medium text-muted-foreground">Modelo de exibição dos itens</span>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          value={sel.layout === 'cards' ? 'cards' : 'table'}
                          onChange={e =>
                            update(sel.id, { layout: e.target.value as NonNullable<Block['layout']> })
                          }
                        >
                          <option value="cards">Cartões com imagem (padrão Georevest)</option>
                          <option value="table">Tabela clássica de itens</option>
                        </select>
                      </label>
                    )}

                    {sel.type === 'terms' && (
                      <label className="block text-xs">
                        <span className="font-medium text-muted-foreground">Formato das condições</span>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          value={sel.layout === 'letter' ? 'letter' : 'table'}
                          onChange={e =>
                            update(sel.id, { layout: e.target.value as NonNullable<Block['layout']> })
                          }
                        >
                          <option value="letter">Parágrafos em carta (padrão Georevest)</option>
                          <option value="table">Tabela descritiva</option>
                        </select>
                      </label>
                    )}

                    {sel.type === 'signature' && (
                      <label className="block text-xs">
                        <span className="font-medium text-muted-foreground">Formato de aprovação</span>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          value={sel.layout === 'letter' ? 'letter' : 'accept'}
                          onChange={e =>
                            update(sel.id, {
                              layout: e.target.value as NonNullable<Block['layout']>,
                              ...(e.target.value === 'letter' && !sel.signatureHtml?.includes('Atenciosamente')
                                ? { signatureHtml: templateHtml.signLeft, html: templateHtml.signRight }
                                : {}),
                            })
                          }
                        >
                          <option value="letter">Atenciosamente e contatos (Georevest)</option>
                          <option value="accept">Linhas formais de aceite</option>
                        </select>
                      </label>
                    )}

                    {sel.type === 'financial' && (
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Exibir campo de desconto</span>
                          <Switch
                            checked={sel.showDiscount !== false}
                            onCheckedChange={v => update(sel.id, { showDiscount: v })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>

      {/* Catalog Quick Browse & Add Modal */}
      <Dialog open={catalogModalOpen} onOpenChange={setCatalogModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Catálogo de Produtos & Serviços</DialogTitle>
            <DialogDescription>
              Selecione itens padrão da Georevest ou serviços para adicionar diretamente à proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 my-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
                placeholder="Buscar produtos, mantas, reservatórios ou serviços…"
                value={catalogModalSearch}
                onChange={e => setCatalogModalSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={catalogFilter === 'all' ? 'secondary' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setCatalogFilter('all')}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={catalogFilter === 'georevest' ? 'secondary' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setCatalogFilter('georevest')}
              >
                Mantas Georevest
              </Button>
              <Button
                size="sm"
                variant={catalogFilter === 'services' ? 'secondary' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setCatalogFilter('services')}
              >
                Serviços
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {(catalogFilter === 'all' || catalogFilter === 'georevest') && (
              <div>
                <strong className="text-xs font-semibold text-muted-foreground block mb-1">
                  MANTAS ENGENHEIRADAS
                </strong>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {georevestCatalog
                    .filter(
                      it =>
                        it.description.toLowerCase().includes(catalogModalSearch.toLowerCase()) ||
                        (it.details && it.details.toLowerCase().includes(catalogModalSearch.toLowerCase()))
                    )
                    .map(it => (
                      <div
                        key={it.description}
                        className="flex flex-col justify-between rounded-lg border p-3 hover:border-primary transition-all bg-card"
                      >
                        <div className="flex items-start gap-2.5">
                          {it.image && (
                            <img
                              src={it.image}
                              alt=""
                              className="h-12 w-14 shrink-0 rounded object-contain bg-secondary/30 p-1"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <strong className="block text-xs font-bold text-foreground">{it.description}</strong>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{it.details}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t pt-2">
                          <span className="font-bold text-primary text-sm">{moneyFull(it.unit)}</span>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              addItem(it, catalogTarget === 'services');
                              setCatalogModalOpen(false);
                            }}
                          >
                            <Plus size={12} /> Adicionar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {(catalogFilter === 'all' || catalogFilter === 'services') && (
              <div className="pt-2">
                <strong className="text-xs font-semibold text-muted-foreground block mb-1">SERVIÇOS EM GERAL</strong>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {defaultCatalog
                    .filter(it => it.description.toLowerCase().includes(catalogModalSearch.toLowerCase()))
                    .map(it => (
                      <div
                        key={it.description}
                        className="flex items-center justify-between rounded-lg border p-3 hover:border-primary transition-all bg-card"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <strong className="block text-xs font-bold text-foreground truncate">{it.description}</strong>
                          <span className="text-primary font-bold text-xs">{money(it.unit)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => {
                            addItem(it, true);
                            setCatalogModalOpen(false);
                          }}
                        >
                          <Plus size={12} /> Adicionar
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-3 border-t pt-2">
            <Button variant="ghost" onClick={() => setCatalogModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você possui alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Se sair agora, as modificações feitas nesta proposta serão perdidas. Deseja salvar as alterações antes de
              sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-muted text-foreground hover:bg-muted/80"
              onClick={() => {
                setConfirmExitOpen(false);
                onClose();
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={() => {
                setConfirmExitOpen(false);
                save();
                onClose();
              }}
            >
              Salvar e fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shortcuts Help Modal */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atalhos do Editor de Orçamentos</DialogTitle>
            <DialogDescription>Use o teclado para acelerar a criação e edição das suas propostas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs py-2">
            {[
              ['Ctrl + S / Cmd + S', 'Salvar proposta'],
              ['Ctrl + E / Cmd + E', 'Exportar documento para PDF A4'],
              ['Ctrl + P / Cmd + P', 'Imprimir proposta'],
              ['Esc', 'Desmarcar bloco ou fechar'],
              ['?', 'Abrir este painel de atalhos'],
              ['Duplo clique no produto', 'Adicionar item à proposta'],
              ['Arrastar blocos', 'Reordenar blocos ou páginas'],
            ].map(([k, desc]) => (
              <div key={k} className="flex items-center justify-between py-1 border-b">
                <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  {k}
                </kbd>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShortcutsOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
