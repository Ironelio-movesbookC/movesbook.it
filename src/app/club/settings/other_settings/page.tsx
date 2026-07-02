'use client';

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  FolderOpen,
  ImagePlus,
  Loader2,
  MapPin,
  Monitor,
  Percent,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  Timer,
  WalletCards,
  X
} from 'lucide-react';

type OtherSettings = {
  clubName: string;
  passport: string;
  city: string;
  zip: string;
  areaCode: string;
  formPayDeadlineStatus: string;
  operatorPassStatus: string;
  calTaxStatus: boolean;
  tax: string;
  printTaxDetailStatus: boolean;
  pathSoundName: string;
  pathMessageAlert: string;
  durationDefault: string;
  dateFixedValue: string;
  modeRenewal: string;
  costValue: string;
  calCostAuto: boolean;
  installmentDefault: string;
  disableMembership: boolean;
  printInDocument: string;
  documentLogo1: string;
  documentLogo2: string;
  documentType: string;
  numberCopies: string;
  rate: string;
  notEnterCustData: boolean;
  badgeFedaration: boolean;
  enableHeader: string;
  primaryHeading: string;
  primaryAddress: string;
  primaryCity: string;
  primaryVat: string;
  secondaryHeading: string;
  secondaryAddress: string;
  secondaryCity: string;
  secondaryVat: string;
  taxReceiptModule: string;
  invoiceModule: string;
  simpleReceiptModule: string;
  taxReceipt: string;
  invoice: string;
  simpleReceipt: string;
  autoContractCounter: boolean;
  autoWithSubscription: boolean;
  contractStatus: string;
  contractTermText: string;
  previewPrint: boolean;
  changeHeader: boolean;
  renewalDay: string;
  renewalSession: string;
  retrodationDay: string;
  closingTime: boolean;
  closingTimeStartStatus1: boolean;
  closingTimeStart1: string;
  closingTimeEnd1: string;
  closingTimeStartStatus2: boolean;
  closingTimeStart2: string;
  closingTimeEnd2: string;
  closingTimeStartStatus3: boolean;
  closingTimeStart3: string;
  closingTimeEnd3: string;
  recoverLostDay: boolean;
  totalDaySub: string;
  allowMultipleSubscription: boolean;
  suspensionUpdateStatus: boolean;
  magneticCard: string;
  chipCard: string;
  rfidCard: string;
  rfidBracelet: string;
  genericSession: string;
  statusBar: boolean;
  quickToolbar: boolean;
  printToolbar: boolean;
  enableAssistant: boolean;
};

type FormErrors = Record<string, string>;
type ConfirmAction = 'reset' | 'save' | 'exit';

const API_PATH = '/api/club/settings/other-settings';
const LOGO_UPLOAD_PATH = '/api/club/settings/other-settings/logo';

const DEFAULT_SETTINGS: OtherSettings = {
  clubName: '',
  passport: '',
  city: '',
  zip: '',
  areaCode: '',
  formPayDeadlineStatus: 'Yes',
  operatorPassStatus: 'No',
  calTaxStatus: true,
  tax: '',
  printTaxDetailStatus: false,
  pathSoundName: '',
  pathMessageAlert: '',
  durationDefault: 'one year',
  dateFixedValue: '',
  modeRenewal: 'until_exp_membership',
  costValue: '',
  calCostAuto: false,
  installmentDefault: '1',
  disableMembership: false,
  printInDocument: 'Y',
  documentLogo1: '',
  documentLogo2: '',
  documentType: 'Tax receipt',
  numberCopies: '1',
  rate: '',
  notEnterCustData: false,
  badgeFedaration: false,
  enableHeader: 'primary',
  primaryHeading: '',
  primaryAddress: '',
  primaryCity: '',
  primaryVat: '',
  secondaryHeading: '',
  secondaryAddress: '',
  secondaryCity: '',
  secondaryVat: '',
  taxReceiptModule: 'Standard',
  invoiceModule: 'Standard',
  simpleReceiptModule: '',
  taxReceipt: '',
  invoice: '',
  simpleReceipt: '',
  autoContractCounter: false,
  autoWithSubscription: false,
  contractStatus: '',
  contractTermText: '',
  previewPrint: false,
  changeHeader: false,
  renewalDay: '',
  renewalSession: '',
  retrodationDay: '',
  closingTime: false,
  closingTimeStartStatus1: false,
  closingTimeStart1: '',
  closingTimeEnd1: '',
  closingTimeStartStatus2: false,
  closingTimeStart2: '',
  closingTimeEnd2: '',
  closingTimeStartStatus3: false,
  closingTimeStart3: '',
  closingTimeEnd3: '',
  recoverLostDay: false,
  totalDaySub: '',
  allowMultipleSubscription: false,
  suspensionUpdateStatus: false,
  magneticCard: '',
  chipCard: '',
  rfidCard: '',
  rfidBracelet: '',
  genericSession: '',
  statusBar: false,
  quickToolbar: false,
  printToolbar: false,
  enableAssistant: false
};

const inputClass = 'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const yesNoOptions = ['Yes', 'No'];
const documentTypes = ['Simple receipt', 'Tax receipt', 'Invoice'];
const moduleTypes = ['', 'Standard', 'Customized for this club', 'Other modules customized'];

function normalizeSettings(value: unknown): OtherSettings {
  const source = value && typeof value === 'object' ? value as Partial<OtherSettings> : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    calTaxStatus: Boolean(source.calTaxStatus),
    printTaxDetailStatus: Boolean(source.printTaxDetailStatus),
    calCostAuto: Boolean(source.calCostAuto),
    disableMembership: Boolean(source.disableMembership),
    notEnterCustData: Boolean(source.notEnterCustData),
    badgeFedaration: Boolean(source.badgeFedaration),
    autoContractCounter: Boolean(source.autoContractCounter),
    autoWithSubscription: Boolean(source.autoWithSubscription),
    previewPrint: Boolean(source.previewPrint),
    changeHeader: Boolean(source.changeHeader),
    closingTime: Boolean(source.closingTime),
    closingTimeStartStatus1: Boolean(source.closingTimeStartStatus1),
    closingTimeStartStatus2: Boolean(source.closingTimeStartStatus2),
    closingTimeStartStatus3: Boolean(source.closingTimeStartStatus3),
    recoverLostDay: Boolean(source.recoverLostDay),
    allowMultipleSubscription: Boolean(source.allowMultipleSubscription),
    suspensionUpdateStatus: Boolean(source.suspensionUpdateStatus),
    statusBar: Boolean(source.statusBar),
    quickToolbar: Boolean(source.quickToolbar),
    printToolbar: Boolean(source.printToolbar),
    enableAssistant: Boolean(source.enableAssistant)
  };
}

function sameSettings(a: OtherSettings, b: OtherSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getLogoPreviewUrl(value: string) {
  const logo = value.trim();
  if (!logo) return '';
  if (logo.startsWith('/') || logo.startsWith('http') || logo.startsWith('data:') || logo.startsWith('blob:')) {
    return logo;
  }
  return `/img/document_logo/${encodeURIComponent(logo)}`;
}

const closingDatePairs = [
  { label: 'Closing time 1', start: 'closingTimeStart1', end: 'closingTimeEnd1' },
  { label: 'Closing time 2', start: 'closingTimeStart2', end: 'closingTimeEnd2' },
  { label: 'Closing time 3', start: 'closingTimeStart3', end: 'closingTimeEnd3' }
] as const;

const dependentErrorFields: Record<string, string[]> = {
  closingTimeStart1: ['closingTimeEnd1'],
  closingTimeStart2: ['closingTimeEnd2'],
  closingTimeStart3: ['closingTimeEnd3']
};

function getComparableDateKey(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;

  const legacy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (legacy) return `${legacy[3]}${legacy[2]}${legacy[1]}`;

  return '';
}

function validateClosingDates(settings: OtherSettings, nextErrors: FormErrors) {
  for (const pair of closingDatePairs) {
    const start = settings[pair.start].trim();
    const end = settings[pair.end].trim();

    if (!start) {
      continue;
    }

    if (!end) {
      nextErrors[pair.end] = `Please select end date for ${pair.label}.`;
      continue;
    }

    const startKey = getComparableDateKey(start);
    const endKey = getComparableDateKey(end);
    if (startKey && endKey && endKey <= startKey) {
      nextErrors[pair.end] = `End date must be later than start date for ${pair.label}.`;
    }
  }
}

function validateSettingsForSave(settings: OtherSettings): FormErrors {
  const nextErrors: FormErrors = {};
  const hasLetter = /[a-zA-Z]/;
  const clubName = settings.clubName.trim();
  const city = settings.city.trim();

  if (!clubName) {
    nextErrors.clubName = 'Please enter club name.';
  } else if (!hasLetter.test(clubName)) {
    nextErrors.clubName = 'Please enter valid club name.';
  }

  if (!city) {
    nextErrors.city = 'Please enter city name.';
  } else if (!hasLetter.test(city)) {
    nextErrors.city = 'Please enter valid city name.';
  }

  const soundName = settings.pathSoundName.trim();
  if (soundName && !soundName.toLowerCase().endsWith('.mp3')) {
    nextErrors.pathSoundName = 'Please enter only .mp3 extension file for Path sounds.';
  }

  const installments = settings.installmentDefault.trim();
  const installmentValue = Number(installments);
  if (!installments || !Number.isInteger(installmentValue) || installmentValue < 1 || installmentValue > 3) {
    nextErrors.installmentDefault = 'Please enter valid value number for Installments default (1 to 3).';
  }

  validateClosingDates(settings, nextErrors);

  return nextErrors;
}

export default function OtherSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<OtherSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<OtherSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const soundFileInputRef = useRef<HTMLInputElement | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const isDirty = useMemo(() => !sameSettings(settings, savedSettings), [settings, savedSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch(API_PATH, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error('Unable to load other settings.');
        }

        const data = await response.json();
        const next = normalizeSettings(data.settings);
        if (!cancelled) {
          setSettings(next);
          setSavedSettings(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load other settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const registerField = (field: string) => (node: HTMLElement | null) => {
    fieldRefs.current[field] = node;
  };

  const clearFieldError = (field: string, relatedFields: string[] = []) => {
    setErrors((current) => {
      const fields = [field, ...relatedFields];
      if (!fields.some((fieldName) => current[fieldName])) return current;
      const next = { ...current };
      for (const fieldName of fields) {
        delete next[fieldName];
      }
      return next;
    });
  };

  const scrollToField = (field: string) => {
    window.setTimeout(() => {
      const target = fieldRefs.current[field];
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')?.focus({
        preventScroll: true
      });
    }, 80);
  };

  const applyErrors = (nextErrors: FormErrors) => {
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (firstField) scrollToField(firstField);
    return Boolean(firstField);
  };

  const fieldClass = (field: string, className: string) =>
    `${className} ${errors[field] ? 'border-red-500 ring-1 ring-red-500' : ''}`;

  const updateField = <K extends keyof OtherSettings>(key: K, value: OtherSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    const field = String(key);
    clearFieldError(field, dependentErrorFields[field] ?? []);
    setSuccess(null);
  };

  const resetCounter = (key: 'taxReceipt' | 'invoice' | 'simpleReceipt' | 'contractStatus') => {
    updateField(key, '');
  };

  const updateInstallmentDefault = (value: string) => {
    updateField('installmentDefault', value);
  };

  const openSoundFilePicker = () => {
    soundFileInputRef.current?.click();
  };

  const handleSoundFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setSuccess(null);
      setError(null);
      applyErrors({ pathSoundName: 'Please enter only .mp3 extension file for Path sounds.' });
      event.target.value = '';
      return;
    }

    clearFieldError('pathSoundName');
    setError(null);
    updateField('pathSoundName', file.name);
    event.target.value = '';
  };

  const requestSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || loading || saving) {
      return;
    }
    setConfirmAction('save');
  };

  const resetSettings = () => {
    setSettings(savedSettings);
    setErrors({});
    setError(null);
    setSuccess(null);
  };

  const saveSettings = async () => {
    const nextErrors = validateSettingsForSave(settings);
    if (applyErrors(nextErrors)) {
      setSuccess(null);
      setError(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          applyErrors(data.fieldErrors);
          return;
        }
        throw new Error(data?.error || 'Unable to save other settings.');
      }

      const next = normalizeSettings(data.settings);
      setErrors({});
      setSettings(next);
      setSavedSettings(next);
      setSuccess('Other settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save other settings.');
    } finally {
      setSaving(false);
    }
  };

  const confirmSelectedAction = async () => {
    const action = confirmAction;
    if (!action) {
      return;
    }

    setConfirmAction(null);

    if (action === 'reset') {
      resetSettings();
      return;
    }

    if (action === 'exit') {
      router.push('/club/dashboard');
      return;
    }

    await saveSettings();
  };

  return (
    <form onSubmit={requestSave} className="min-h-full bg-gray-50 p-4 lg:p-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:-mt-6 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Club&apos;s management / General settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950">Other settings</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              disabled={!isDirty || loading || saving}
              onClick={() => setConfirmAction('reset')}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || loading || saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmAction('exit')}
              className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading other settings
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Section title="Defaults" accent="bg-purple-600" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Licensed to">
                <TextField
                  label="Name of the club"
                  value={settings.clubName}
                  error={errors.clubName}
                  fieldRef={registerField('clubName')}
                  onChange={(value) => updateField('clubName', value)}
                />
              </Panel>
              <Panel title="Passport out">
                <TextField label="Passport" value={settings.passport} onChange={(value) => updateField('passport', value)} />
              </Panel>
            </div>

            <Panel title="Locality" icon={<MapPin className="h-4 w-4" />}>
              <div className="grid gap-3 md:grid-cols-3">
                <TextField
                  label="City"
                  value={settings.city}
                  error={errors.city}
                  fieldRef={registerField('city')}
                  onChange={(value) => updateField('city', value)}
                />
                <TextField label="Zip" value={settings.zip} onChange={(value) => updateField('zip', value)} />
                <TextField label="Area code" value={settings.areaCode} onChange={(value) => updateField('areaCode', value)} />
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Management of payments" icon={<CreditCard className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Payment deadlines form" value={settings.formPayDeadlineStatus} options={yesNoOptions} onChange={(value) => updateField('formPayDeadlineStatus', value)} />
                  <SelectField label="Password for the operator" value={settings.operatorPassStatus} options={yesNoOptions} onChange={(value) => updateField('operatorPassStatus', value)} />
                </div>
              </Panel>
              <Panel title="Tax settings" icon={<Percent className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr] md:items-end">
                  <CheckboxField label="Enable calc of tax" checked={settings.calTaxStatus} onChange={(value) => updateField('calTaxStatus', value)} />
                  <TextField label="% Tax" type="number" min={0} step="any" value={settings.tax} onChange={(value) => updateField('tax', value)} />
                  <CheckboxField label="Print tax detail" checked={settings.printTaxDetailStatus} onChange={(value) => updateField('printTaxDetailStatus', value)} />
                </div>
              </Panel>
            </div>

            <Panel title="Paths" icon={<FolderOpen className="h-4 w-4" />}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div ref={registerField('pathSoundName')}>
                  <span className={labelClass}>Path sounds</span>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      value={settings.pathSoundName}
                      onChange={(event) => updateField('pathSoundName', event.target.value)}
                      className={fieldClass('pathSoundName', inputClass)}
                    />
                    <button
                      type="button"
                      onClick={openSoundFilePicker}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Search
                    </button>
                  </div>
                  <input
                    ref={soundFileInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg"
                    onChange={handleSoundFileSelect}
                    className="hidden"
                    aria-label="Select path sound audio file"
                  />
                  <FieldError message={errors.pathSoundName} />
                </div>
                <TextField label="Path messages of alerts" value={settings.pathMessageAlert} onChange={(value) => updateField('pathMessageAlert', value)} />
              </div>
            </Panel>
          </Section>

          <Section title="Membership" accent="bg-violet-400" icon={<BadgeCheck className="h-4 w-4" />}>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
              <div className="space-y-4">
                <Panel title="Duration default">
                  <RadioField label="One year" name="durationDefault" checked={settings.durationDefault === 'one year'} onChange={() => updateField('durationDefault', 'one year')} />
                  <RadioField label="At the end of the year" name="durationDefault" checked={settings.durationDefault === 'at end of year'} onChange={() => updateField('durationDefault', 'at end of year')} />
                  <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                    <RadioField label="Date fixed" name="durationDefault" checked={settings.durationDefault === 'data_fixed'} onChange={() => updateField('durationDefault', 'data_fixed')} />
                    <TextField label="Fixed date" type="date" value={settings.dateFixedValue} onChange={(value) => updateField('dateFixedValue', value)} />
                  </div>
                </Panel>

                <Panel title="Cost (when dont set)">
                  <TextField label="Value" type="number" min={0} step="any" value={settings.costValue} onChange={(value) => updateField('costValue', value)} />
                </Panel>
              </div>

              <Panel title="Mode of renewal default">
                <RadioField label="Until expiring of the membership" name="modeRenewal" checked={settings.modeRenewal === 'until_exp_membership'} onChange={() => updateField('modeRenewal', 'until_exp_membership')} />
                <RadioField label="Until expiring of the subscription" name="modeRenewal" checked={settings.modeRenewal === 'until_exp_subscription'} onChange={() => updateField('modeRenewal', 'until_exp_subscription')} />
                <CheckboxField label="Calc of cost automatically" checked={settings.calCostAuto} onChange={(value) => updateField('calCostAuto', value)} />
                <TextField
                  label="Installments default (max 3)"
                  type="number"
                  min={1}
                  max={3}
                  step={1}
                  value={settings.installmentDefault}
                  error={errors.installmentDefault}
                  fieldRef={registerField('installmentDefault')}
                  onChange={updateInstallmentDefault}
                />
              </Panel>

              <Panel title="Membership switch">
                <CheckboxField label="Disable membership" checked={settings.disableMembership} onChange={(value) => updateField('disableMembership', value)} />
              </Panel>
            </div>
          </Section>

          <Section title="Documents" accent="bg-emerald-600" icon={<FileText className="h-4 w-4" />}>
            <Panel title="Printable documents">
              <div className="space-y-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <SelectField label="Document type" value={settings.documentType} options={documentTypes} onChange={(value) => updateField('documentType', value)} />
                  <TextField label="Number of copies" type="number" min={0} step={1} value={settings.numberCopies} onChange={(value) => updateField('numberCopies', value)} />
                  <TextField label="Rate" type="number" min={0} step="any" value={settings.rate} onChange={(value) => updateField('rate', value)} />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <CheckboxField label="Not enter the customer data in the document tax" checked={settings.notEnterCustData} onChange={(value) => updateField('notEnterCustData', value)} />
                  <CheckboxField label="Put code of badge federation and data expiring" checked={settings.badgeFedaration} onChange={(value) => updateField('badgeFedaration', value)} />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <LogoOption
                    label="Primary logo"
                    slot="documentLogo1"
                    checked={settings.printInDocument === 'Y'}
                    value={settings.documentLogo1}
                    wide
                    onChecked={() => updateField('printInDocument', 'Y')}
                    onChange={(value) => updateField('documentLogo1', value)}
                  />
                  <LogoOption
                    label="Secondary logo"
                    slot="documentLogo2"
                    checked={settings.printInDocument === 'N'}
                    value={settings.documentLogo2}
                    wide
                    onChecked={() => updateField('printInDocument', 'N')}
                    onChange={(value) => updateField('documentLogo2', value)}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Enable header">
              <SelectField label="Header set" value={settings.enableHeader} options={['primary', 'secondary']} onChange={(value) => updateField('enableHeader', value)} />
              <div className="mt-3 grid gap-4 xl:grid-cols-2">
                <HeaderFields
                  title="Primary"
                  heading={settings.primaryHeading}
                  address={settings.primaryAddress}
                  city={settings.primaryCity}
                  vat={settings.primaryVat}
                  onHeading={(value) => updateField('primaryHeading', value)}
                  onAddress={(value) => updateField('primaryAddress', value)}
                  onCity={(value) => updateField('primaryCity', value)}
                  onVat={(value) => updateField('primaryVat', value)}
                />
                <HeaderFields
                  title="Secondary"
                  heading={settings.secondaryHeading}
                  address={settings.secondaryAddress}
                  city={settings.secondaryCity}
                  vat={settings.secondaryVat}
                  onHeading={(value) => updateField('secondaryHeading', value)}
                  onAddress={(value) => updateField('secondaryAddress', value)}
                  onCity={(value) => updateField('secondaryCity', value)}
                  onVat={(value) => updateField('secondaryVat', value)}
                />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Panel title="Type of modules">
                <SelectField label="Tax receipt" value={settings.taxReceiptModule} options={moduleTypes} onChange={(value) => updateField('taxReceiptModule', value)} />
                <SelectField label="Invoice" value={settings.invoiceModule} options={moduleTypes} onChange={(value) => updateField('invoiceModule', value)} />
                <SelectField label="Simple receipt" value={settings.simpleReceiptModule} options={moduleTypes} onChange={(value) => updateField('simpleReceiptModule', value)} />
              </Panel>

              <Panel title="Counters" icon={<Receipt className="h-4 w-4" />}>
                <CounterField label="Tax receipt" value={settings.taxReceipt} onChange={(value) => updateField('taxReceipt', value)} onReset={() => resetCounter('taxReceipt')} />
                <CounterField label="Invoice" value={settings.invoice} onChange={(value) => updateField('invoice', value)} onReset={() => resetCounter('invoice')} />
                <CounterField label="Simple receipt" value={settings.simpleReceipt} onChange={(value) => updateField('simpleReceipt', value)} onReset={() => resetCounter('simpleReceipt')} />
                <CheckboxField label="Automatic contract counter" checked={settings.autoContractCounter} onChange={(value) => updateField('autoContractCounter', value)} />
                <CheckboxField label="Make contract automatically with the subscription" checked={settings.autoWithSubscription} onChange={(value) => updateField('autoWithSubscription', value)} />
                <CounterField label="Contract" value={settings.contractStatus} onChange={(value) => updateField('contractStatus', value)} onReset={() => resetCounter('contractStatus')} />
              </Panel>
            </div>

            <Panel title="Set text contract">
              <label>
                <span className={labelClass}>Terms</span>
                <textarea
                  value={settings.contractTermText}
                  onChange={(event) => updateField('contractTermText', event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </label>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <CheckboxField label="Preview before printing" checked={settings.previewPrint} onChange={(value) => updateField('previewPrint', value)} />
                <CheckboxField label="Allow header changes when printing the contract" checked={settings.changeHeader} onChange={(value) => updateField('changeHeader', value)} />
              </div>
            </Panel>
          </Section>

          <Section title="Subscriptions" accent="bg-orange-500" icon={<CalendarDays className="h-4 w-4" />}>
            <Panel title="Renewals" icon={<Timer className="h-4 w-4" />}>
              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Default</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Days" type="number" min={0} step={1} value={settings.renewalDay} onChange={(value) => updateField('renewalDay', value)} />
                    <TextField label="Sessions" type="number" min={0} step={1} value={settings.renewalSession} onChange={(value) => updateField('renewalSession', value)} />
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Retrodatation</h3>
                  <TextField label="Days" type="number" min={0} step={1} value={settings.retrodationDay} onChange={(value) => updateField('retrodationDay', value)} />
                </div>
              </div>
            </Panel>

            <Panel title="Closing times">
              <CheckboxField label="Enable closing times" checked={settings.closingTime} onChange={(value) => updateField('closingTime', value)} />
              <div className="mt-3 space-y-2">
                <ClosingRow
                  checked={settings.closingTimeStartStatus1}
                  start={settings.closingTimeStart1}
                  end={settings.closingTimeEnd1}
                  onChecked={(value) => updateField('closingTimeStartStatus1', value)}
                  onStart={(value) => updateField('closingTimeStart1', value)}
                  onEnd={(value) => updateField('closingTimeEnd1', value)}
                  endError={errors.closingTimeEnd1}
                  endRef={registerField('closingTimeEnd1')}
                />
                <ClosingRow
                  checked={settings.closingTimeStartStatus2}
                  start={settings.closingTimeStart2}
                  end={settings.closingTimeEnd2}
                  onChecked={(value) => updateField('closingTimeStartStatus2', value)}
                  onStart={(value) => updateField('closingTimeStart2', value)}
                  onEnd={(value) => updateField('closingTimeEnd2', value)}
                  endError={errors.closingTimeEnd2}
                  endRef={registerField('closingTimeEnd2')}
                />
                <ClosingRow
                  checked={settings.closingTimeStartStatus3}
                  start={settings.closingTimeStart3}
                  end={settings.closingTimeEnd3}
                  onChecked={(value) => updateField('closingTimeStartStatus3', value)}
                  onStart={(value) => updateField('closingTimeStart3', value)}
                  onEnd={(value) => updateField('closingTimeEnd3', value)}
                  endError={errors.closingTimeEnd3}
                  endRef={registerField('closingTimeEnd3')}
                />
              </div>
            </Panel>

            <Panel title="Suspension of the subscription" icon={<ShieldCheck className="h-4 w-4" />}>
              <CheckboxField label="Recover lost days for suspended subscriptions" checked={settings.recoverLostDay} onChange={(value) => updateField('recoverLostDay', value)} />
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_40px] md:items-end">
                <div className="text-sm font-medium text-gray-700">Default available suspension days for each subscription</div>
                <TextField label="Value" type="number" min={0} max={100} step="any" value={settings.totalDaySub} onChange={(value) => updateField('totalDaySub', value)} />
                <span className="pb-2 text-sm font-semibold text-gray-500">%</span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <CheckboxField label="Allow multiple suspensions in the same subscription" checked={settings.allowMultipleSubscription} onChange={(value) => updateField('allowMultipleSubscription', value)} />
                <CheckboxField label="Ask before updating the subscription end date" checked={settings.suspensionUpdateStatus} onChange={(value) => updateField('suspensionUpdateStatus', value)} />
              </div>
            </Panel>
          </Section>

          <Section title="Other settings" accent="bg-gray-700" icon={<Monitor className="h-4 w-4" />}>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
              <Panel title="Access devices" icon={<WalletCards className="h-4 w-4" />}>
                <TextField label="Magnetic card" type="number" min={0} step={1} value={settings.magneticCard} onChange={(value) => updateField('magneticCard', value)} />
                <TextField label="Chip card" type="number" min={0} step={1} value={settings.chipCard} onChange={(value) => updateField('chipCard', value)} />
                <TextField label="Rfid card" type="number" min={0} step={1} value={settings.rfidCard} onChange={(value) => updateField('rfidCard', value)} />
                <TextField label="Rfid bracelet" type="number" min={0} step={1} value={settings.rfidBracelet} onChange={(value) => updateField('rfidBracelet', value)} />
              </Panel>
              <Panel title="Sessions">
                <TextField label="Generic session" type="number" min={0} step={1} value={settings.genericSession} onChange={(value) => updateField('genericSession', value)} />
              </Panel>
              <Panel title="Interface">
                <CheckboxField label="Status bar" checked={settings.statusBar} onChange={(value) => updateField('statusBar', value)} />
                <CheckboxField label="Quick toolbar" checked={settings.quickToolbar} onChange={(value) => updateField('quickToolbar', value)} />
                <CheckboxField label="Print toolbar" checked={settings.printToolbar} onChange={(value) => updateField('printToolbar', value)} />
                <CheckboxField label="Enable assistant" checked={settings.enableAssistant} onChange={(value) => updateField('enableAssistant', value)} />
              </Panel>
            </div>
          </Section>
        </div>
      )}

      <ConfirmModal
        action={confirmAction}
        isDirty={isDirty}
        saving={saving}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmSelectedAction}
      />
    </form>
  );
}

function ConfirmModal({
  action,
  isDirty,
  saving,
  onCancel,
  onConfirm
}: {
  action: ConfirmAction | null;
  isDirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) {
    return null;
  }

  const copy = {
    reset: {
      title: 'Reset changes',
      message: 'Discard all unsaved edits and restore the last saved other settings?',
      confirmLabel: 'Reset',
      tone: 'danger'
    },
    save: {
      title: 'Save changes',
      message: 'Save these other settings now?',
      confirmLabel: 'Save',
      tone: 'primary'
    },
    exit: {
      title: 'Exit page',
      message: isDirty
        ? 'Leave this page and discard your unsaved other settings changes?'
        : 'Leave this page and return to the club dashboard?',
      confirmLabel: 'Exit',
      tone: 'danger'
    }
  }[action];

  const confirmClass =
    copy.tone === 'primary'
      ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
      : 'border-red-600 bg-red-600 text-white hover:bg-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="other-settings-confirm-title">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="other-settings-confirm-title" className="text-base font-semibold text-gray-950">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{copy.message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Cancel confirmation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving && action === 'save'}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {saving && action === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  icon,
  children
}: {
  title: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
      <div className={`${accent} flex items-center gap-2 px-4 py-2 text-sm font-bold text-white`}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Panel({
  title,
  icon,
  children
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <legend className="ml-1 flex items-center gap-1.5 px-2 text-sm font-semibold text-gray-900">
        {icon}
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  type = 'text',
  min,
  max,
  step,
  error,
  fieldRef,
  onChange
}: {
  label: string;
  value: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
  error?: string;
  fieldRef?: (node: HTMLElement | null) => void;
  onChange: (value: string) => void;
}) {
  return (
    <label ref={fieldRef} className="block">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      />
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message, compact = false }: { message?: string; compact?: boolean }) {
  if (!message) return null;
  return (
    <p className={`${compact ? 'mt-1 text-[11px]' : 'mt-1 text-xs'} font-medium text-red-600`}>
      {message}
    </p>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option || 'empty'} value={option}>
            {option || 'Select option'}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 items-center gap-2 text-sm font-medium text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-gray-900"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioField({
  label,
  name,
  checked,
  onChange
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-8 items-center gap-2 text-sm font-medium text-gray-700">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-gray-900"
      />
      <span>{label}</span>
    </label>
  );
}

function LogoOption({
  label,
  slot,
  checked,
  value,
  wide = false,
  onChecked,
  onChange
}: {
  label: string;
  slot: 'documentLogo1' | 'documentLogo2';
  checked: boolean;
  value: string;
  wide?: boolean;
  onChecked: () => void;
  onChange: (value: string) => void;
}) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const storedPreview = getLogoPreviewUrl(value);
  const previewSrc = preview?.url || storedPreview;

  useEffect(() => {
    return () => {
      if (preview?.url.startsWith('blob:')) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (preview && value !== preview.name) {
      setPreview(null);
    }
  }, [preview, value]);

  const openLogoPicker = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const isImageFile = file.type.startsWith('image/') || /\.(gif|jpe?g|png|webp)$/i.test(file.name);
    if (!isImageFile) {
      setLogoError('Please select a PNG, JPG, GIF, or WEBP image file.');
      event.target.value = '';
      return;
    }

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slot', slot);
      formData.append('selected', checked ? '1' : '0');

      const response = await fetch(LOGO_UPLOAD_PATH, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to upload logo.');
      }

      const publicPath = String(data?.path || data?.url || data?.image || '').trim();
      const fileName = String(data?.fileName || '').trim();
      const storedValue = publicPath || fileName;
      if (!storedValue) {
        throw new Error('The uploaded logo did not return a valid path.');
      }

      const url = publicPath || `/uploads/document_logo/${encodeURIComponent(fileName)}`;
      setPreview({ name: storedValue, url });
      onChange(storedValue);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Unable to upload logo.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2">
        <input type="radio" checked={checked} onChange={onChecked} className="h-4 w-4 accent-gray-900" />
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>
      <div className={`mb-3 flex items-center justify-center overflow-hidden rounded border border-dashed border-gray-300 bg-gray-100 ${wide ? 'h-28' : 'h-24'}`}>
        {previewSrc ? (
          <img src={previewSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-8 w-8 text-gray-400" />
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openLogoPicker}
          disabled={uploadingLogo}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Change logo
        </button>
      </div>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoFileSelect}
        className="hidden"
        aria-label={`Select ${label.toLowerCase()} image`}
      />
      {logoError && <p className="mt-2 text-xs font-medium text-red-600">{logoError}</p>}
    </div>
  );
}

function HeaderFields({
  title,
  heading,
  address,
  city,
  vat,
  onHeading,
  onAddress,
  onCity,
  onVat
}: {
  title: string;
  heading: string;
  address: string;
  city: string;
  vat: string;
  onHeading: (value: string) => void;
  onAddress: (value: string) => void;
  onCity: (value: string) => void;
  onVat: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="grid gap-3">
        <TextField label="Heading" value={heading} onChange={onHeading} />
        <TextField label="Address" value={address} onChange={onAddress} />
        <TextField label="Locality" value={city} onChange={onCity} />
        <TextField label="VAT" value={vat} onChange={onVat} />
      </div>
    </div>
  );
}

function CounterField({
  label,
  value,
  onChange,
  onReset
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_1fr_80px] sm:items-end">
      <TextField label={label} type="number" min={0} step={1} value={value} onChange={onChange} />
      <div className="hidden sm:block" />
      <button
        type="button"
        onClick={onReset}
        className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
      >
        Reset
      </button>
    </div>
  );
}

function ClosingRow({
  checked,
  start,
  end,
  onChecked,
  onStart,
  onEnd,
  endError,
  endRef
}: {
  checked: boolean;
  start: string;
  end: string;
  onChecked: (value: boolean) => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  endError?: string;
  endRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-[120px_1fr_1fr] md:items-end">
      <CheckboxField label="Start" checked={checked} onChange={onChecked} />
      <TextField label="Start date" type="date" value={start} onChange={onStart} />
      <TextField label="End date" type="date" value={end} onChange={onEnd} error={endError} fieldRef={endRef} />
    </div>
  );
}
