import type { FieldViolationCode } from '@/shared/api/generated/models/fieldViolationCode';
import type { ProblemCode } from '@/shared/api/generated/models/problemCode';
import en from './locales/en.json';
import fr from './locales/fr.json';

type LocaleResource = typeof en & {
  errors: {
    problem: Record<ProblemCode, string>;
    validation: Record<FieldViolationCode, string>;
  };
};

const enResource: LocaleResource = en;
const frResource: LocaleResource = fr;

/** Bundled English and French catalogs with matching structures. */
export const resources = {
  en: { translation: enResource },
  fr: { translation: frResource },
} as const;
