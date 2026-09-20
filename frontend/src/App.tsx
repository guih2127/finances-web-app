import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Resumo } from './pages/Resumo';
import { Lancamentos } from './pages/Lancamentos';
import { Contas } from './pages/Contas';
import { Receitas } from './pages/Receitas';
import { Investimentos } from './pages/Investimentos';
import { Categorias } from './pages/Categorias';
import { AddTransactionModal } from './components/AddTransactionModal';

function Sidebar({ onAdd }: { onAdd: () => void }) {
  const item = (to: string, icon: string, label: string) => (
    <NavLink to={to} end className={({ isActive }) => (isActive ? 'on' : '')}>
      <span className="i">{icon}</span> <span className="lbl">{label}</span>
    </NavLink>
  );
  return (
    <aside className="sidebar">
      <div className="logo"><span className="mark">$</span> Finanças</div>
      <nav className="navi">
        {item('/', '📊', 'Resumo')}
        {item('/lancamentos', '🧾', 'Lançamentos')}
        {item('/contas', '🔔', 'Contas')}
        {/* botão central de adicionar — só aparece no bottom bar mobile */}
        <div className="nav-create"><button onClick={onAdd} aria-label="novo lançamento">+</button></div>
        {item('/receitas', '💵', 'Receitas')}
        {item('/investimentos', '📈', 'Investimentos')}
        {item('/categorias', '🏷️', 'Categorias')}
      </nav>
      <div className="side-foot">
        <div className="t">Feito pra você 🌱</div>
        <div className="s">Controle mensal, orçado × realizado, tudo em R$.</div>
      </div>
    </aside>
  );
}

export function App() {
  const [adding, setAdding] = useState(false);
  return (
    <div className="shell">
      <Sidebar onAdd={() => setAdding(true)} />
      <main className="content">
        <Routes>
          <Route path="/" element={<Resumo />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/receitas" element={<Receitas />} />
          <Route path="/investimentos" element={<Investimentos />} />
          <Route path="/categorias" element={<Categorias />} />
        </Routes>
      </main>

      <button className="fab" onClick={() => setAdding(true)} aria-label="novo lançamento">+</button>
      {adding && (
        <AddTransactionModal
          onClose={() => setAdding(false)}
          onSaved={() => window.dispatchEvent(new Event('tx-changed'))}
        />
      )}
    </div>
  );
}
