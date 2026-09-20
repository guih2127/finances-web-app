import { useCallback, useEffect, useState } from 'react';
import { api, type Category } from '../lib/api';
import { brl } from '../lib/money';
import { CreateCategoryModal } from '../components/CreateCategoryModal';
import { EditValueModal } from '../components/EditValueModal';

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

  const load = useCallback(() => {
    setLoading(true);
    api.categories().then((c) => { setCats(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

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
                <div className="cat clickable" key={c.id} onClick={() => setEditing(c)} title="editar categoria">
                  <div className="nm">
                    <div className="t">{c.group ? `${c.group} · ${c.name}` : c.name}</div>
                    <div className="s">{c.recurring ? 'vem todo mês' : 'avulsa'}</div>
                  </div>
                  <div className="rt">
                    <div className="a num">{brl(c.budgetCents)}</div>
                    <div className="b">editar ✎</div>
                  </div>
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
          recurringInitial={editing.recurring ?? false}
          onClose={() => setEditing(null)}
          onSave={async (cents, recurring) => { await api.patchCategory(editing.id, { budgetCents: cents, recurring }); load(); }}
          onDelete={async () => { await api.patchCategory(editing.id, { active: false }); load(); }}
          deleteMessage="A categoria some das telas e para de vir todo mês. Os lançamentos antigos são mantidos."
        />
      )}
    </>
  );
}
