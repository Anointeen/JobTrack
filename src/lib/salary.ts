import { OTHER_CURRENCY_CODE, SalaryPeriod } from '../types';

/**
 * Salary formatting and validation.
 *
 * Two shapes exist in the database and both have to render:
 *
 *   current  salary_amount + salary_currency + salary_period  (migration 0003)
 *   legacy   salary_min / salary_max, with no currency at all (migration 0001)
 *
 * The legacy pair is rendered exactly as it always was — unlabelled. Stamping
 * "USD" onto it would be inventing a fact that was never recorded, which is the
 * same mistake the old hard-coded "$/yr" form label made. A legacy row is
 * converted to the current shape only when its owner next saves it.
 *
 * No currency conversion happens anywhere in this file, deliberately. See
 * `SALARY_COMPARISON_LIMITATION` at the bottom.
 */

/** The subset of an application this module needs. */
export interface SalaryFields {
  salary_amount?: number | null;
  salary_currency?: string | null;
  salary_period?: SalaryPeriod | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

const PERIOD_LABEL: Record<SalaryPeriod, string> = {
  year: 'year',
  month: 'month'
};

const isSet = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Renders one figure with its currency and period, e.g. `USD 80,000 / year` or
 * `NGN 500,000 / month`.
 *
 * The *Other* currency is stored as ISO 4217's XXX ("no currency"), so printing
 * the code back would be meaningless to the user. That case prints the bare
 * amount instead.
 */
export const formatSalaryFigure = (
  amount: number,
  currency: string | null | undefined,
  period: SalaryPeriod | null | undefined
): string => {
  const code = currency && currency !== OTHER_CURRENCY_CODE ? `${currency} ` : '';
  const suffix = period ? ` / ${PERIOD_LABEL[period]}` : '';
  return `${code}${formatAmount(amount)}${suffix}`;
};

/**
 * The single salary string shown anywhere in the UI. Returns the caller's
 * `emptyText` when the application records no salary at all.
 */
export const formatSalary = (
  application: SalaryFields | null | undefined,
  emptyText = 'Not specified'
): string => {
  if (!application) return emptyText;

  const { salary_amount, salary_currency, salary_period } = application;
  if (isSet(salary_amount)) {
    return formatSalaryFigure(salary_amount, salary_currency, salary_period);
  }

  // Legacy rows: rendered as the unlabelled range they actually are.
  const { salary_min: min, salary_max: max } = application;
  if (isSet(min) && isSet(max)) return `${formatAmount(min)} - ${formatAmount(max)} / year`;
  if (isSet(min)) return `From ${formatAmount(min)} / year`;
  if (isSet(max)) return `Up to ${formatAmount(max)} / year`;

  return emptyText;
};

/** True when the row still carries a pre-0003 salary and no current one. */
export const hasLegacySalary = (application: SalaryFields | null | undefined): boolean => {
  if (!application) return false;
  if (isSet(application.salary_amount)) return false;
  return isSet(application.salary_min) || isSet(application.salary_max);
};

export interface SalaryDraft {
  /** Raw text straight from the amount input. */
  amount: string;
  currency: string;
  period: SalaryPeriod | '';
}

export interface SalaryValidation {
  error?: string;
  /** Present only when the draft is valid. */
  value?: {
    salary_amount: number | null;
    salary_currency: string | null;
    salary_period: SalaryPeriod | null;
  };
}

/**
 * Validates the salary portion of the application form.
 *
 * Salary is optional, so an empty amount is valid and clears all three columns.
 * Currency and period are only required once an amount has been entered — which
 * is exactly the rule applications_salary_amount_is_labelled_check enforces in
 * the database, mirrored here so the user reads a sentence instead of a raw
 * PostgreSQL 23514.
 */
export const validateSalaryDraft = (draft: SalaryDraft): SalaryValidation => {
  const raw = draft.amount.trim();

  if (!raw) {
    return { value: { salary_amount: null, salary_currency: null, salary_period: null } };
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return { error: 'Salary must be a number.' };
  }
  if (amount < 0) {
    return { error: 'Salary cannot be negative.' };
  }
  if (!draft.currency) {
    return { error: 'Choose a currency for this salary.' };
  }
  if (!draft.period) {
    return { error: 'Choose whether this salary is per year or per month.' };
  }

  return {
    value: {
      salary_amount: amount,
      salary_currency: draft.currency,
      salary_period: draft.period
    }
  };
};

/**
 * Why salary is not sortable or filterable.
 *
 * Ordering NGN 500,000 against USD 80,000 requires an exchange rate. JobTrack
 * holds none, and inventing one — or worse, comparing the raw numbers — would
 * produce an ordering that looks authoritative and is wrong. Sorting and
 * filtering therefore ignore salary entirely, exactly as they did before
 * migration 0003; this constant exists so that limitation is stated in the code
 * rather than only in a document.
 */
export const SALARY_COMPARISON_LIMITATION =
  'Salaries are recorded in the currency you choose and are never converted, ' +
  'so applications cannot be sorted or filtered by salary.';
