import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Category, type Transaction } from '../lib/api';
import { brlPlain, parseBrlToCents } from '../lib/money';
import { monthLabel } from '../lib/useSummary';
import { CreateCategoryModal } from './CreateCategoryModal';

const KINDS: { key: Category['kind']; label: string }[] = [
  { key: 'card', label: 'Cartão' },
  { key: 'pix', label: 'Pix / conta' },
  { key: 'income', label: 'Receita' },
  { key: 'investment', label: 'Investimento' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const SYS_MONTH = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const TODAY = `${SYS_MONTH}-${pad(now.getDate())}`;
// Mês padrão em que a pessoa está trabalhando (salvo no localStorage).
const workingMonth = () => localStorage.getItem('finance:month') || SYS_MONTH;

export function AddTransactionModal({ onClose, onSaved, edit }: {
  onClose: () => void; onSaved: () => void; edit?: Transaction;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [kind, setKind] = useState<Category['kind']>(edit?.kind ?? 'card');
  const [categoryId, setCategoryId] = useState<number | ''>(edit?.categoryId ?? '');
  const [month, setMonth] = useState(edit?.month ?? workingMonth()); // competência (mês da fatura)
  const [date, setDate] = useState(edit ? edit.date.slice(0, 10) : TODAY); // data real da compra
  const [amount, setAmount] = useState(edit ? brlPlain(edit.amountCents) : '');
  const [description, setDescription] = useState(edit?.description ?? '');
  const [paid, setPaid] = useState(edit?.paid ?? true);
  const [saving, setSaving] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);

  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  const loadCats = useCallback(() => api.categories().then(setCats), []);
  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { api.transactionNames().then(setNameSuggestions).catch(() => {}); }, []);

  const filtered = useMemo(() => cats.filter((c) => c.kind === kind), [cats, kind]);

  // Opções de mês da fatura: de 15 meses atrás a 6 à frente.
  const monthOpts = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = -15; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      opts.push({ value: v, label: monthLabel(v) });
    }
    return opts;
  }, []);

  // Ao trocar de tipo, seleciona a primeira categoria — mas mantém a seleção
  // atual se ela ainda for válida (preserva a categoria ao editar e a recém-criada).
  // Não faz nada enquanto as categorias ainda não carregaram (lista vazia).
  useEffect(() => {
    if (filtered.length === 0) return;
    setCategoryId((cur) => (filtered.some((c) => c.id === cur) ? cur : filtered[0].id));
  }, [filtered]);

  async function save() {
    const amountCents = parseBrlToCents(amount);
    if (!categoryId || !amountCents) return;
    setSaving(true);
    try {
      const body = { categoryId, date, month, amountCents, description, paid };
      if (edit) await api.patchTransaction(edit.id, body);
      else await api.addTransaction(body);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{edit ? 'Editar lançamento' : 'Novo lançamento'}</h3>

        <div className="seg-kind">
          {KINDS.map((k) => (
            <button key={k.key} className={kind === k.key ? 'on' : ''} onClick={() => setKind(k.key)}>{k.label}</button>
          ))}
        </div>

        <div className="field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Categoria</span>
            <button
              onClick={() => setCreatingCat(true)}
              style={{ background: 'none', border: 'none', color: 'var(--lime)', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit' }}
            >
              ＋ nova categoria
            </button>
          </label>
          <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            {filtered.length === 0 && <option value="">— nenhuma categoria desse tipo —</option>}
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.group ? `${c.group} · ${c.name}` : c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Mês da fatura</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="field row2">
          <div>
            <label>Valor (R$)</label>
            <input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div>
            <label>Data da compra</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Nome da compra</label>
          <input
            list="nomes-compra"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: iFood, Uber, Mercado…"
          />
          <datalist id="nomes-compra">
            {nameSuggestions.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        {kind === 'pix' && (
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              Já está paga
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-lime" onClick={save} disabled={saving || !categoryId || !amount}>
            {saving ? 'Salvando…' : edit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>

      {creatingCat && (
        <CreateCategoryModal
          onClose={() => setCreatingCat(false)}
          onSaved={async (id, newKind) => {
            setKind(newKind);
            await loadCats();
            setCategoryId(id);
          }}
        />
      )}
    </div>
  );
}
