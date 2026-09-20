import { useCallback, useEffect, useState } from 'react';
import { api, type Transaction } from '../lib/api';
import { brl } from '../lib/money';
import { useMonthState } from '../lib/useSummary';
import { MonthNav } from '../components/MonthNav';
import { EditValueModal } from '../components/EditValueModal';

export function Investimentos() {
  const [month, setMonth] = useMonthState();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.transactions(month).then((t) => {
      setTxs(t.filter((x) => x.kind === 'investment'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('tx-changed', load);
    return () => window.removeEventListener('tx-changed', load);
  }, [load]);

  async function toggle(t: Transaction) {
    setTxs((prev) => prev.map((x) => (x.id === t.id ? { ...x, paid: !x.paid } : x)));
    await api.patchTransaction(t.id, { paid: !t.paid });
  }
  async function saveAmount(t: Transaction, amountCents: number) {
    setTxs((prev) => prev.map((x) => (x.id === t.id ? { ...x, amountCents } : x)));
    await api.patchTransaction(t.id, { amountCents });
  }

  if (loading) return <div className="loading">Carregando…</div>;

  const planejado = txs.reduce((a, t) => a + t.amountCents, 0);
  const feito = txs.filter((t) => t.paid).reduce((a, t) => a + t.amountCents, 0);

  return (
    <>
      <div className="wtop">
        <h1>Investimentos</h1>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="hgrid">
        <div className="mini"><div className="l">Planejado no mês</div><div className="v num">{brl(planejado)}</div></div>
        <div className="mini"><div className="l">Já aportado</div><div className="v lime num">{brl(feito)}</div></div>
      </div>

      <div className="listcard">
        <div className="lh"><b>Aportes do mês</b></div>
        {txs.length === 0 && <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 13 }}>Nenhum investimento configurado.</div>}
        {txs.map((t) => (
          <div className="cat" key={t.id}>
            <div className="chip">{t.icon}</div>
            <div className="nm">
              <div className="t" style={t.paid ? { color: 'var(--muted)' } : undefined}>{t.categoryName}</div>
            </div>
            <div className="rt">
              <button className="a num" onClick={() => setEditing(t)} title="editar valor"
                style={{ background: 'none', border: 'none', color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}>
                {brl(t.amountCents)} ✎
              </button>
            </div>
            <button className={t.paid ? 'pill-pago' : 'pill-pagar'} onClick={() => toggle(t)}>
              {t.paid ? '✓ feito' : 'marcar feito'}
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <EditValueModal
          title={editing.categoryName ?? 'Investimento'}
          label="Valor do aporte"
          icon={editing.icon}
          initialCents={editing.amountCents}
          onClose={() => setEditing(null)}
          onSave={(cents) => saveAmount(editing, cents)}
        />
      )}
    </>
  );
}
