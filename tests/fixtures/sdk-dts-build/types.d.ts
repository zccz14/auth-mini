import type {
  GenericBox as ImportedGenericBox,
  ImportedSessionSummary,
} from './imported-types.js';

export type UsesImportedInterface = ImportedSessionSummary;

export type UsesImportedGeneric = ImportedGenericBox<string>;
