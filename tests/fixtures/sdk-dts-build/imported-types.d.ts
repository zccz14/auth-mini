export interface BaseImportedSessionSummary {
  created_at: string;
}

export interface ImportedSessionSummary extends BaseImportedSessionSummary {
  id: string;
}

export type GenericBox<T> = {
  value: T;
  list: T[];
};
