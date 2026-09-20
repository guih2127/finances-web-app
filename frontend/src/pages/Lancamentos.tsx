import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Category, type Transaction } from '../lib/api';
import { brl } from '../lib/money';
import { useMonthState } from '../lib/useSummary';
import { MonthNav } from '../components/MonthNav';
import { AddTransactionModal } from '../components/AddTransactionModal';

function catLabel(c: Category): string {
  return c.group ? `${c.group} · ${c.name}` : c.name;
}

// Dropdown de filtro customizado (no tema), no lugar do <select> nativo.
function FilterDropdown({ value, cats, onChange }: {
  value: string; cats: Category[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const sel = cats.find((c) => String(c.id) === value);
  const current = value === 'card' ? '💳 Todas do cartão' : sel ? `${sel.icon} ${catLabel(sel)}` : 'Selecionar';

  function pick(v: string) { onChange(v); setOpen(false); }

  return (
    <div className="filterdd" ref={ref}>
      <button className="filterdd-btn" onClick={() => setOpen((v) => !v)}>
        <span className="filterdd-cur">{current}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="filterdd-pop">
          <button className={value === 'card' ? 'on' : ''} onClick={() => pick('card')}>💳 Todas do cartão</button>
          <div className="filterdd-sep">Por categoria</div>
          {cats.map((c) => (
            <button key={c.id} className={value === String(c.id) ? 'on' : ''} onClick={() => pick(String(c.id))}>
              <span>{c.icon}</span> {catLabel(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function Lancamentos() {
  const [month, setMonth] = useMonthState();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string>('card'); // 'card' = todas do cartão | ou id da categoria
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.transactions(month), api.categories()]).then(([t, c]) => {
      setTxs(t);
      setCats(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('tx-changed', load);
    return () => window.removeEventListener('tx-changed', load);
  }, [load]);

  async function remove(t: Transaction) {
    setTxs((prev) => prev.filter((x) => x.id !== t.id));
    await api.deleteTransaction(t.id);
  }

  if (loading) return <div className="loading">Carregando…</div>;

  const shown = filter === 'card'
    ? txs.filter((t) => t.kind === 'card')
    : txs.filter((t) => t.categoryId === Number(filter));
  const total = shown.reduce((a, t) => a + t.amountCents, 0);

  return (
    <>
      <div className="wtop">
        <h1>Lançamentos</h1>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="lanc-bar">
        <FilterDropdown value={filter} cats={cats} onChange={setFilter} />
        <span className="lanc-total">{shown.length} lançamento{shown.length === 1 ? '' : 's'} · <b>{brl(total)}</b></span>
      </div>

      <div className="listcard">
        {shown.length === 0 && (
          <div style={{ padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>Nenhum lançamento aqui neste mês.</div>
        )}
        {shown.map((t) => (
          <div className="cat clickable" key={t.id} onClick={() => setEditing(t)} title="editar lançamento">
            <div className="chip">{t.icon}</div>
            <div className="nm">
              <div className="t">{t.description || t.categoryName}</div>
              <div className="s">{t.categoryName} · {fmtDate(t.date)}</div>
            </div>
            <div className="rt"><div className="a num">{brl(t.amountCents)}</div></div>
            <button className="del" onClick={(e) => { e.stopPropagation(); remove(t); }} title="apagar" aria-label="apagar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <AddTransactionModal
          edit={editing}
          onClose={() => setEditing(null)}
          onSaved={() => window.dispatchEvent(new Event('tx-changed'))}
        />
      )}
    </>
  );
}
