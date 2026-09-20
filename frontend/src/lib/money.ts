// Dinheiro é SEMPRE armazenado/trafegado em centavos (inteiro).
// Estas funções cuidam da exibição em R$ com centavos, formato brasileiro.

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 176959 -> "R$ 1.769,59" */
export function brl(cents: number): string {
  return fmt.format((cents ?? 0) / 100);
}

/** 176959 -> "1.769,59" (sem o símbolo) */
export function brlPlain(cents: number): string {
  return fmt.format((cents ?? 0) / 100).replace(/^R\$\s?/, '');
}

/** "1.769,59" ou "1769.59" -> 176959 (centavos) */
export function parseBrlToCents(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Math.round(Number(clean) * 100);
}
