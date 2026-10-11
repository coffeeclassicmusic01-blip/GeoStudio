import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Copy, Mail, MessageCircle, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, type Quote } from './data';
import { draftFollowup } from './followup.functions';

export function FollowupWriter({ quote, onSave, notify }: { quote: Quote; onSave: (text: string) => void; notify: (t: string) => void }) {
  const draft = useServerFn(draftFollowup);
  const [tone, setTone] = useState('Cordial e consultivo'); const [channel, setChannel] = useState<'E-mail' | 'WhatsApp'>('E-mail');
  const [extra, setExtra] = useState(''); const [text, setText] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true); setError('');
    try {
      const r = await draft({ data: { client: quote.client, contact: quote.contact, project: quote.project, value: money(quote.value), status: quote.status, owner: quote.owner, history: quote.notes, tone, channel, extra } });
      if (r.error) setError(r.error); else setText(r.text);
    } catch { setError('Não foi possível gerar a mensagem agora.'); } finally { setLoading(false); }
  }
  return <div className="activity">
    <h3><Sparkles size={15} className="inline mr-1" />Redigir follow-up com IA</h3>
    <div className="form-two-columns">
      <label className="field-label">Tom<select value={tone} onChange={e => setTone(e.target.value)}>{['Cordial e consultivo', 'Retomada rápida', 'Negociação de condições', 'Fechamento'].map(o => <option key={o}>{o}</option>)}</select></label>
      <label className="field-label">Canal<select value={channel} onChange={e => setChannel(e.target.value as 'E-mail' | 'WhatsApp')}><option>E-mail</option><option>WhatsApp</option></select></label>
    </div>
    <label className="field-label">Instruções adicionais (opcional)<textarea placeholder="Ex.: reforçar o prazo de entrega" value={extra} onChange={e => setExtra(e.target.value)} /></label>
    <Button type="button" variant="outline" className="w-full mt-2" disabled={loading} onClick={generate}><Sparkles />{loading ? 'Gerando mensagem...' : text ? 'Gerar novamente' : 'Gerar mensagem'}</Button>
    {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    {text && <>
      <label className="field-label">Mensagem sugerida<textarea rows={9} value={text} onChange={e => setText(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2 mt-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(text); notify('Mensagem copiada.'); }}><Copy />Copiar</Button>
        {channel === 'E-mail'
          ? <Button type="button" size="sm" variant="outline" asChild><a href={`mailto:${quote.email}?body=${encodeURIComponent(text)}`}><Mail />Abrir e-mail</a></Button>
          : <Button type="button" size="sm" variant="outline" asChild><a target="_blank" rel="noreferrer" href={`https://wa.me/55${quote.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}><MessageCircle />Abrir WhatsApp</a></Button>}
        <Button type="button" size="sm" onClick={() => { onSave(text); notify('Mensagem registrada no histórico.'); }}><Save />Salvar no histórico</Button>
      </div>
    </>}
  </div>;
}
