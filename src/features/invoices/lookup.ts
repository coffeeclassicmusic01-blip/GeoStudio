import { useEffect, useRef, useState } from 'react';

export type CnpjInfo = { legalName: string; tradeName: string; address: string; number: string; complement: string; neighborhood: string; city: string; uf: string; cep: string; phone: string; email: string };
export type CepInfo = { address: string; neighborhood: string; city: string; uf: string };

export const digits = (value: string) => value.replace(/\D/g, '');

/** Erro de consulta com mensagem amigável; `retry` indica que digitar o mesmo número novamente pode funcionar. */
export class LookupError extends Error {
  constructor(message: string, readonly retry: boolean) { super(message); }
}

export async function lookupCnpj(cnpj: string): Promise<CnpjInfo> {
  let res: Response;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits(cnpj)}`);
  } catch {
    throw new LookupError('Consulta automática indisponível. Preencha os dados manualmente.', true);
  }
  if (res.status === 404) throw new LookupError('Empresa não encontrada. Preencha os dados manualmente.', false);
  if (res.status === 429) throw new LookupError('Muitas consultas seguidas. Aguarde alguns instantes ou preencha os dados manualmente.', true);
  if (!res.ok) throw new LookupError('Consulta automática indisponível. Preencha os dados manualmente.', true);
  const j = await res.json() as Record<string, string | undefined>;
  return { legalName: j['razao_social'] ?? '', tradeName: j['nome_fantasia'] ?? '', address: j['logradouro'] ?? '', number: j['numero'] ?? '', complement: j['complemento'] ?? '', neighborhood: j['bairro'] ?? '', city: j['municipio'] ?? '', uf: j['uf'] ?? '', cep: j['cep'] ?? '', phone: j['ddd_telefone_1'] ?? '', email: j['email'] ?? '' };
}

export async function lookupCep(cep: string): Promise<CepInfo> {
  const d = digits(cep);
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`);
    if (res.ok) {
      const j = await res.json() as Record<string, string | undefined>;
      return { address: j['street'] ?? '', neighborhood: j['neighborhood'] ?? '', city: j['city'] ?? '', uf: j['state'] ?? '' };
    }
  } catch { /* tenta o serviço alternativo abaixo */ }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) throw new Error('http');
    const j = await res.json() as Record<string, string | undefined> & { erro?: boolean };
    if (j.erro) throw new Error('not-found');
    return { address: j['logradouro'] ?? '', neighborhood: j['bairro'] ?? '', city: j['localidade'] ?? '', uf: j['uf'] ?? '' };
  } catch (err) {
    if (err instanceof Error && err.message === 'not-found') throw new Error('CEP não encontrado. Preencha o endereço manualmente.');
    throw new Error('Não foi possível consultar o CEP agora. Seus dados foram mantidos.');
  }
}

/** Mescla dados de consulta sem sobrescrever campos editados manualmente nem preencher com valores vazios. */
export function mergeAutofill<T extends Record<string, string | undefined>>(current: T, patch: Partial<T>, previousAuto: Partial<T>): { merged: T; auto: Partial<T> } {
  const merged = { ...current };
  const auto: Partial<T> = { ...previousAuto };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const incoming = patch[key];
    if (!incoming) continue;
    const before = current[key];
    if (!before || before === previousAuto[key]) { merged[key] = incoming; auto[key] = incoming; }
    else delete auto[key];
  }
  return { merged, auto };
}

/** Consulta automática com espera de digitação, validação prévia e sem repetir consultas já feitas. */
export function useLookup<T>(raw: string, size: number, valid: (d: string) => boolean, fetcher: (d: string) => Promise<T>, onResult: (r: T) => void, onError: (message: string) => void): { busy: boolean; error: string } {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const queriedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef({ valid, fetcher, onResult, onError });
  cbRef.current = { valid, fetcher, onResult, onError };
  useEffect(() => {
    const d = digits(raw);
    setError('');
    if (d.length !== size || !cbRef.current.valid(d) || queriedRef.current.has(d)) { setBusy(false); return; }
    setBusy(true);
    let active = true;
    const timer = setTimeout(() => {
      queriedRef.current.add(d);
      cbRef.current.fetcher(d)
        .then(result => { if (!active) { queriedRef.current.delete(d); return; } setBusy(false); cbRef.current.onResult(result); })
        .catch((err: unknown) => {
          if (!active || (err instanceof LookupError && err.retry)) queriedRef.current.delete(d);
          if (!active) return;
          const message = err instanceof Error ? err.message : 'Não foi possível consultar. Seus dados foram mantidos.';
          setBusy(false); setError(message); cbRef.current.onError(message);
        });
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [raw, size]);
  return { busy, error };
}
