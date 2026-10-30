/** Máscaras e formatação pt-BR usadas nos formulários fiscais. Valores monetários continuam números; só o texto exibido recebe "R$". */

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Aplica a máscara 00.000.000/0000-00 conforme o usuário digita (aceita apenas números). */
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  let s = d.slice(0, 2);
  if (d.length > 2) s += `.${d.slice(2, 5)}`;
  if (d.length > 5) s += `.${d.slice(5, 8)}`;
  if (d.length > 8) s += `/${d.slice(8, 12)}`;
  if (d.length > 12) s += `-${d.slice(12, 14)}`;
  return s;
}

/** Texto final de um valor em Real: 1000 → "R$ 1.000,00". */
export function formatMoneyInput(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Interpreta o que o usuário digitou no campo de moeda e devolve o texto formatado durante a digitação
 * e o valor numérico. Vírgula separa centavos; pontos são separadores de milhar. Um ponto digitado no fim
 * (teclados numéricos que não têm vírgula) vira vírgula decimal.
 */
export function moneyInput(raw: string): { text: string; value: number } {
  let s = raw.replace(/R\$/g, '').trim();
  if (!s.includes(',') && s.endsWith('.')) s = `${s.slice(0, -1)},`;
  const comma = s.indexOf(',');
  const hasComma = comma >= 0;
  let int = onlyDigits(hasComma ? s.slice(0, comma) : s).replace(/^0+(?=\d)/, '').slice(0, 12);
  const dec = hasComma ? onlyDigits(s.slice(comma + 1)).slice(0, 2) : '';
  if (!int && !hasComma) return { text: '', value: 0 };
  if (!int) int = '0';
  return { text: `R$ ${group(int)}${hasComma ? `,${dec}` : ''}`, value: Number(`${int}.${dec || '0'}`) };
}

/** Quantos caracteres significativos (dígitos e vírgula) existem antes da posição do cursor. */
export function significantBefore(text: string, end: number): number {
  return (text.slice(0, end).match(/[\d,]/g) ?? []).length;
}

/** Posição do cursor no texto formatado logo após o n-ésimo caractere significativo. */
export function caretAfter(text: string, count: number): number {
  if (count <= 0) return text.search(/[\d,]/) >= 0 ? text.search(/[\d,]/) : text.length;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[\d,]/.test(text[i]!)) seen++;
    if (seen === count) return i + 1;
  }
  return text.length;
}

/** "2026-11-30" → "30/11/2026"; vazio vira "—". */
export const brDate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—');
