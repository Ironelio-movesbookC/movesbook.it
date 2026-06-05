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
  'saleMaxNumber'
]);

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
  if (daysRecursion !== '') {
    if (!INTEGER_PATTERN.test(daysRecursion)) {
      errors.daysRecursion = 'Numbers only.';
    } else {
      const value = Number(daysRecursion);
      if (value < 1 || value > 99) {
        errors.daysRecursion = 'Range is 1 - 99, number only';
      }
    }
  }

  const saleMaxNumber = form.saleMaxNumber.trim();
  if (saleMaxNumber !== '') {
    if (!INTEGER_PATTERN.test(saleMaxNumber)) {
      errors.saleMaxNumber = 'Numbers only.';
    } else {
      const value = Number(saleMaxNumber);
      if (value < 1 || value > 999) {
        errors.saleMaxNumber = 'Range of Max accesses is from 1 to 999';
      }
    }
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
              : field === 'saleMaxNumber'
                ? form.saleMaxNumber.trim() !== ''
                : false;

    if (showAlways && (hasValue || touched[field])) {
      if (allErrors[field]) picked[field] = allErrors[field];
    } else if (touched[field] && allErrors[field]) {
      picked[field] = allErrors[field];
    }
  }

  return picked;
}
