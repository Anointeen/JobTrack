import { describe, it, expect } from 'vitest';
import {
  formatSalary,
  formatSalaryFigure,
  hasLegacySalary,
  validateSalaryDraft
} from './salary';
import { OTHER_CURRENCY_CODE } from '../types';

/**
 * Salary is stored as amount + currency + period (migration 0003), and the
 * pre-0003 salary_min/salary_max pair still exists on older rows. Both shapes
 * have to render, and neither may be silently relabelled as the other.
 */

describe('formatSalaryFigure', () => {
  it('renders the currency the user chose, not a hard-coded dollar', () => {
    expect(formatSalaryFigure(80000, 'USD', 'year')).toBe('USD 80,000 / year');
    expect(formatSalaryFigure(500000, 'NGN', 'month')).toBe('NGN 500,000 / month');
    expect(formatSalaryFigure(65000, 'GBP', 'year')).toBe('GBP 65,000 / year');
    expect(formatSalaryFigure(72000, 'EUR', 'year')).toBe('EUR 72,000 / year');
    expect(formatSalaryFigure(110000, 'CAD', 'year')).toBe('CAD 110,000 / year');
    expect(formatSalaryFigure(9500, 'AUD', 'month')).toBe('AUD 9,500 / month');
  });

  it('never converts between currencies', () => {
    // The same number in two currencies must render as the same number.
    expect(formatSalaryFigure(80000, 'USD', 'year')).toContain('80,000');
    expect(formatSalaryFigure(80000, 'NGN', 'year')).toContain('80,000');
  });

  it('omits the code for the Other currency, which has no meaningful code', () => {
    expect(formatSalaryFigure(1200, OTHER_CURRENCY_CODE, 'month')).toBe('1,200 / month');
  });
});

describe('formatSalary', () => {
  it('uses the stored currency and period', () => {
    expect(formatSalary({ salary_amount: 500000, salary_currency: 'NGN', salary_period: 'month' }))
      .toBe('NGN 500,000 / month');
  });

  it('reports no salary when none is recorded', () => {
    expect(formatSalary({})).toBe('Not specified');
    expect(formatSalary(null)).toBe('Not specified');
    expect(formatSalary({ salary_amount: null }, '—')).toBe('—');
  });

  it('treats zero as a real amount rather than as absent', () => {
    expect(formatSalary({ salary_amount: 0, salary_currency: 'USD', salary_period: 'year' }))
      .toBe('USD 0 / year');
  });

  it('still renders a pre-0003 row, without inventing a currency for it', () => {
    const legacy = { salary_min: 140000, salary_max: 180000 };
    expect(formatSalary(legacy)).toBe('140,000 - 180,000 / year');
    expect(formatSalary(legacy)).not.toMatch(/USD|\$/);

    expect(formatSalary({ salary_min: 90000 })).toBe('From 90,000 / year');
    expect(formatSalary({ salary_max: 90000 })).toBe('Up to 90,000 / year');
  });

  it('prefers the current shape when a row carries both', () => {
    expect(formatSalary({
      salary_amount: 95000, salary_currency: 'GBP', salary_period: 'year',
      salary_min: 140000, salary_max: 180000
    })).toBe('GBP 95,000 / year');
  });
});

describe('hasLegacySalary', () => {
  it('identifies rows that still hold only the pre-0003 pair', () => {
    expect(hasLegacySalary({ salary_min: 140000, salary_max: 180000 })).toBe(true);
    expect(hasLegacySalary({ salary_max: 180000 })).toBe(true);
    expect(hasLegacySalary({ salary_amount: 100, salary_min: 140000 })).toBe(false);
    expect(hasLegacySalary({})).toBe(false);
    expect(hasLegacySalary(null)).toBe(false);
  });
});

describe('validateSalaryDraft', () => {
  it('accepts an empty amount, because salary is optional', () => {
    const result = validateSalaryDraft({ amount: '   ', currency: 'USD', period: 'year' });
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      salary_amount: null, salary_currency: null, salary_period: null
    });
  });

  it('clears all three columns when the amount is cleared', () => {
    // Explicit nulls, not undefined: undefined keys are dropped before reaching
    // PostgREST, so an update would leave the old salary in place.
    const { value } = validateSalaryDraft({ amount: '', currency: 'NGN', period: 'month' });
    expect(value).toEqual({ salary_amount: null, salary_currency: null, salary_period: null });
  });

  it('rejects a negative amount', () => {
    expect(validateSalaryDraft({ amount: '-1', currency: 'USD', period: 'year' }).error)
      .toMatch(/negative/i);
  });

  it('rejects a non-numeric amount', () => {
    expect(validateSalaryDraft({ amount: 'lots', currency: 'USD', period: 'year' }).error)
      .toMatch(/must be a number/i);
  });

  it('requires a currency and a period only once an amount is entered', () => {
    expect(validateSalaryDraft({ amount: '80000', currency: '', period: 'year' }).error)
      .toMatch(/currency/i);
    expect(validateSalaryDraft({ amount: '80000', currency: 'USD', period: '' }).error)
      .toMatch(/per year or per month/i);
    // ...and not when there is no amount.
    expect(validateSalaryDraft({ amount: '', currency: '', period: '' }).error).toBeUndefined();
  });

  it('accepts zero and decimal amounts', () => {
    expect(validateSalaryDraft({ amount: '0', currency: 'USD', period: 'year' }).value)
      .toEqual({ salary_amount: 0, salary_currency: 'USD', salary_period: 'year' });
    expect(validateSalaryDraft({ amount: '1234.56', currency: 'EUR', period: 'month' }).value)
      .toEqual({ salary_amount: 1234.56, salary_currency: 'EUR', salary_period: 'month' });
  });

  it('keeps each currency independent of the others', () => {
    const usd = validateSalaryDraft({ amount: '80000', currency: 'USD', period: 'year' }).value;
    const ngn = validateSalaryDraft({ amount: '500000', currency: 'NGN', period: 'month' }).value;
    expect(usd).toEqual({ salary_amount: 80000, salary_currency: 'USD', salary_period: 'year' });
    expect(ngn).toEqual({ salary_amount: 500000, salary_currency: 'NGN', salary_period: 'month' });
  });
});
