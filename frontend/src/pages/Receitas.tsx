import { useState } from 'react';
import { api } from '../lib/api';
import { brl } from '../lib/money';
import { useMonthState, useSummary } from '../lib/useSummary';
import { MonthNav } from '../components/MonthNav';

export function Receitas() {
  const [month, setMonth] = useMonthState();
  const { data, loading } = useSummary(month);
  const [fx, setFx] = useState<{ rate: number; updatedAt: string } | null>(null);
  const [fxLoading, setFxLoading] = useState(false);

  async function refreshFx() {
    setFxLoading(true);
    try { setFx(await api.fx()); } finally { setFxLoading(false); }
  }

  if (loading || !data) return <div className="loading">Carregando…</div>;

  const extras = data.categories.filter((c) => c.kind === 'income' && c.realizadoCents > 0);

  return (
    <>
      <div className="wtop">
        <h1>Receitas</h1>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="listcard" style={{ background: 'linear-gradient(135deg,#14352a,#161b18)' }}>
        <div className="lh">
          <b>💼 Salário VendorSmart</b>
          <button onClick={refreshFx} disabled={fxLoading}>{fxLoading ? '…' : '↻ atualizar cotação'}</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', paddingBottom: 6 }}>
          (US$ {(data.salaryUsdCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} − taxa US$ {(data.salaryFeeUsdCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) × R$ {Number(data.usdRate).toFixed(4)}
          {fx && <> · ao vivo: <b style={{ color: 'var(--lime)' }}>R$ {fx.rate.toFixed(4)}</b> ({fx.updatedAt})</>}
        </div>
        <div className="v lime num" style={{ fontSize: 30, fontWeight: 800, paddingBottom: 12 }}>{brl(data.salaryCents)}</div>
      </div>

      <div className="listcard">
        <div className="lh"><b>Receitas extras</b><span style={{ fontSize: 12, color: 'var(--muted)' }}>cadastro manual</span></div>
        {extras.length === 0 && <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 13 }}>Nenhuma receita extra neste mês.</div>}
        {extras.map((c) => (
          <div className="cat" key={c.id}>
            <div className="chip">{c.icon}</div>
            <div className="nm"><div className="t">{c.name}</div></div>
            <div className="rt"><div className="a num">{brl(c.realizadoCents)}</div></div>
          </div>
        ))}
        <div className="cat" style={{ justifyContent: 'space-between' }}>
          <b style={{ fontSize: 14 }}>Total de receitas</b>
          <b className="num lime" style={{ fontSize: 16, color: 'var(--lime)' }}>{brl(data.receitasCents)}</b>
        </div>
      </div>
    </>
  );
}
