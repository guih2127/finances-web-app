import { useState } from 'react';
import { api, type Category } from '../lib/api';
import { parseBrlToCents } from '../lib/money';

const KINDS: { key: Category['kind']; label: string }[] = [
  { key: 'card', label: 'Cartão' },
  { key: 'pix', label: 'Pix / conta' },
  { key: 'income', label: 'Receita' },
  { key: 'investment', label: 'Investimento' },
];

const COLORS = ['#c6f24e', '#7bd0ff', '#ffb168', '#c98bff', '#ff8fa3', '#5ee0b0', '#f4d35e'];
const ICONS = ['💸', '🛒', '🍔', '🎮', '🐾', '⛽', '💈', '🏠', '💡', '🩺', '📈', '✈️', '🎁', '📱', '🏋️', '🍿'];

export function CreateCategoryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: number, kind: Category['kind']) => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [kind, setKind] = useState<Category['kind']>('card');
  const [budget, setBudget] = useState('');
  const [icon, setIcon] = useState('💸');
  const [color, setColor] = useState(COLORS[0]);
  const [recurring, setRecurring] = useState(false);
  const [recurringTouched, setRecurringTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cartão (orçamento mensal), Pix e investimento normalmente vêm todo mês →
  // sugere recorrência por padrão; receita extra é avulsa. Respeita se o usuário mexeu.
  const suggestRecurring = kind !== 'income';
  const isRecurring = recurringTouched ? recurring : suggestRecurring;

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { id } = await api.addCategory({
        name: name.trim(),
        group: group.trim() || null,
        kind,
        budgetCents: parseBrlToCents(budget) || 0,
        icon,
        color,
        recurring: isRecurring,
      });
      onSaved(id, kind);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nova categoria</h3>

        <div className="seg-kind">
          {KINDS.map((k) => (
            <button key={k.key} className={kind === k.key ? 'on' : ''} onClick={() => setKind(k.key)}>{k.label}</button>
          ))}
        </div>

        <div className="field row2">
          <div>
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Presentes" autoFocus />
          </div>
          <div>
            <label>Grupo (opcional)</label>
            <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="ex: Diversão" />
          </div>
        </div>

        <div className="field">
          <label>{kind === 'income' ? 'Meta (opcional)' : 'Orçamento mensal (R$)'}</label>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
        </div>

        <div className="field">
          <label>Ícone</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  fontSize: 18, width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
                  background: icon === ic ? 'var(--card2)' : 'var(--bg)',
                  border: `1px solid ${icon === ic ? 'var(--lime)' : 'var(--line)'}`,
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Cor</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: 8, cursor: 'pointer', background: c,
                  border: color === c ? '2px solid #fff' : '2px solid transparent',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={isRecurring}
              onChange={(e) => { setRecurringTouched(true); setRecurring(e.target.checked); }}
            />
            Repetir todo mês (vem no início do mês)
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-lime" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Salvando…' : 'Criar categoria'}
          </button>
        </div>
      </div>
    </div>
  );
}
