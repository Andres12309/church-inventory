export const FinanzaNaturaleza = {
  INGRESO: 'ingreso',
  EGRESO: 'egreso',
} as const;

export type FinanzaNaturalezaValue = (typeof FinanzaNaturaleza)[keyof typeof FinanzaNaturaleza];

export type FinanzaFiltroNaturaleza = FinanzaNaturalezaValue | 'todos';

export function esFinanzaNaturaleza(value: string): value is FinanzaNaturalezaValue {
  return value === FinanzaNaturaleza.INGRESO || value === FinanzaNaturaleza.EGRESO;
}

export function etiquetaNaturaleza(naturaleza: FinanzaNaturalezaValue): string {
  return naturaleza === FinanzaNaturaleza.EGRESO ? 'Gasto' : 'Ingreso';
}

export function etiquetaNaturalezaPlural(naturaleza: FinanzaNaturalezaValue): string {
  return naturaleza === FinanzaNaturaleza.EGRESO ? 'Gastos' : 'Ingresos';
}
