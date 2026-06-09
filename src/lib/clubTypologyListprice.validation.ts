import type { TypologyListpriceForm } from '@/lib/clubTypologyListprice';

const INTEGER_PATTERN = /^\d+$/;

/** Allows empty, complete decimals, or trailing dot while typing. */
export function isDecimalInputValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return /^\d+(\.\d+)?$/.test(trimmed) || /^\d+\.$/.test(trimmed);
}

export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function getRelatedListpriceFields(field: string): string[] {
  if (field === 'cost' || field === 'firstCostInstallnment') {
    return ['cost', 'firstCostInstallnment'];
  }
  return [field];
}

export const LISTPRICE_REALTIME_FIELDS = new Set([
  'cost',
  'firstCostInstallnment',
  'installnment',
  'daysRecursion',
  'saleNumberAccess',
  'saleRelatedDays',
  'saleMaxNumber'
]);

function validateIntegerField(
  value: string,
  range?: { min: number; max: number; message: string }
): string | undefined {
  if (value === '') return undefined;
  if (!INTEGER_PATTERN.test(value)) return 'Numbers only.';
  if (range) {
    const numeric = Number(value);
    if (numeric < range.min || numeric > range.max) return range.message;
  }
  return undefined;
}

export function validateListpriceForm(form: TypologyListpriceForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.typologyId) errors.typologyId = 'Please select a typology.';
  if (!form.subscriptionName.trim()) errors.subscriptionName = 'Please enter the subscription name.';
  if (form.searchKeyword.length > 5) errors.searchKeyword = 'Max 5 characters.';

  const cost = form.cost.trim();
  const firstCost = form.firstCostInstallnment.trim();

  if (cost !== '' && !isDecimalInputValid(cost)) {
    errors.cost = 'Numbers only.';
  }
  if (firstCost !== '' && !isDecimalInputValid(firstCost)) {
    errors.firstCostInstallnment = 'Numbers only.';
  }

  if (
    cost !== '' &&
    firstCost !== '' &&
    /^\d+(\.\d+)?$/.test(cost) &&
    /^\d+(\.\d+)?$/.test(firstCost)
  ) {
    const costNum = Number(cost);
    const firstNum = Number(firstCost);
    if (firstNum > costNum) {
      errors.firstCostInstallnment =
        'You cannot pay the 1th installment more the the total cost !';
      errors.cost = 'Cost >= 1st installment cost !';
    }
  }

  const installnment = form.installnment.trim();
  if (installnment !== '') {
    if (!INTEGER_PATTERN.test(installnment)) {
      errors.installnment = 'Numbers only.';
    } else {
      const value = Number(installnment);
      if (value < 1 || value > 9) {
        errors.installnment = 'Should be number selector 1 - 9';
      }
    }
  }

  const daysRecursion = form.daysRecursion.trim();
  const daysRecursionError = validateIntegerField(daysRecursion, {
    min: 1,
    max: 99,
    message: 'Range is 1 - 99, number only'
  });
  if (daysRecursionError) errors.daysRecursion = daysRecursionError;

  if (form.saleNumberAccessStatus) {
    const saleNumberAccess = form.saleNumberAccess.trim();
    const saleNumberAccessError = validateIntegerField(saleNumberAccess, {
      min: 1,
      max: 999,
      message: 'Range of Number of accesses is from 1 to 999'
    });
    if (saleNumberAccessError) errors.saleNumberAccess = saleNumberAccessError;

    const saleRelatedDays = form.saleRelatedDays.trim();
    const saleRelatedDaysError = validateIntegerField(saleRelatedDays, {
      min: 1,
      max: 99,
      message: 'Range is 1 - 99, number only'
    });
    if (saleRelatedDaysError) errors.saleRelatedDays = saleRelatedDaysError;
  }

  const saleMaxNumber = form.saleMaxNumber.trim();
  if (form.saleMaxNumberStatus && saleMaxNumber !== '') {
    const saleMaxNumberError = validateIntegerField(saleMaxNumber, {
      min: 1,
      max: 999,
      message: 'Range of Max accesses is from 1 to 999'
    });
    if (saleMaxNumberError) errors.saleMaxNumber = saleMaxNumberError;
  }

  return errors;
}

export function pickListpriceFieldErrors(
  form: TypologyListpriceForm,
  fields: string[],
  touched: Record<string, boolean>
): Record<string, string> {
  const allErrors = validateListpriceForm(form);
  const picked: Record<string, string> = {};

  for (const field of fields) {
    const showAlways = LISTPRICE_REALTIME_FIELDS.has(field);
    const hasValue =
      field === 'cost'
        ? form.cost.trim() !== ''
        : field === 'firstCostInstallnment'
          ? form.firstCostInstallnment.trim() !== ''
          : field === 'installnment'
            ? form.installnment.trim() !== ''
            : field === 'daysRecursion'
              ? form.daysRecursion.trim() !== ''
              : field === 'saleNumberAccess'
                ? form.saleNumberAccessStatus && form.saleNumberAccess.trim() !== ''
                : field === 'saleRelatedDays'
                  ? form.saleNumberAccessStatus && form.saleRelatedDays.trim() !== ''
                  : field === 'saleMaxNumber'
                    ? form.saleMaxNumberStatus && form.saleMaxNumber.trim() !== ''
                    : false;

    if (showAlways && (hasValue || touched[field])) {
      if (allErrors[field]) picked[field] = allErrors[field];
    } else if (touched[field] && allErrors[field]) {
      picked[field] = allErrors[field];
    }
  }

  return picked;
}
