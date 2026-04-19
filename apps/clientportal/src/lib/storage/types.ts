import type { Workbook } from '../data/schema';

export type Unsubscribe = () => void;

export interface Storage {
  getWorkbook(id: string): Promise<Workbook | null>;
  saveWorkbook(w: Workbook): Promise<void>;
  listWorkbooks(userId: string): Promise<Workbook[]>;
  deleteWorkbook(id: string): Promise<void>;
  subscribe(id: string, handler: (w: Workbook) => void): Unsubscribe;
}
