import { describe, expect, it } from 'vitest';
import { filterQuotes, initialQuotes } from './data';
describe('Quote filters',()=>{
 it('finds a quote by client name regardless of case',()=>{expect(filterQuotes(initialQuotes,'NEXUM','Todos os status','Todos os responsáveis','Este mês').map(q=>q.id)).toEqual(['ORC-2026-048'])});
 it('combines owner and stage filters',()=>{expect(filterQuotes(initialQuotes,'','Em negociação','Pedro','Este mês').map(q=>q.id)).toEqual(['ORC-2026-045'])});
 it('restricts the demonstration week to October 4 onward',()=>{expect(filterQuotes(initialQuotes,'','Todos os status','Todos os responsáveis','Últimos 7 dias').some(q=>q.id==='ORC-2026-042')).toBe(false)});
});

import { quoteItems as _qi, initialQuotes as _iq } from './data';
import { test as _t, expect as _e } from 'vitest';
_t('itens do PDF somam exatamente o valor do orçamento', () => {
  for (const q of _iq) _e(_qi(q).reduce((s, i) => s + i.unit * i.qty, 0)).toBe(q.value);
});
