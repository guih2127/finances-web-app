import { useCallback, useEffect, useState } from 'react';
import { api, type Summary } from './api';

/** Mês atual no formato YYYY-MM. */
export function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const nome = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

// Mês selecionado, persistido no navegador e compartilhado entre as telas.
// Assim o mês "congela" no que você escolheu (ex.: outubro) mesmo após refresh.
export function useMonthState(): [string, (m: string) => void] {
  const [month, setMonthRaw] = useState(() => localStorage.getItem('finance:month') || thisMonth());
  const setMonth = useCallback((m: string) => {
    localStorage.setItem('finance:month', m);
    setMonthRaw(m);
  }, []);
  return [month, setMonth];
}

export function useSummary(month: string) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    api.summary(month).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [month]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    window.addEventListener('tx-changed', reload);
    return () => window.removeEventListener('tx-changed', reload);
  }, [reload]);
  return { data, loading, reload };
}
