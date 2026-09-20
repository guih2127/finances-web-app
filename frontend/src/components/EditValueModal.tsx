import { useState } from 'react';
import { brlPlain, parseBrlToCents } from '../lib/money';

/** Modal enxuto pra editar um valor em R$ (orçado, valor de conta, etc.). */
export function EditValueModal({
  title,
  label,
  icon,
  initialCents,
  onClose,
  onSave,
}: {
  title: string;
  label: string;
  icon?: string | null;
  initialCents: number;
  onClose: () => void;
  onSave: (cents: number) => void | Promise<void>;
}) {
  const [value, setValue] = useState(brlPlain(initialCents));
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = parseBrlToCents(value);
    if (!cents) return;
    setSaving(true);
    try {
      await onSave(cents);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <span className="chip" style={{ width: 34, height: 34, fontSize: 17 }}>{icon}</span>}
          {title}
        </h3>
        <div className="field">
          <label>{label}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 15, fontWeight: 600 }}>R$</span>
            <input
              inputMode="decimal"
              value={value}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              style={{ fontSize: 18, fontWeight: 700 }}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-lime" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
