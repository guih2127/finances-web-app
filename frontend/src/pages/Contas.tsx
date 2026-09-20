import { useCallback, useEffect, useState } from 'react';
import { api, type Transaction } from '../lib/api';
import { brl } from '../lib/money';
import { useMonthState } from '../lib/useSummary';
import { MonthNav } from '../components/MonthNav';
import { EditValueModal } from '../components/EditValueModal';

export function Contas() {
  const [month, setMonth] = useMonthState();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.transactions(month).then((t) => {
      setTxs(t.filter((x) => x.kind === 'pix'));
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

  const total = txs.reduce((a, t) => a + t.amountCents, 0);
  const pago = txs.filter((t) => t.paid).reduce((a, t) => a + t.amountCents, 0);
  const falta = total - pago;
  const pagas = txs.filter((t) => t.paid);
  const aPagar = txs.filter((t) => !t.paid);

  return (
    <>
      <div className="wtop">
        <h1>Contas a pagar</h1>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="hgrid">
        <div className="mini"><div className="l">Total do mês</div><div className="v num">{brl(total)}</div></div>
        <div className="side2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="mini"><div className="l">Já pago</div><div className="v lime num">{brl(pago)}</div></div>
          <div className="mini"><div className="l">Falta pagar</div><div className="v num">{brl(falta)}</div></div>
        </div>
      </div>

      <Section title={`A pagar (${aPagar.length})`} txs={aPagar} onToggle={toggle} onEdit={setEditing} />
      <Section title={`Pagas (${pagas.length})`} txs={pagas} onToggle={toggle} onEdit={setEditing} />

      {editing && (
        <EditValueModal
          title={editing.categoryName ?? 'Conta'}
          label="Valor da conta"
          icon={editing.icon}
          initialCents={editing.amountCents}
          onClose={() => setEditing(null)}
          onSave={(cents) => saveAmount(editing, cents)}
        />
      )}
    </>
  );
}

function Section({
  title, txs, onToggle, onEdit,
}: {
  title: string; txs: Transaction[]; onToggle: (t: Transaction) => void; onEdit: (t: Transaction) => void;
}) {
  if (!txs.length) return null;
  return (
    <div className="listcard">
      <div className="lh"><b>{title}</b></div>
      {txs.map((t) => (
        <div className="cat" key={t.id}>
          <div className="nm"><div className="t" style={t.paid ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}>{t.categoryName}</div></div>
          <div className="rt">
            <button className="a num" onClick={() => onEdit(t)} title="editar valor"
              style={{ background: 'none', border: 'none', color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}>
              {brl(t.amountCents)} ✎
            </button>
          </div>
          <button className={`check ${t.paid ? 'on' : ''}`} onClick={() => onToggle(t)}
            title={t.paid ? 'pago — desmarcar' : 'marcar como pago'} aria-label={t.paid ? 'pago' : 'marcar como pago'} aria-pressed={t.paid}>
            ✓
          </button>
        </div>
      ))}
    </div>
  );
}
