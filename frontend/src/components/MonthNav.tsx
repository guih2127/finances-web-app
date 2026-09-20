import { useEffect, useRef, useState } from 'react';
import { monthLabel, shiftMonth } from '../lib/useSummary';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function MonthNav({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [selYear, selMonth] = month.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selYear);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Ao abrir, mostra o ano do mês selecionado.
  useEffect(() => { if (open) setViewYear(selYear); }, [open, selYear]);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function pick(m: number) {
    setMonth(`${viewYear}-${String(m).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <div className="month" ref={wrapRef}>
      <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="mês anterior">‹</button>
      <button className="month-label" onClick={() => setOpen((v) => !v)} title="escolher mês">{monthLabel(month)}</button>
      <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="próximo mês">›</button>

      {open && (
        <div className="month-pop">
          <div className="yr">
            <button onClick={() => setViewYear((y) => y - 1)} aria-label="ano anterior">‹</button>
            <b>{viewYear}</b>
            <button onClick={() => setViewYear((y) => y + 1)} aria-label="próximo ano">›</button>
          </div>
          <div className="grid">
            {MESES.map((nome, i) => {
              const m = i + 1;
              const isSel = viewYear === selYear && m === selMonth;
              return (
                <button key={nome} className={isSel ? 'on' : ''} onClick={() => pick(m)}>{nome}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
