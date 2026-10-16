import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const input = z.object({
  client: z.string().max(200), contact: z.string().max(200), project: z.string().max(300), value: z.string().max(50),
  status: z.string().max(50), owner: z.string().max(100), history: z.array(z.string().max(1000)).max(30),
  tone: z.string().max(60), channel: z.enum(['E-mail', 'WhatsApp']), extra: z.string().max(1000),
});

export const draftFollowup = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { text: '', error: 'Serviço de IA não configurado.' };
    const prompt = `Redija uma mensagem de follow-up comercial em português do Brasil.
Canal: ${data.channel}${data.channel === 'E-mail' ? ' (inclua uma linha "Assunto:" no início)' : ' (curta, informal-profissional, sem assunto)'}.
Tom: ${data.tone}.
Cliente: ${data.client} — contato: ${data.contact}
Projeto: ${data.project} — valor: ${data.value} — status: ${data.status}
Responsável que assina: ${data.owner}, Geo Studio
Histórico de contatos (mais recente primeiro):
${data.history.map(h => `- ${h}`).join('\n') || '- sem registros'}
Instruções adicionais: ${data.extra || 'nenhuma'}
Retorne apenas a mensagem, sem comentários. Não invente descontos ou fatos não informados.`;
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
      body: JSON.stringify({ model: 'openai/gpt-6-astra', input: prompt, reasoning: { effort: 'low' }, store: false, stream: true }),
    });
    if (!res.ok || !res.body) {
      console.error('AI gateway error', res.status, await res.text().catch(() => ''));
      const msg = res.status === 429 ? 'Muitas solicitações. Tente novamente em instantes.' : res.status === 402 ? 'Créditos de IA esgotados no workspace.' : 'Não foi possível gerar a mensagem agora.';
      return { text: '', error: msg };
    }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let text = '';
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim(); if (!payload || payload === '[DONE]') continue;
        try { const ev = JSON.parse(payload); if (ev.type === 'response.output_text.delta') text += ev.delta; } catch { /* partial */ }
      }
    }
    return text.trim() ? { text: text.trim(), error: '' } : { text: '', error: 'A IA não retornou uma mensagem.' };
  });
