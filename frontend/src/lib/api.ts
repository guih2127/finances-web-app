// Cliente da API. Mesma origem (o backend serve a SPA); em dev o Vite faz proxy de /api.

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface Category {
  id: number;
  group: string | null;
  name: string;
  kind: 'card' | 'pix' | 'income' | 'investment';
  icon: string;
  color: string;
  budgetCents: number;
  realizadoCents: number;
  paid: boolean | null;
  recurring?: boolean;
}

export interface Summary {
  month: string;
  receitasCents: number;
  despesasCents: number;
  salaryCents: number;
  salaryUsdCents: number;
  salaryFeeUsdCents: number;
  usdRate: number;
  incomeExtraCents: number;
  faturaCents: number;
  orcadoCartaoCents: number;
  saldoCartaoCents: number;
  cardLimitCents: number;
  pixTotalCents: number;
  pixPagoCents: number;
  pixFaltaCents: number;
  investCents: number;
  categories: Category[];
}

export interface Transaction {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  kind: 'card' | 'pix' | 'income' | 'investment' | null;
  icon: string | null;
  date: string;
  month: string;
  amountCents: number;
  description: string;
  paid: boolean;
}

export const api = {
  summary: (month: string) => req<Summary>(`/summary?month=${month}`),
  categories: () => req<Category[]>(`/categories`),
  transactions: (month: string) => req<Transaction[]>(`/transactions?month=${month}`),
  transactionNames: (categoryId?: number) =>
    req<string[]>(`/transactions/names${categoryId ? `?categoryId=${categoryId}` : ''}`),
  deleteTransaction: (id: number) =>
    req<{ ok: true }>(`/transactions/${id}`, { method: 'DELETE' }),
  fx: () => req<{ rate: number; updatedAt: string }>(`/fx`),
  addTransaction: (body: Record<string, unknown>) =>
    req<{ id: number }>(`/transactions`, { method: 'POST', body: JSON.stringify(body) }),
  patchTransaction: (id: number, body: Record<string, unknown>) =>
    req<{ ok: true }>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addCategory: (body: Record<string, unknown>) =>
    req<{ id: number }>(`/categories`, { method: 'POST', body: JSON.stringify(body) }),
  patchCategory: (id: number, body: Record<string, unknown>) =>
    req<{ ok: true }>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
