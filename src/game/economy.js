// Resort economy: cash flow, daily ledger, bankruptcy watch.

import { bus } from '../core/bus.js';

export function makeEconomy(startCash) {
  return {
    cash: startCash,
    today: { income: 0, upkeep: 0, wages: 0, other: 0 },
    history: [], // {day, income, upkeep, wages, net}
  };
}

export function earn(econ, amount, kind = 'income') {
  econ.cash += amount;
  econ.today[kind === 'income' ? 'income' : 'other'] += amount;
  if (econ.cash < 0) bus.emit('econ:negative', econ.cash);
}

export function pay(econ, amount, kind = 'upkeep') {
  econ.cash -= amount;
  const key = kind === 'wages' ? 'wages' : kind === 'other' ? 'other' : 'upkeep';
  econ.today[key] += amount;
}

export function canAfford(econ, amount) { return econ.cash >= amount; }

export function closeDay(econ, day) {
  const t = econ.today;
  const entry = {
    day,
    income: Math.round(t.income),
    upkeep: Math.round(t.upkeep),
    wages: Math.round(t.wages),
    other: Math.round(t.other),
    net: Math.round(t.income - t.upkeep - t.wages - t.other),
  };
  econ.history.push(entry);
  if (econ.history.length > 21) econ.history.shift();
  econ.today = { income: 0, upkeep: 0, wages: 0, other: 0 };
  return entry;
}

export function money(v) {
  const n = Math.round(v);
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US');
}
