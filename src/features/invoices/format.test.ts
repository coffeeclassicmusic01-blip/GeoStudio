import { describe, expect, it } from 'vitest';
import { caretAfter, formatCnpj, formatMoneyInput, formatWeight, moneyInput, weightInput } from './format';
import { installments, invoiceTotal } from './data';
import { blankInvoice } from './data';

describe('máscara de CNPJ', () => {
  it('formata 14 dígitos como 00.000.000/0000-00', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });
  it('aplica a máscara parcialmente durante a digitação', () => {
    expect(formatCnpj('123456')).toBe('12.345.6');
    expect(formatCnpj('123456780001')).toBe('12.345.678/0001');
  });
  it('ignora letras e limita a 14 dígitos', () => {
    expect(formatCnpj('12a345678000190999')).toBe('12.345.678/0001-90');
  });
});

describe('moeda brasileira', () => {
  it('formata 1000 como R$ 1.000,00', () => {
    expect(formatMoneyInput(moneyInput('1000').value)).toBe('R$ 1.000,00');
  });
  it('formata 15000,50 como R$ 15.000,50', () => {
    expect(moneyInput('15000,50')).toEqual({ text: 'R$ 15.000,50', value: 15000.5 });
    expect(formatMoneyInput(15000.5)).toBe('R$ 15.000,50');
  });
  it('formata 250000 como R$ 250.000,00', () => {
    expect(formatMoneyInput(moneyInput('250000').value)).toBe('R$ 250.000,00');
  });
  it('mantém o valor numérico sem símbolo nem máscara', () => {
    expect(moneyInput('R$ 1.234.567,89').value).toBe(1234567.89);
  });
  it('limita os centavos a duas casas', () => {
    expect(moneyInput('R$ 10,999').value).toBe(10.99);
  });
  it('trata ponto digitado no fim como vírgula decimal', () => {
    expect(moneyInput('R$ 1.000.').text).toBe('R$ 1.000,');
  });
  it('campo apagado vale zero', () => {
    expect(moneyInput('R$ ')).toEqual({ text: '', value: 0 });
  });
  it('reposiciona o cursor após os dígitos já digitados', () => {
    expect(caretAfter('R$ 1.000', 2)).toBe(6);
  });
});

describe('parcelas continuam numéricas', () => {
  it('divide R$ 15.000,00 em 3 parcelas de R$ 5.000,00', () => {
    const inv = { ...blankInvoice('NF-T'), type: 'Venda avulsa de produto', value: moneyInput('15000').value, payment: { ...blankInvoice('x').payment, condition: 'Parcelado', count: 3, firstDue: '2026-11-30' } };
    expect(invoiceTotal(inv)).toBe(15000);
    expect(installments(inv).map(p => formatMoneyInput(p.value))).toEqual(['R$ 5.000,00', 'R$ 5.000,00', 'R$ 5.000,00']);
  });
});

describe('peso em kg', () => {
  it('ao digitar 150 apresenta 150 kg', () => {
    expect(formatWeight(weightInput('150'))).toBe('150 kg');
  });
  it('aceita apenas números e vírgula decimal', () => {
    expect(weightInput('12a5,5kg')).toBe('125,5');
    expect(weightInput('12.')).toBe('12,');
  });
  it('peso vazio aparece como —', () => {
    expect(formatWeight('')).toBe('—');
  });
});
