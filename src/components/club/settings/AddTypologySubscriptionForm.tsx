'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTypologyIconUrl } from '@/lib/typologyIcon';
import {
  createEmptyLanesForDays,
  LANE_DAY_LABELS,
  type LanesForDaysMatrix
} from '@/lib/lanesForDays';
import RichTextEditor from '@/components/shared/RichTextEditor';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Save,
  Square,
  Star,
  Upload
} from 'lucide-react';

type AreaOption = {
  id: string;
  name: string;
};

type AdmissionKey =
  | 'one'
  | 'three'
  | 'five'
  | 'seven'
  | 'ten'
  | 'twelve'
  | 'fifteen'
  | 'one_month'
  | 'two_month'
  | 'three_month'
  | 'six_month';

type Admission = {
  enabled: boolean;
  price: string;
  accesses: string;
  daysToPay: string;
};

type LaneSetting = {
  available: boolean;
  limit: string;
};

type FormState = {
  areaActivity: string;
  activityName: string;
  code: string;
  color: string;
  image: string;
  multifactory: string;
  coaches: string;
  vendors: string;
  annotations: string;
  room: string;
  costForLesson: string;
  admissions: Record<AdmissionKey, Admission>;
  allowMultipleEntrancesSameDay: boolean;
  afterDailyAccessDecreaseSubsequent: boolean;
  maxLimitEnabled: boolean;
  maxLimitValue: string;
  preventSubscriptionProcess: boolean;
  enableLanesBooths: boolean;
  lanes: LaneSetting[];
  lanesForDays: LanesForDaysMatrix;
  afterExpireLaneDays: string;
  blockAccess: boolean;
  decreaseSeason: boolean;
  hideAccessControlData: boolean;
  disableAccessVoiceMessage: boolean;
  doNotStoreAccessData: boolean;
  doNotStoreAllowedAccesses: boolean;
  doNotStoreDeniedAccesses: boolean;
  audioMessageEnabled: boolean;
  audioMessageStart: string;
  audioMessageEnd: string;
  popupMessageEnabled: boolean;
  popupMessageStart: string;
  popupMessageEnd: string;
  notice: string;
  headerSize: string;
  description: string;
  enabledForBooking: boolean;
  mandatoryBooking: boolean;
  selfBooking: boolean;
  selfSubscription: boolean;
  paymentPostecipedOrCreditCard: boolean;
  payWithinDays: string;
};

const DEFAULT_AREAS: AreaOption[] = [
  { id: 'Aerobics', name: 'Aerobics' },
  { id: 'Fitness', name: 'Fitness' },
  { id: 'Pilates', name: 'Pilates' },
  { id: 'Swim', name: 'Swim' }
];

const ACCESS_ROWS: { key: AdmissionKey; label: string }[] = [
  { key: 'one', label: '1 access' },
  { key: 'three', label: '3 access' },
  { key: 'five', label: '5 access' },
  { key: 'seven', label: '7 access' },
  { key: 'ten', label: '10 access' },
  { key: 'twelve', label: '12 access' },
  { key: 'fifteen', label: '15 access' },
  { key: 'one_month', label: '1 month access' },
  { key: 'two_month', label: '2 month access' },
  { key: 'three_month', label: '3 month access' },
  { key: 'six_month', label: '6 month access' }
];

const TABS = ['Course settings', 'Description', 'Self subscription'] as const;
type TabId = typeof TABS[number];
const TYPOLOGY_LIST_PATH = '/club/settings/typology_subscription';
const BUILT_IN_ICON_COUNT = 10;
type FormErrors = Record<string, string>;

export type AddTypologySubscriptionFormProps = {
  /** When set, loads and updates an existing typology instead of creating one. */
  typologyId?: string;
  /** Override the "Back to typologies" behavior (e.g. embed inside another page). */
  onBack?: () => void;
  /** Override where we go after a successful save. Defaults to back/list. */
  onSaved?: () => void;
  /** Override the list route used for router navigation in standalone page mode. */
  listPath?: string;
};

const SELF_SUBSCRIPTION_FIELDS = new Set([
  'enabledForBooking',
  'mandatoryBooking',
  'selfBooking',
  'selfSubscription',
  'paymentPostecipedOrCreditCard',
  'payWithinDays'
]);

function createAdmissions(): Record<AdmissionKey, Admission> {
  return ACCESS_ROWS.reduce((acc, row) => {
    acc[row.key] = {
      enabled: false,
      price: '',
      accesses: '',
      daysToPay: ''
    };
    return acc;
  }, {} as Record<AdmissionKey, Admission>);
}

function initialForm(): FormState {
  return {
    areaActivity: DEFAULT_AREAS[0].id,
    activityName: '',
    code: '',
    color: '#ffffff',
    image: 'Cat_1.png',
    multifactory: '1',
    coaches: '1',
    vendors: '1',
    annotations: '',
    room: '',
    costForLesson: '',
    admissions: createAdmissions(),
    allowMultipleEntrancesSameDay: false,
    afterDailyAccessDecreaseSubsequent: false,
    maxLimitEnabled: false,
    maxLimitValue: '',
    preventSubscriptionProcess: false,
    enableLanesBooths: false,
    lanes: Array.from({ length: 10 }, () => ({ available: false, limit: '' })),
    lanesForDays: createEmptyLanesForDays(),
    afterExpireLaneDays: '',
    blockAccess: false,
    decreaseSeason: false,
    hideAccessControlData: false,
    disableAccessVoiceMessage: false,
    doNotStoreAccessData: false,
    doNotStoreAllowedAccesses: false,
    doNotStoreDeniedAccesses: false,
    audioMessageEnabled: false,
    audioMessageStart: '',
    audioMessageEnd: '',
    popupMessageEnabled: false,
    popupMessageStart: '',
    popupMessageEnd: '',
    notice: '',
    headerSize: 'header_size-1',
    description: '',
    enabledForBooking: false,
    mandatoryBooking: false,
    selfBooking: false,
    selfSubscription: false,
    paymentPostecipedOrCreditCard: false,
    payWithinDays: ''
  };
}

const TYPOLOGY_ICON_FILE_PATTERN = /\.(jpe?g|png|gif|bmp)$/i;

function getTypologyIconLabel(image: string): string {
  const match = image.match(/^Cat_(\d+)\.(png|jpe?g|gif|bmp)$/i);
  if (match?.[1]) return match[1];
  return 'custom';
}

function cleanText(value: string): string {
  return value.trim();
}

function isNonNegativeNumber(value: string): boolean {
  const next = cleanText(value);
  if (!next) return true;
  const parsed = Number(next.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0;
}

function isInteger(value: string): boolean {
  const next = cleanText(value);
  return !next || /^-?\d+$/.test(next);
}

function isNonNegativeInteger(value: string): boolean {
  const next = cleanText(value);
  if (!next) return true;
  const parsed = Number(next);
  return Number.isInteger(parsed) && parsed >= 0;
}

function getTabForField(field: string): TabId {
  if (field === 'description') return 'Description';
  if (SELF_SUBSCRIPTION_FIELDS.has(field)) return 'Self subscription';
  return 'Course settings';
}

function validateForm(form: FormState): FormErrors {
  const nextErrors: FormErrors = {};

  if (!cleanText(form.areaActivity)) {
    nextErrors.areaActivity = 'Please select an area activity.';
  }

  if (!cleanText(form.activityName)) {
    nextErrors.activityName = 'Please enter the activity name.';
  }

  if (form.color && !/^#[0-9a-f]{6}$/i.test(form.color)) {
    nextErrors.color = 'Please select a valid color.';
  }

  if (!isNonNegativeNumber(form.costForLesson)) {
    nextErrors.costForLesson = 'Cost for lesson must be a valid number.';
  }

  if (form.maxLimitEnabled && !cleanText(form.maxLimitValue)) {
    nextErrors.maxLimitValue = 'Max limit is required.';
  } else if (!isInteger(form.maxLimitValue)) {
    nextErrors.maxLimitValue = 'Max limit must be a whole number.';
  }

  ACCESS_ROWS.forEach((row) => {
    const admission = form.admissions[row.key];
    if (admission.enabled && !cleanText(admission.price)) {
      nextErrors[`admissions.${row.key}.price`] = 'Price is required.';
    } else if (!isNonNegativeNumber(admission.price)) {
      nextErrors[`admissions.${row.key}.price`] = 'Price must be a valid number.';
    }

    if (admission.enabled && !cleanText(admission.accesses)) {
      nextErrors[`admissions.${row.key}.accesses`] = 'No. of accesses is required.';
    } else if (!isNonNegativeInteger(admission.accesses)) {
      nextErrors[`admissions.${row.key}.accesses`] = 'Use a whole number.';
    }

    if (!isNonNegativeInteger(admission.daysToPay)) {
      nextErrors[`admissions.${row.key}.daysToPay`] = 'Use a whole number.';
    }
  });

  if (!isNonNegativeInteger(form.afterExpireLaneDays)) {
    nextErrors.afterExpireLaneDays = 'Days must be a whole number from 0 to 30.';
  } else if (cleanText(form.afterExpireLaneDays) && Number(form.afterExpireLaneDays) > 30) {
    nextErrors.afterExpireLaneDays = 'Days cannot be greater than 30.';
  }

  const availableLanes = form.lanes.filter((lane) => lane.available);
  if (form.enableLanesBooths && availableLanes.length === 0) {
    nextErrors.enableLanesBooths = 'Select at least one available lane or booth.';
  }

  form.lanes.forEach((lane, index) => {
    if (lane.available && !cleanText(lane.limit)) {
      nextErrors[`lanes.${index}.limit`] = 'Required.';
    } else if (!isNonNegativeInteger(lane.limit)) {
      nextErrors[`lanes.${index}.limit`] = 'Use a whole number.';
    }
  });

  if (form.audioMessageStart && form.audioMessageEnd && form.audioMessageEnd < form.audioMessageStart) {
    nextErrors.audioMessageEnd = 'Expiration date must be after the start date.';
  }

  if (form.popupMessageStart && form.popupMessageEnd && form.popupMessageEnd < form.popupMessageStart) {
    nextErrors.popupMessageEnd = 'Expiration date must be after the start date.';
  }

  if (!isNonNegativeInteger(form.payWithinDays)) {
    nextErrors.payWithinDays = 'Payment days must be a whole number.';
  }

  return nextErrors;
}

export default function AddTypologySubscriptionForm(props: AddTypologySubscriptionFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(props.typologyId);
  const [activeTab, setActiveTab] = useState<TabId>('Course settings');
  const [form, setForm] = useState<FormState>(() => initialForm());
  const [areas, setAreas] = useState<AreaOption[]>(DEFAULT_AREAS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loadingTypology, setLoadingTypology] = useState(Boolean(props.typologyId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [dailyAvailabilityOpen, setDailyAvailabilityOpen] = useState(false);
  const [savingDailyAvailability, setSavingDailyAvailability] = useState(false);
  const [recording, setRecording] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/club/settings/typology-subscription', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) return;
        const data = await response.json();
        const nextAreas = Array.isArray(data.areas) && data.areas.length > 0
          ? data.areas
          : DEFAULT_AREAS;

        if (!cancelled) {
          setAreas(nextAreas);
          setForm((current) => ({
            ...current,
            areaActivity: nextAreas.some((area: AreaOption) => area.id === current.areaActivity)
              ? current.areaActivity
              : nextAreas[0]?.id || DEFAULT_AREAS[0].id
          }));
        }
      } catch {
      }
    }

    loadAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!props.typologyId) return;

    let cancelled = false;

    async function loadTypology() {
      try {
        setLoadingTypology(true);
        setLoadError(null);
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/club/settings/typology-subscription?id=${encodeURIComponent(props.typologyId!)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load this typology.');
        }

        if (cancelled) return;

        const nextAreas = Array.isArray(data.areas) && data.areas.length > 0
          ? data.areas
          : DEFAULT_AREAS;
        setAreas(nextAreas);

        const payload = data.typology as Partial<FormState> | undefined;
        if (!payload || typeof payload !== 'object') {
          throw new Error('Typology data is missing.');
        }

        setForm({
          ...initialForm(),
          ...payload,
          admissions: {
            ...createAdmissions(),
            ...(payload.admissions ?? {})
          },
          lanes: Array.isArray(payload.lanes) && payload.lanes.length > 0
            ? payload.lanes
            : initialForm().lanes,
          lanesForDays: Array.isArray((payload as { lanesForDays?: LanesForDaysMatrix }).lanesForDays)
            ? (payload as { lanesForDays: LanesForDaysMatrix }).lanesForDays
            : createEmptyLanesForDays()
        });
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load this typology.');
        }
      } finally {
        if (!cancelled) {
          setLoadingTypology(false);
        }
      }
    }

    loadTypology();

    return () => {
      cancelled = true;
    };
  }, [props.typologyId]);

  const selectedIconLabel = useMemo(() => getTypologyIconLabel(form.image), [form.image]);
  const iconPreviewUrl = useMemo(() => getTypologyIconUrl(form.image), [form.image]);

  const registerField = (field: string) => (node: HTMLElement | null) => {
    fieldRefs.current[field] = node;
  };

  const clearFieldError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const scrollToField = (field: string) => {
    setActiveTab(getTabForField(field));
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

  const updateAdmission = (key: AdmissionKey, patch: Partial<Admission>) => {
    Object.keys(patch).forEach((field) => clearFieldError(`admissions.${key}.${field}`));
    setForm((current) => ({
      ...current,
      admissions: {
        ...current.admissions,
        [key]: {
          ...current.admissions[key],
          ...patch
        }
      }
    }));
  };

  const updateLane = (index: number, patch: Partial<LaneSetting>) => {
    if ('limit' in patch) clearFieldError(`lanes.${index}.limit`);
    if ('available' in patch) clearFieldError('enableLanesBooths');
    setForm((current) => {
      const nextLanes = current.lanes.map((lane, laneIndex) =>
        laneIndex === index ? { ...lane, ...patch } : lane
      );

      let nextLanesForDays = current.lanesForDays;
      if ('available' in patch && patch.available === false) {
        nextLanesForDays = current.lanesForDays.map((day) =>
          day.map((enabled, laneIndex) => (laneIndex === index ? false : enabled))
        );
      }

      return {
        ...current,
        lanes: nextLanes,
        lanesForDays: nextLanesForDays
      };
    });
  };

  const updateLaneForDay = (dayIndex: number, laneIndex: number, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      lanesForDays: current.lanesForDays.map((day, di) =>
        di === dayIndex
          ? day.map((value, li) => (li === laneIndex ? enabled : value))
          : day
      )
    }));
  };

  const toggleDayLanes = (dayIndex: number, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      lanesForDays: current.lanesForDays.map((day, di) =>
        di === dayIndex
          ? day.map((_, laneIndex) => (current.lanes[laneIndex]?.available ? enabled : false))
          : day
      )
    }));
  };

  const saveDailyAvailability = async () => {
    if (!isEditMode || !props.typologyId) {
      setDailyAvailabilityOpen(false);
      return;
    }

    setSavingDailyAvailability(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'save-lanes-for-days',
          id: props.typologyId,
          lanesForDays: form.lanesForDays,
          lanes: form.lanes
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Save failed');
      }
      if (data?.persisted === false) {
        throw new Error(
          'The lanes_for_days table is missing in your database. Import the legacy schema or create that table.'
        );
      }

      setDailyAvailabilityOpen(false);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Unable to save daily availability.'
      );
    } finally {
      setSavingDailyAvailability(false);
    }
  };

  const cycleIcon = (direction: 1 | -1) => {
    const match = form.image.match(/^Cat_(\d+)\.(png|jpe?g|gif|bmp)$/i);
    const current = Number(match?.[1]) || 1;
    const next = current + direction;
    const bounded = next < 1 ? BUILT_IN_ICON_COUNT : next > BUILT_IN_ICON_COUNT ? 1 : next;
    setForm((value) => ({ ...value, image: `Cat_${bounded}.png` }));
  };

  const handleIconUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!TYPOLOGY_ICON_FILE_PATTERN.test(file.name)) {
      window.alert('Allowed file types: jpg, png, bmp, gif');
      event.target.value = '';
      return;
    }

    setUploadingIcon(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/club/settings/typology-subscription/icon', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to upload the typology icon.');
      }

      const imageName = String(data?.image || data?.fileName || '').trim();
      if (!imageName) {
        throw new Error('The uploaded icon did not return a valid filename.');
      }

      setForm((current) => ({ ...current, image: imageName }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to upload the typology icon.');
    } finally {
      setUploadingIcon(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    if (applyErrors(nextErrors)) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: isEditMode ? 'update-typology' : 'create-typology',
          ...(isEditMode ? { id: props.typologyId } : {}),
          ...form
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          applyErrors(data.fieldErrors);
          return;
        }
        throw new Error(data?.error || 'Unable to save this typology.');
      }

      if (props.onSaved) {
        props.onSaved();
      } else if (props.onBack) {
        props.onBack();
      } else {
        router.push(props.listPath ?? TYPOLOGY_LIST_PATH);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save this typology.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingTypology) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading typology
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 lg:p-6">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => {
            if (props.onBack) return props.onBack();
            router.push(props.listPath ?? TYPOLOGY_LIST_PATH);
          }}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to typologies
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            if (props.onBack) return props.onBack();
            router.push(props.listPath ?? TYPOLOGY_LIST_PATH);
          }}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to typologies
        </button>
        <span className="text-sm text-gray-500">
          {isEditMode ? 'Modify typology subscription' : 'Add typology subscription'} · Club&apos;s management / General settings
        </span>
      </div>
      <form onSubmit={handleSubmit} className="club-typology-form overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-end">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-r border-gray-200 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'Course settings' && (
          <div className="divide-y divide-gray-200">
            <section className="p-4">
              <div className="grid gap-4 xl:grid-cols-[190px_1fr_260px] xl:items-start">
                <FieldLabel>Area activity</FieldLabel>
                <div ref={registerField('areaActivity')}>
                  <select
                    value={form.areaActivity}
                    onChange={(event) => {
                      clearFieldError('areaActivity');
                      setForm({ ...form, areaActivity: event.target.value });
                    }}
                    className={fieldClass('areaActivity', 'h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm')}
                  >
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                  <FieldError message={errors.areaActivity} />
                </div>
                <div className="hidden xl:block"></div>

                <FieldLabel>Name activity</FieldLabel>
                <div ref={registerField('activityName')}>
                  <input
                    value={form.activityName}
                    onChange={(event) => {
                      clearFieldError('activityName');
                      setForm({ ...form, activityName: event.target.value });
                    }}
                    className={fieldClass('activityName', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.activityName} />
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Code</span>
                  <input
                    value={form.code}
                    onChange={(event) => setForm({ ...form, code: event.target.value })}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className="h-10 w-10 rounded border border-gray-300 bg-white p-1"
                  />
                </div>

                <div className="hidden xl:block"></div>
                <div className="flex items-center gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-gray-300 bg-white shadow-inner">
                    {iconPreviewUrl ? (
                      <Image
                        src={iconPreviewUrl}
                        alt="Typology icon"
                        width={56}
                        height={56}
                        unoptimized
                        className="h-14 w-14 object-contain"
                      />
                    ) : (
                      <Star className="h-12 w-12 text-gray-900" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button type="button" onClick={() => cycleIcon(-1)} className="text-amber-500">
                      <ChevronUp className="h-6 w-6 fill-amber-300" />
                    </button>
                    <button type="button" className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold">
                      Ok
                    </button>
                    <button type="button" onClick={() => cycleIcon(1)} className="text-amber-500">
                      <ChevronDown className="h-6 w-6 fill-amber-300" />
                    </button>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Icon {selectedIconLabel}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/bmp,.jpg,.jpeg,.png,.gif,.bmp"
                      className="hidden"
                      onChange={handleIconUpload}
                    />
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      disabled={uploadingIcon}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingIcon ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingIcon ? 'Uploading...' : 'Load an icon'}
                    </button>
                  </div>
                </div>
                <div className="hidden xl:block"></div>
              </div>
            </section>

            <section className="p-4">
              <div className="grid gap-4 xl:grid-cols-[190px_1fr_430px] xl:items-center">
                <FieldLabel>Multifactory</FieldLabel>
                <select
                  value={form.multifactory}
                  onChange={(event) => setForm({ ...form, multifactory: event.target.value })}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="1">Multifactory-1</option>
                  <option value="2">Multifactory-2</option>
                  <option value="3">Multifactory-3</option>
                </select>
                <span className="text-sm text-gray-600">Managable by s-admin and by club&apos;s admin</span>

                <FieldLabel>Coaches</FieldLabel>
                <div className="flex gap-2">
                  <select
                    value={form.coaches}
                    onChange={(event) => setForm({ ...form, coaches: event.target.value })}
                    className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="1">coach1</option>
                    <option value="2">coach2</option>
                  </select>
                  <MiniButton label="..." />
                </div>
                <div className="hidden xl:block"></div>

                <FieldLabel>Vendors</FieldLabel>
                <div className="flex gap-2">
                  <select
                    value={form.vendors}
                    onChange={(event) => setForm({ ...form, vendors: event.target.value })}
                    className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="1">A</option>
                    <option value="2">B</option>
                  </select>
                  <MiniButton label="..." />
                </div>
                <div className="hidden xl:block"></div>

                <FieldLabel>Annotations</FieldLabel>
                <input
                  value={form.annotations}
                  onChange={(event) => setForm({ ...form, annotations: event.target.value })}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm xl:col-span-2"
                />

                <FieldLabel>Room</FieldLabel>
                <input
                  value={form.room}
                  onChange={(event) => setForm({ ...form, room: event.target.value })}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                />
                <div ref={registerField('costForLesson')} className="grid grid-cols-[160px_1fr] items-start gap-3">
                  <span className="text-sm font-medium text-gray-700">Cost for lesson</span>
                  <div>
                    <input
                      value={form.costForLesson}
                      onChange={(event) => {
                        clearFieldError('costForLesson');
                        setForm({ ...form, costForLesson: event.target.value });
                      }}
                      className={fieldClass('costForLesson', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                    />
                    <FieldError message={errors.costForLesson} />
                  </div>
                </div>
              </div>
            </section>

            <section className="p-4">
              <SectionTitle variant="tab">Admissions that can be purchased in this course</SectionTitle>
              <div className="divide-y divide-gray-200 border-x border-b border-gray-200">
                {ACCESS_ROWS.map((row) => {
                  const admission = form.admissions[row.key];
                  return (
                    <div key={row.key} className="grid gap-3 px-3 py-3 lg:grid-cols-[80px_200px_80px_130px_130px_130px_130px] lg:items-center">
                      <label className="flex items-center gap-1 text-[10px] text-gray-600">
                        Enabled
                        <input
                          type="checkbox"
                          checked={admission.enabled}
                          onChange={(event) => updateAdmission(row.key, { enabled: event.target.checked })}
                          className="h-4 w-4 accent-gray-900"
                        />
                      </label>
                      <strong className="text-sm text-gray-900">{row.label}</strong>
                      <FieldInlineLabel>Price</FieldInlineLabel>
                      <CompactInput
                        value={admission.price}
                        onChange={(value) => updateAdmission(row.key, { price: value })}
                        error={errors[`admissions.${row.key}.price`]}
                        fieldRef={registerField(`admissions.${row.key}.price`)}
                      />
                      <FieldInlineLabel>No. of accesses</FieldInlineLabel>
                      <CompactInput
                        value={admission.accesses}
                        onChange={(value) => updateAdmission(row.key, { accesses: value })}
                        error={errors[`admissions.${row.key}.accesses`]}
                        fieldRef={registerField(`admissions.${row.key}.accesses`)}
                      />
                      <div className="grid grid-cols-[90px_1fr] items-center gap-3 lg:col-span-1">
                        <FieldInlineLabel>Days to pay</FieldInlineLabel>
                        <CompactInput
                          value={admission.daysToPay}
                          onChange={(value) => updateAdmission(row.key, { daysToPay: value })}
                          error={errors[`admissions.${row.key}.daysToPay`]}
                          fieldRef={registerField(`admissions.${row.key}.daysToPay`)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-800">
                <CheckboxLine
                  checked={form.allowMultipleEntrancesSameDay}
                  onChange={(checked) => setForm({ ...form, allowMultipleEntrancesSameDay: checked })}
                  label="Allow multiple entrances on the same day"
                />
                <CheckboxLine
                  checked={form.afterDailyAccessDecreaseSubsequent}
                  onChange={(checked) => setForm({ ...form, afterDailyAccessDecreaseSubsequent: checked })}
                  label="After the daily access, it also decreases any subsequent ones on the same day, otherwise only once"
                />
              </div>
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-950">Limits</h2>
              <div className="space-y-4">
                <CheckboxLine
                  checked={form.maxLimitEnabled}
                  onChange={(checked) => {
                    clearFieldError('maxLimitValue');
                    setForm({ ...form, maxLimitEnabled: checked });
                  }}
                  label="Max limit"
                />
                <div ref={registerField('maxLimitValue')}>
                  <input
                    value={form.maxLimitValue}
                    onChange={(event) => {
                      clearFieldError('maxLimitValue');
                      setForm({ ...form, maxLimitValue: event.target.value });
                    }}
                    className={fieldClass('maxLimitValue', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.maxLimitValue} />
                </div>
                <CheckboxLine
                  checked={form.preventSubscriptionProcess}
                  onChange={(checked) => setForm({ ...form, preventSubscriptionProcess: checked })}
                  label="If exceeded prevents the operator from continuing the subscription process"
                />
              </div>
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-950">Set controls for use lanes and booths</h2>
              <CheckboxLine
                checked={form.enableLanesBooths}
                onChange={(checked) => {
                  clearFieldError('enableLanesBooths');
                  setForm({ ...form, enableLanesBooths: checked });
                }}
                label="Enable management for the control of availability of lanes and booths"
              />
              <div ref={registerField('enableLanesBooths')}>
                <FieldError message={errors.enableLanesBooths} />
              </div>
              <div className="mt-4 overflow-x-auto">
                <div className="grid min-w-[620px] grid-cols-[120px_repeat(10,42px)_1fr] items-center gap-2 text-sm">
                  <div></div>
                  {form.lanes.map((_, index) => (
                    <div key={index} className="text-center font-medium text-gray-700">{index + 1}</div>
                  ))}
                  <div></div>
                  <div className="font-medium text-gray-700">Availability</div>
                  {form.lanes.map((lane, index) => (
                    <input
                      key={index}
                      type="checkbox"
                      checked={lane.available}
                      onChange={(event) => updateLane(index, { available: event.target.checked })}
                      className="mx-auto h-4 w-4 accent-gray-900"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setDailyAvailabilityOpen(true)}
                    className="justify-self-end rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-200"
                  >
                    Daily Availability
                  </button>
                  <div className="font-medium text-gray-700">Max Limit</div>
                  {form.lanes.map((lane, index) => (
                    <div key={index} ref={registerField(`lanes.${index}.limit`)}>
                      <input
                        value={lane.limit}
                        onChange={(event) => updateLane(index, { limit: event.target.value })}
                        className={`h-9 w-10 rounded border border-gray-300 px-1 text-center text-sm ${
                          errors[`lanes.${index}.limit`] ? 'border-red-500 ring-1 ring-red-500' : ''
                        }`}
                      />
                      <FieldError message={errors[`lanes.${index}.limit`]} compact />
                    </div>
                  ))}
                  <div></div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-800">
                <span>When subscription expires the name of the member will remain associated to the lane for other</span>
                <div ref={registerField('afterExpireLaneDays')}>
                  <input
                    value={form.afterExpireLaneDays}
                    onChange={(event) => {
                      clearFieldError('afterExpireLaneDays');
                      setForm({ ...form, afterExpireLaneDays: event.target.value });
                    }}
                    className={fieldClass('afterExpireLaneDays', 'h-9 w-24 rounded border border-gray-300 px-2 text-sm')}
                  />
                  <FieldError message={errors.afterExpireLaneDays} />
                </div>
                <span>days(max 30)</span>
              </div>
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-950">Access controls</h2>
              <div className="space-y-3">
                <CheckboxLine
                  checked={form.blockAccess}
                  onChange={(checked) => setForm({ ...form, blockAccess: checked })}
                  label="Block access to all members with subscription in this activity"
                  danger
                />
                <CheckboxLine
                  checked={form.decreaseSeason}
                  onChange={(checked) => setForm({ ...form, decreaseSeason: checked })}
                  label="Decrease season manually"
                />
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="space-y-3">
                      <CheckboxLine
                        checked={form.hideAccessControlData}
                        onChange={(checked) => setForm({ ...form, hideAccessControlData: checked })}
                        label="Disable data visualization in the mask of access control for the user"
                      />
                      <CheckboxLine
                        checked={form.disableAccessVoiceMessage}
                        onChange={(checked) => setForm({ ...form, disableAccessVoiceMessage: checked })}
                        label="Don't execute any vocal message about result of the access control"
                      />
                      <CheckboxLine
                        checked={form.doNotStoreAccessData}
                        onChange={(checked) => setForm({ ...form, doNotStoreAccessData: checked })}
                        label="Don't store data regarding accesses"
                      />
                    </div>
                    <div className="space-y-3 xl:pt-16">
                      <CheckboxLine
                        checked={form.doNotStoreAllowedAccesses}
                        onChange={(checked) => setForm({ ...form, doNotStoreAllowedAccesses: checked })}
                        label="for the accesses allowed"
                        danger
                      />
                      <CheckboxLine
                        checked={form.doNotStoreDeniedAccesses}
                        onChange={(checked) => setForm({ ...form, doNotStoreDeniedAccesses: checked })}
                        label="for the accessed not allowed"
                        danger
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-950">
                Audio message <span className="font-normal text-red-600">(for all members of this subscription)</span>
              </h2>
              <div className="grid gap-4 xl:grid-cols-[190px_1fr_170px_1fr] xl:items-center">
                <label className="flex items-center justify-end gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.audioMessageEnabled}
                    onChange={(event) => setForm({ ...form, audioMessageEnabled: event.target.checked })}
                    className="h-4 w-4 accent-gray-900"
                  />
                  Start
                </label>
                <div ref={registerField('audioMessageStart')}>
                  <input
                    type="date"
                    value={form.audioMessageStart}
                    onChange={(event) => {
                      clearFieldError('audioMessageStart');
                      setForm({ ...form, audioMessageStart: event.target.value });
                    }}
                    className={fieldClass('audioMessageStart', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.audioMessageStart} />
                </div>
                <FieldLabel>Expiration date</FieldLabel>
                <div ref={registerField('audioMessageEnd')}>
                  <input
                    type="date"
                    value={form.audioMessageEnd}
                    onChange={(event) => {
                      clearFieldError('audioMessageEnd');
                      setForm({ ...form, audioMessageEnd: event.target.value });
                    }}
                    className={fieldClass('audioMessageEnd', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.audioMessageEnd} />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecording((value) => !value)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {recording ? 'Stop' : 'Record'}
                </button>
                <input ref={audioInputRef} type="file" accept="audio/*,video/mp4" className="hidden" />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </button>
              </div>
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-base font-semibold text-gray-950">Popup message</h2>
              <div className="grid gap-4 xl:grid-cols-[190px_1fr_170px_1fr] xl:items-center">
                <label className="flex items-center justify-end gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.popupMessageEnabled}
                    onChange={(event) => setForm({ ...form, popupMessageEnabled: event.target.checked })}
                    className="h-4 w-4 accent-gray-900"
                  />
                  Start
                </label>
                <div ref={registerField('popupMessageStart')}>
                  <input
                    type="date"
                    value={form.popupMessageStart}
                    onChange={(event) => {
                      clearFieldError('popupMessageStart');
                      setForm({ ...form, popupMessageStart: event.target.value });
                    }}
                    className={fieldClass('popupMessageStart', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.popupMessageStart} />
                </div>
                <FieldLabel>Expiration date</FieldLabel>
                <div ref={registerField('popupMessageEnd')}>
                  <input
                    type="date"
                    value={form.popupMessageEnd}
                    onChange={(event) => {
                      clearFieldError('popupMessageEnd');
                      setForm({ ...form, popupMessageEnd: event.target.value });
                    }}
                    className={fieldClass('popupMessageEnd', 'h-10 w-full rounded-md border border-gray-300 px-3 text-sm')}
                  />
                  <FieldError message={errors.popupMessageEnd} />
                </div>
                <FieldLabel>Notice</FieldLabel>
                <input
                  value={form.notice}
                  onChange={(event) => setForm({ ...form, notice: event.target.value })}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                />
                <div className="hidden xl:block"></div>
                <select
                  value={form.headerSize}
                  onChange={(event) => setForm({ ...form, headerSize: event.target.value })}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="header_size-1">header_size-1</option>
                  <option value="header_size-2">header_size-2</option>
                </select>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Description' && (
          <section className="p-2" ref={registerField('description')}>
            <RichTextEditor
              value={form.description}
              onChange={(html) => {
                clearFieldError('description');
                setForm((current) => ({ ...current, description: html }));
              }}
              minHeight="280px"
              maxHeight="480px"
              focusRingClass="focus:ring-2 focus:ring-gray-500"
            />
            <FieldError message={errors.description} />
          </section>
        )}

        {activeTab === 'Self subscription' && (
          <section className="space-y-3 p-3">
            <SectionTitle>Edit course Main settings</SectionTitle>
            <CheckboxLine
              checked={form.enabledForBooking}
              onChange={(checked) => setForm({ ...form, enabledForBooking: checked })}
              label="Enable this course for booking"
            />
            <div className="border border-gray-300 bg-gray-100 p-3">
              <div className="space-y-2">
                <CheckboxLine
                  checked={form.mandatoryBooking}
                  onChange={(checked) => setForm({ ...form, mandatoryBooking: checked })}
                  label="Bookings are mandatory"
                />
                <CheckboxLine
                  checked={form.selfBooking}
                  onChange={(checked) => setForm({ ...form, selfBooking: checked })}
                  label="Enable the member to selfbooking by himself"
                />
              </div>
            </div>
            <CheckboxLine
              checked={form.selfSubscription}
              onChange={(checked) => setForm({ ...form, selfSubscription: checked })}
              label="Enable the member to selfsubscription by himself"
            />
            <div className="grid gap-4 border border-gray-300 bg-gray-100 p-3 lg:grid-cols-[1fr_420px] lg:items-center">
              <CheckboxLine
                checked={form.paymentPostecipedOrCreditCard}
                onChange={(checked) => setForm({ ...form, paymentPostecipedOrCreditCard: checked })}
                label="Accept the payment posteciped else with only credit card"
              />
              <div className="grid grid-cols-[1fr_120px] items-center gap-3">
                <span className="text-sm font-medium text-gray-700">The user must pay within these days</span>
                <div ref={registerField('payWithinDays')}>
                  <input
                    value={form.payWithinDays}
                    onChange={(event) => {
                      clearFieldError('payWithinDays');
                      setForm({ ...form, payWithinDays: event.target.value });
                    }}
                    className={fieldClass('payWithinDays', 'h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm')}
                  />
                  <FieldError message={errors.payWithinDays} />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-center gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              if (props.onBack) return props.onBack();
              router.push(props.listPath ?? TYPOLOGY_LIST_PATH);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </form>

      {dailyAvailabilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-4xl rounded-md bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-900 px-5 py-4 text-white">
              <h2 className="text-lg font-semibold">Daily Availability</h2>
              <button type="button" onClick={() => setDailyAvailabilityOpen(false)} className="text-sm font-semibold">
                Close
              </button>
            </div>
            <div className="overflow-x-auto p-5">
              <p className="mb-3 text-sm text-gray-600">
                Enable lanes or units that can be used for each day. Only lanes marked available above can be selected.
              </p>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border border-gray-200 px-3 py-2 text-center">All</th>
                    <th className="border border-gray-200 px-3 py-2">Day</th>
                    {form.lanes.map((_, index) => (
                      <th key={index} className="border border-gray-200 px-3 py-2 text-center">{index + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LANE_DAY_LABELS.map((dayLabel, dayIndex) => {
                    const availableLaneIndexes = form.lanes
                      .map((lane, laneIndex) => (lane.available ? laneIndex : -1))
                      .filter((laneIndex) => laneIndex >= 0);
                    const allDaySelected =
                      availableLaneIndexes.length > 0 &&
                      availableLaneIndexes.every((laneIndex) => form.lanesForDays[dayIndex]?.[laneIndex]);

                    return (
                      <tr key={dayLabel}>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={allDaySelected}
                            disabled={availableLaneIndexes.length === 0}
                            onChange={(event) => toggleDayLanes(dayIndex, event.target.checked)}
                            className="h-4 w-4 accent-gray-900"
                            title={`Select all lanes for ${dayLabel}`}
                          />
                        </td>
                        <td className="border border-gray-200 px-3 py-2 font-medium">{dayLabel}</td>
                        {form.lanes.map((lane, laneIndex) => (
                          <td key={laneIndex} className="border border-gray-200 px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={form.lanesForDays[dayIndex]?.[laneIndex] ?? false}
                              disabled={!lane.available}
                              onChange={(event) => updateLaneForDay(dayIndex, laneIndex, event.target.checked)}
                              className="h-4 w-4 accent-gray-900"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setDailyAvailabilityOpen(false)}
                className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDailyAvailability}
                disabled={savingDailyAvailability}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingDailyAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                {savingDailyAvailability ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-right text-sm font-medium text-gray-700 xl:pt-2">
      {children}
    </label>
  );
}

function FieldInlineLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-gray-700">{children}</span>;
}

function SectionTitle({
  children,
  variant = 'blue'
}: {
  children: React.ReactNode;
  variant?: 'blue' | 'tab';
}) {
  return (
    <h2 className={`border px-3 py-2 text-base font-semibold text-white ${
      variant === 'tab'
        ? 'border-gray-900 bg-gray-900'
        : 'border-blue-200 bg-blue-700'
    }`}>
      {children}
    </h2>
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

function CompactInput({
  value,
  onChange,
  error,
  fieldRef
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  fieldRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <div ref={fieldRef}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full rounded-md border border-gray-300 px-2 text-sm ${
          error ? 'border-red-500 ring-1 ring-red-500' : ''
        }`}
      />
      <FieldError message={error} compact />
    </div>
  );
}

function CheckboxLine({
  checked,
  onChange,
  label,
  danger = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm ${danger ? 'text-red-600' : 'text-gray-800'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-gray-900"
      />
      {label}
    </label>
  );
}

function MiniButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-10 min-w-10 rounded-md border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-200"
    >
      {label}
    </button>
  );
}
