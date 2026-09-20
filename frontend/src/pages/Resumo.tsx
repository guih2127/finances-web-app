import { useState } from 'react';
import { api, type Category } from '../lib/api';
import { brl, brlPlain } from '../lib/money';
import { useMonthState, useSummary } from '../lib/useSummary';
import { MonthNav } from '../components/MonthNav';
import { CreateCategoryModal } from '../components/CreateCategoryModal';
import { EditValueModal } from '../components/EditValueModal';
import { ConfirmModal } from '../components/ConfirmModal';

export function Resumo() {
  const [month, setMonth] = useMonthState();
  const { data, loading, reload } = useSummary(month);
  const [creatingCat, setCreatingCat] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  if (loading || !data) return <div className="loading">Carregando…</div>;

  const cards = data.categories.filter((c) => c.kind === 'card');
  const estourou = data.saldoCartaoCents < 0;

  // Despesas esperadas × atuais: só cartão + Pix (investimentos ficam de fora).
  const despesasAtuais = data.faturaCents + data.pixTotalCents;
  const despesasEsperadas = data.orcadoCartaoCents + data.pixTotalCents;
  const gastouMais = despesasAtuais > despesasEsperadas;

  // Investimentos: planejado (tudo do mês) × já aportado (marcados como feitos)
  const invCats = data.categories.filter((c) => c.kind === 'investment');
  const invPlanejado = invCats.reduce((a, c) => a + c.realizadoCents, 0);
  const invFeito = invCats.filter((c) => c.paid === true).reduce((a, c) => a + c.realizadoCents, 0);

  // Planejamento: tudo que você PLANEJA gastar (orçado cartão + pix + investimentos)
  // cabe nas receitas? sobra > 0 = sobra; < 0 = falta.
  const planejado = data.orcadoCartaoCents + data.pixTotalCents + data.investCents;
  const sobra = data.receitasCents - planejado;
  const temSobra = sobra >= 0;

  return (
    <>
      <div className="wtop">
        <h1>Resumo</h1>
        <MonthNav month={month} setMonth={setMonth} />
      </div>

      <div className="hgrid">
        <div className="mini">
          <div className="l">Receitas</div>
          <div className="v lime num">{brl(data.receitasCents)}</div>
          <div className="foot">salário {brl(data.salaryCents)} + extras {brl(data.incomeExtraCents)}</div>
        </div>

        <div className="mini">
          <div className="l">Despesas: esperadas × atuais <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· cartão + Pix</span></div>
          <div className="two">
            <div>
              <small>esperadas</small>
              <b className="num">{brl(despesasEsperadas)}</b>
            </div>
            <div>
              <small>atuais</small>
              <b className={`num ${gastouMais ? 'red' : 'lime'}`}>{brl(despesasAtuais)}</b>
            </div>
          </div>
          <div className="barmini">
            <i
              className={gastouMais ? 'over' : ''}
              style={{ width: `${Math.min(100, (despesasAtuais / (despesasEsperadas || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mini">
          <div className="l">{estourou ? 'Cartão · estourou o orçado' : 'Disponível no cartão'}</div>
          <div className={`v num ${estourou ? 'red' : 'lime'}`}>
            {estourou ? '-' : ''}{brl(Math.abs(data.saldoCartaoCents))}
          </div>
          <div className="foot">
            usado {brlPlain(data.faturaCents)} de {brlPlain(data.orcadoCartaoCents)} orçado
          </div>
          <div className="barmini">
            <i
              className={estourou ? 'over' : ''}
              style={{ width: `${Math.min(100, (data.faturaCents / (data.orcadoCartaoCents || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mini">
          <div className="l">Investimentos</div>
          <div className="two">
            <div>
              <small>planejado</small>
              <b className="num">{brl(invPlanejado)}</b>
            </div>
            <div>
              <small>aportado</small>
              <b className="num lime">{brl(invFeito)}</b>
            </div>
          </div>
          <div className="barmini">
            <i style={{ width: `${Math.min(100, (invFeito / (invPlanejado || 1)) * 100)}%` }} />
          </div>
        </div>

        <div className="mini span2">
          <div className="l">
            Planejamento do mês <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· cabe nas receitas?</span>
          </div>
          <div className="plan3">
            <div><small>receitas</small><b className="num lime">{brl(data.receitasCents)}</b></div>
            <div><small>planejado</small><b className="num">{brl(planejado)}</b></div>
            <div>
              <small>{temSobra ? 'sobra' : 'falta'}</small>
              <b className={`num ${temSobra ? 'lime' : 'red'}`}>{brl(Math.abs(sobra))}</b>
            </div>
          </div>
          <div className="foot">orçado cartão + Pix + investimentos = {brlPlain(planejado)}</div>
        </div>
      </div>

      <div className="listcard">
        <div className="lh"><b>Orçado × realizado — cartão</b><button onClick={() => setCreatingCat(true)}>＋ categoria</button></div>
        {cards.map((c) => {
          const pct = c.budgetCents ? (c.realizadoCents / c.budgetCents) * 100 : 0;
          const over = pct > 100;
          return (
            <div className="cat" key={c.id}>
              <div className="chip">{c.icon}</div>
              <div className="nm">
                <div className="t">{c.group ? `${c.group} · ${c.name}` : c.name}</div>
                <div className="s" style={over ? { color: 'var(--red)' } : undefined}>
                  {over ? `estourou ${(pct - 100).toFixed(1)}%` : `${pct.toFixed(0)}% do orçado`}
                </div>
              </div>
              <div className="rt">
                <div className="a num">{brl(c.realizadoCents)}</div>
                <button className="b num" onClick={() => setEditing(c)} title="editar orçado"
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  de {brlPlain(c.budgetCents)} ✎
                </button>
                <div className="prog"><i className={over ? 'over' : ''} style={{ width: `${Math.min(100, pct)}%` }} /></div>
              </div>
              <button className="del" onClick={() => setDeleting(c)} title="apagar categoria" aria-label="apagar categoria">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {creatingCat && (
        <CreateCategoryModal onClose={() => setCreatingCat(false)} onSaved={() => reload()} />
      )}
      {editing && (
        <EditValueModal
          title={editing.group ? `${editing.group} · ${editing.name}` : editing.name}
          label="Orçamento mensal"
          icon={editing.icon}
          initialCents={editing.budgetCents}
          onClose={() => setEditing(null)}
          onSave={async (cents) => { await api.patchCategory(editing.id, { budgetCents: cents }); reload(); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Apagar "${deleting.name}"?`}
          message="A categoria some das telas e para de vir todo mês. Os lançamentos antigos são mantidos. Some de todos os meses, não só deste."
          confirmLabel="Apagar categoria"
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await api.patchCategory(deleting.id, { active: false }); reload(); }}
        />
      )}
    </>
  );
}
