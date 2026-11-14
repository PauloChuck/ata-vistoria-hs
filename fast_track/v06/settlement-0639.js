/* Contingency settlement: item totals, one deductible, exact cents. */
(() => {
  'use strict';
  const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
  function cents(value) {
    if (value == null || String(value).trim() === '') return null;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value).trim();
    if (!/^\d+(?:\.\d*)?$/.test(raw)) return null;
    const [whole, fraction = ''] = raw.split('.');
    const result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)) + (Number(fraction[2] || 0) >= 5 ? 1n : 0n);
    return result <= MAX_CENTS ? Number(result) : null;
  }
  const money = value => value == null ? 'A apurar' : Number(value).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  function itemMoney(value) {
    if (value == null || String(value).trim() === '') return 'A INFORMAR';
    const n = cents(value);
    return n == null ? 'VALOR INVÁLIDO' : money(n / 100);
  }
  function calculate(state) {
    const items = Array.isArray(state?.damages) ? state.damages : [];
    const pending = [];
    function sum(key, label) {
      let total = 0n, complete = true;
      items.forEach((item, index) => {
        const value = item[key], n = cents(value);
        const name = String(item.description || '').trim();
        const prefix = `Item ${index + 1}${name ? ` — ${name}` : ''}`;
        if (n == null) {
          const missing = value == null || String(value).trim() === '';
          pending.push(`${prefix}: ${missing ? 'informe' : 'corrija'} o valor ${label}.`);
          complete = false;
        } else {
          total += BigInt(n);
          if (total > MAX_CENTS) {
            pending.push(`${prefix}: o total ${label} excede o limite monetário suportado.`);
            complete = false;
          }
        }
      });
      return complete ? Number(total) : null;
    }
    const claimed = sum('claimedTotal', 'reclamado'), assessed = sum('assessedTotal', 'apurado');
    // Empty cases show zero; a populated case always uses the contractual minimum.
    const deductible = assessed == null ? null : !items.length ? 0 : Math.max(Number((BigInt(assessed) * 15n + 50n) / 100n), 300000);
    return {
      totalClaimed: claimed == null ? null : claimed / 100,
      totalAssessed: assessed == null ? null : assessed / 100,
      deductible: deductible == null ? null : deductible / 100,
      net: assessed == null ? null : Math.max(0, assessed - deductible) / 100,
      pending
    };
  }
  window.FastTrackSettlement = {cents, money, itemMoney, calculate};
})();
