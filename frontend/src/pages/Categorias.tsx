import { useCallback, useEffect, useState } from 'react';
import { api, type Category } from '../lib/api';
import { brl } from '../lib/money';
import { CreateCategoryModal } from '../components/CreateCategoryModal';
import { EditValueModal } from '../components/EditValueModal';
import { ConfirmModal } from '../components/ConfirmModal';

const GROUPS: { kind: Category['kind']; label: string }[] = [
  { kind: 'card', label: 'Cartão' },
  { kind: 'pix', label: 'Pix / contas' },
  { kind: 'investment', label: 'Investimentos' },
  { kind: 'income', label: 'Receitas' },
];

export function Categorias() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.categories().then((c) => { setCats(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleRecurring(c: Category) {
    const on = !c.recurring;
    setCats((prev) => prev.map((x) => (x.id === c.id ? { ...x, recurring: on } : x)));
    await api.patchCategory(c.id, { recurring: on });
  }

  if (loading) return <div className="loading">Carregando…</div>;

  return (
    <>
      <div className="wtop">
        <h1>Categorias</h1>
        <button className="btn-lime" onClick={() => setCreating(true)}>＋ nova categoria</button>
      </div>

      <div className="listcard">
        {GROUPS.map(({ kind, label }) => {
          const list = cats.filter((c) => c.kind === kind);
          if (list.length === 0) return null;
          return (
            <div key={kind}>
              <div className="cat-group-title">{label}</div>
              {list.map((c) => (
                <div className="cat" key={c.id}>
                  <div className="chip">{c.icon}</div>
                  <div className="nm">
                    <div className="t">{c.group ? `${c.group} · ${c.name}` : c.name}</div>
                    <div className="s">{c.recurring ? 'vem todo mês' : 'avulsa'}</div>
                  </div>
                  <button className="b num" onClick={() => setEditing(c)} title="editar valor"
                    style={{ background: 'none', border: 'none', color: 'var(--txt)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                    {brl(c.budgetCents)} ✎
                  </button>
                  <div>
                    <button className={`switch ${c.recurring ? 'on' : ''}`} role="switch" aria-checked={c.recurring}
                      title="vem todo mês" onClick={() => toggleRecurring(c)}><span /></button>
                    <div className="recur-lbl">todo mês</div>
                  </div>
                  <button className="del" onClick={() => setDeleting(c)} title="apagar" aria-label="apagar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {creating && <CreateCategoryModal onClose={() => setCreating(false)} onSaved={() => load()} />}
      {editing && (
        <EditValueModal
          title={editing.group ? `${editing.group} · ${editing.name}` : editing.name}
          label="Valor padrão / orçamento"
          icon={editing.icon}
          initialCents={editing.budgetCents}
          onClose={() => setEditing(null)}
          onSave={async (cents) => { await api.patchCategory(editing.id, { budgetCents: cents }); load(); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Apagar "${deleting.name}"?`}
          message="A categoria some das telas e para de vir todo mês. Os lançamentos antigos são mantidos."
          confirmLabel="Apagar categoria"
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await api.patchCategory(deleting.id, { active: false }); load(); }}
        />
      )}
    </>
  );
}
