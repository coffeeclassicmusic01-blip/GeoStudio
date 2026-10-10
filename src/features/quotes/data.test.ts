import { describe, expect, it } from 'vitest';
import { filterQuotes, initialQuotes } from './data';
describe('Quote filters',()=>{
 it('finds a quote by client name regardless of case',()=>{expect(filterQuotes(initialQuotes,'NEXUM','Todos os status','Todos os responsáveis','Este mês').map(q=>q.id)).toEqual(['ORC-2026-048'])});
 it('combines owner and stage filters',()=>{expect(filterQuotes(initialQuotes,'','Em negociação','Pedro','Este mês').map(q=>q.id)).toEqual(['ORC-2026-045'])});
 it('restricts the demonstration week to October 4 onward',()=>{expect(filterQuotes(initialQuotes,'','Todos os status','Todos os responsáveis','Últimos 7 dias').some(q=>q.id==='ORC-2026-042')).toBe(false)});
});
