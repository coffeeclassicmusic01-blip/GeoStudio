import { describe, expect, it } from 'vitest';
import { digits, mergeAutofill } from './lookup';
import { validDocument } from './data';

describe('mergeAutofill', () => {
  it('preenche campos vazios com os dados da consulta', () => {
    const { merged } = mergeAutofill({ city: '', uf: '' }, { city: 'São Paulo', uf: 'SP' }, {});
    expect(merged).toEqual({ city: 'São Paulo', uf: 'SP' });
  });
  it('não sobrescreve valores editados manualmente', () => {
    const { merged, auto } = mergeAutofill({ city: 'Campinas', uf: '' }, { city: 'São Paulo', uf: 'SP' }, { city: 'Rio de Janeiro' });
    expect(merged.city).toBe('Campinas');
    expect(merged.uf).toBe('SP');
    expect(auto.city).toBeUndefined();
  });
  it('atualiza campos que ainda contêm o valor da consulta anterior', () => {
    const { merged } = mergeAutofill({ city: 'Rio de Janeiro' }, { city: 'São Paulo' }, { city: 'Rio de Janeiro' });
    expect(merged.city).toBe('São Paulo');
  });
  it('nunca preenche com valores vazios vindos da consulta', () => {
    const { merged } = mergeAutofill({ city: 'Campinas' }, { city: '' }, {});
    expect(merged.city).toBe('Campinas');
  });
});

describe('validação prévia de CNPJ', () => {
  it('rejeita CNPJ com dígitos verificadores incorretos antes da consulta', () => {
    expect(validDocument('04.252.011/0001-11', 'PJ')).toBe(false);
  });
  it('aceita CNPJ válido para liberar a consulta', () => {
    expect(validDocument('04.252.011/0001-10', 'PJ')).toBe(true);
  });
  it('normaliza a entrada removendo a máscara', () => {
    expect(digits('04.252.011/0001-10')).toBe('04252011000110');
  });
});
