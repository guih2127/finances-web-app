import { useState } from 'react';
import { brlPlain, parseBrlToCents } from '../lib/money';

/**
 * Modal pra editar um valor em R$ (orçado, valor de conta, etc.).
 * Opcionalmente mostra o toggle "vem todo mês" e a ação de apagar
 * (com confirmação inline) — assim a lista fica limpa no mobile.
 */
export function EditValueModal({
  title,
  label,
  icon,
  initialCents,
  recurringInitial,
  onClose,
  onSave,
  onDelete,
  deleteMessage,
}: {
  title: string;
  label: string;
  icon?: string | null;
  initialCents: number;
  /** Se definido, mostra o toggle "vem todo mês" e devolve o estado no onSave. */
  recurringInitial?: boolean;
  onClose: () => void;
  onSave: (cents: number, recurring?: boolean) => void | Promise<void>;
  /** Se definido, mostra o botão apagar (com confirmação dentro do modal). */
  onDelete?: () => void | Promise<void>;
  deleteMessage?: string;
}) {
  const [value, setValue] = useState(brlPlain(initialCents));
  const [recurring, setRecurring] = useState(recurringInitial ?? false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    const cents = parseBrlToCents(value);
    if (Number.isNaN(cents)) return;
    setSaving(true);
    try {
      await onSave(cents, recurringInitial === undefined ? undefined : recurring);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <span className="chip" style={{ width: 34, height: 34, fontSize: 17 }}>{icon}</span>}
          {title}
        </h3>

        {confirmingDelete ? (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5 }}>
              {deleteMessage ?? 'Tem certeza que quer apagar?'}
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmingDelete(false)}>Voltar</button>
              <button className="btn-danger" onClick={doDelete} disabled={deleting}>
                {deleting ? '…' : 'Apagar'}
              </button>
            </div>
          </>
        ) : (
          <>
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

            {recurringInitial !== undefined && (
              <div className="field switch-field">
                <div>
                  <div className="sf-t">Vem todo mês</div>
                  <div className="sf-s">lançada automaticamente todo mês</div>
                </div>
                <button
                  type="button"
                  className={`switch ${recurring ? 'on' : ''}`}
                  role="switch"
                  aria-checked={recurring}
                  onClick={() => setRecurring((v) => !v)}
                >
                  <span />
                </button>
              </div>
            )}

            <div className="modal-actions" style={onDelete ? { justifyContent: 'space-between' } : undefined}>
              {onDelete && (
                <button className="btn-del-link" onClick={() => setConfirmingDelete(true)}>Apagar</button>
              )}
              <span style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={onClose}>Cancelar</button>
                <button className="btn-lime" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
