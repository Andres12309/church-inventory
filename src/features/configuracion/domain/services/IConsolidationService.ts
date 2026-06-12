export interface IConsolidationService {
  consolidarNodo(orgId: string): Promise<void>;
  consolidarTodoElArbol(): Promise<void>;
}
