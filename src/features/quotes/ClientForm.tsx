import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pickColor, type Client } from './data';
import { emptyFiscal, validDocument, type ClientFiscal } from '@/features/invoices/data';
import { digits, lookupCep, lookupCnpj, mergeAutofill, useLookup } from '@/features/invoices/lookup';
import { CnpjField } from '@/features/invoices/InvoiceForm';

const isCnpj = (d: string) => validDocument(d, 'PJ');
const always = () => true;

type Props = { editing: Client | null; clients: Client[]; onSave: (c: Client) => void; notify: (m: string) => void };
export function ClientForm({ editing, clients, onSave, notify }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [contact, setContact] = useState(editing?.contact ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [fiscal, setFiscal] = useState<ClientFiscal>({ ...emptyFiscal(), ...editing?.fiscal });
  const autoRef = useRef<{ fiscal: Partial<ClientFiscal>; contact: Partial<{ name: string; phone: string; email: string }> }>({ fiscal: {}, contact: {} });
  const applyFiscal = (patch: Partial<ClientFiscal>) => { const { merged, auto } = mergeAutofill(fiscal, patch, autoRef.current.fiscal); autoRef.current.fiscal = auto; setFiscal(merged); };
  const applyContact = (patch: Partial<{ name: string; phone: string; email: string }>) => {
    const { merged, auto } = mergeAutofill({ name, phone, email }, patch, autoRef.current.contact);
    autoRef.current.contact = auto;
    setName(merged.name); setPhone(merged.phone); setEmail(merged.email);
  };
  const cnpjDigits = digits(fiscal.cnpj);
  const cnpjInvalid = cnpjDigits.length === 14 && !isCnpj(cnpjDigits);
  const { busy: cnpjBusy, error: cnpjError } = useLookup(fiscal.cnpj, 14, isCnpj, lookupCnpj, info => {
    applyFiscal({ legalName: info.legalName, address: info.address, number: info.number, complement: info.complement, neighborhood: info.neighborhood, city: info.city, uf: info.uf, cep: info.cep });
    applyContact({ name: info.tradeName || info.legalName, phone: info.phone, email: info.email });
    notify('Dados cadastrais preenchidos a partir do CNPJ. Confira antes de salvar.');
  }, notify);
  const { busy: cepBusy } = useLookup(fiscal.cep, 8, always, lookupCep, info => {
    applyFiscal({ address: info.address, neighborhood: info.neighborhood, city: info.city, uf: info.uf });
    notify('Endereço preenchido a partir do CEP.');
  }, notify);
  const setF = (k: keyof ClientFiscal, v: string) => setFiscal({ ...fiscal, [k]: v });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const doc = digits(fiscal.cnpj);
    if (doc) {
      if (!validDocument(doc, 'PJ')) { notify('CNPJ inválido. Confira os dígitos antes de salvar.'); return; }
      const duplicate = clients.find(x => x.id !== editing?.id && digits(x.fiscal?.cnpj ?? '') === doc);
      if (duplicate) { notify(`Já existe um cliente cadastrado com este CNPJ (${duplicate.name}).`); return; }
    }
    onSave({
      id: editing?.id ?? `CLI-${String(clients.length + 1).padStart(3, '0')}`,
      name,
      initials: editing?.initials ?? name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase(),
      contact, email, phone, notes,
      color: editing?.color ?? pickColor(clients.length),
      fiscal,
    });
  }
  return <form className="quote-form" onSubmit={submit}>
    <div className="client-cnpj-field"><CnpjField label="CNPJ" value={fiscal.cnpj} onChange={v => setF('cnpj', v)} /></div>
    {cnpjBusy && <small className="billing-lookup" role="status"><span className="billing-spinner" aria-hidden="true" />Consultando CNPJ na base pública…</small>}
    {cnpjInvalid ? <small className="billing-lookup billing-lookup-error" role="alert">CNPJ inválido</small> : cnpjError && !cnpjBusy && <small className="billing-lookup billing-lookup-error" role="alert">{cnpjError}</small>}
    <label className="field-label">Nome fantasia / cliente<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome da empresa" /></label>
    <div className="form-two-columns"><label className="field-label">Razão social<input value={fiscal.legalName} onChange={e => setF('legalName', e.target.value)} placeholder="Razão social" /></label><label className="field-label">Inscrição estadual<input value={fiscal.ie} onChange={e => setF('ie', e.target.value)} placeholder="Quando houver" /></label></div>
    <div className="form-two-columns"><label className="field-label">Pessoa de contato<input required value={contact} onChange={e => setContact(e.target.value)} placeholder="Nome do contato" /></label><label className="field-label">Telefone<input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 90000-0000" /></label></div>
    <label className="field-label">E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com" /></label>
    <div className="form-two-columns"><label className="field-label">CEP<input value={fiscal.cep} onChange={e => setF('cep', e.target.value)} placeholder="00000-000" /></label><label className="field-label">Endereço<input value={fiscal.address} onChange={e => setF('address', e.target.value)} placeholder="Rua, avenida…" /></label></div>
    {cepBusy && <small className="billing-lookup" role="status">Consultando CEP…</small>}
    <div className="form-two-columns"><label className="field-label">Número<input value={fiscal.number ?? ''} onChange={e => setF('number', e.target.value)} /></label><label className="field-label">Complemento<input value={fiscal.complement ?? ''} onChange={e => setF('complement', e.target.value)} /></label></div>
    <div className="form-two-columns"><label className="field-label">Bairro<input value={fiscal.neighborhood ?? ''} onChange={e => setF('neighborhood', e.target.value)} /></label><label className="field-label">Cidade<input value={fiscal.city} onChange={e => setF('city', e.target.value)} /></label></div>
    <label className="field-label">UF<input value={fiscal.uf} onChange={e => setF('uf', e.target.value)} placeholder="SP" maxLength={2} /></label>
    <label className="field-label">Observações<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." /></label>
    <Button type="submit" className="w-full"><Check />{editing ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
  </form>;
}
