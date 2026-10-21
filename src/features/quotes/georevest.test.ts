import { describe, expect, it } from 'vitest';
import { formatAddress, longDate, titleLines } from './georevest';
import { moneyFull } from './data';

describe('modelo de proposta Georevest', () => {
  it('data por extenso no formato da proposta', () => { expect(longDate('2026-10-09')).toBe('09 de Outubro de 2026'); expect(longDate('')).toBe(''); });
  it('valores com centavos', () => { expect(moneyFull(23197.77).replace(/\s/g, ' ')).toBe('R$ 23.197,77'); });
  it('endereço usa só as partes cadastradas', () => {
    expect(formatAddress({ address: 'R. Paula Rodrigues', number: '175', neighborhood: 'Piratininga', city: 'Osasco', uf: 'SP', cep: '06233-030' })).toBe('R. Paula Rodrigues, 175 - Piratininga, Osasco - SP, 06233-030');
    expect(formatAddress({ city: 'Osasco' })).toBe('');
  });
  it('descrição com " · " vira linhas no cartão', () => { expect(titleLines('Blocos de 12 Andares · Reservatórios Inferiores')).toEqual(['Blocos de 12 Andares', 'Reservatórios Inferiores']); });
});
