import { useEffect, useRef, useState } from 'react';

export type CnpjInfo = { legalName: string; tradeName: string; address: string; number: string; complement: string; neighborhood: string; city: string; uf: string; cep: string; phone: string; email: string };
export type CepInfo = { address: string; neighborhood: string; city: string; uf: string };

export const digits = (value: string) => value.replace(/\D/g, '');

export async function lookupCnpj(cnpj: string): Promise<CnpjInfo> {
  let res: Response;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits(cnpj)}`);
  } catch {
    throw new Error('Sem conexão com a base de CNPJ. Seus dados foram mantidos.');
  }
  if (res.status === 404) throw new Error('CNPJ não encontrado na base pública. Preencha manualmente.');
  if (res.status === 429) throw new Error('Muitas consultas seguidas. Aguarde alguns instantes.');
  if (!res.ok) throw new Error('Não foi possível consultar o CNPJ agora. Seus dados foram mantidos.');
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
export function useLookup<T>(raw: string, size: number, valid: (d: string) => boolean, fetcher: (d: string) => Promise<T>, onResult: (r: T) => void, onError: (message: string) => void): boolean {
  const [busy, setBusy] = useState(false);
  const queriedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef({ fetcher, onResult, onError });
  cbRef.current = { fetcher, onResult, onError };
  useEffect(() => {
    const d = digits(raw);
    if (d.length !== size || !valid(d) || queriedRef.current.has(d)) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(() => {
      queriedRef.current.add(d);
      cbRef.current.fetcher(d)
        .then(result => { console.log('[lookup] result', result); setBusy(false); cbRef.current.onResult(result); })
        .catch((err: unknown) => { setBusy(false); cbRef.current.onError(err instanceof Error ? err.message : 'Não foi possível consultar. Seus dados foram mantidos.'); });
    }, 500);
    return () => clearTimeout(timer);
  }, [raw, size, valid]);
  return busy;
}
