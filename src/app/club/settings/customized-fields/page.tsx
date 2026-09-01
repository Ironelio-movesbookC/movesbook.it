'use client';

import { useEffect, useState } from 'react';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import { getAuthHeaders } from '@/lib/club/servicePurchasesClient';
import type {
  CustomQuestionAnswerType,
  CustomQuestionDef,
} from '@/lib/club/memberProfileTypes';
import {
  CheckRow,
  Field,
  TextInput,
  TextSelect,
} from '@/components/club/memberProfile/FormBits';

const ANSWER_TYPES: Array<{ id: CustomQuestionAnswerType; label: string }> = [
  { id: 'free', label: 'Free answer' },
  { id: 'checkbox', label: 'Checkbox to tick' },
  { id: 'yes_no', label: 'Yes or No' },
  { id: 'list', label: 'Selection from list' },
];

const MAX_QUESTIONS = 10;

export default function CustomizedFieldsPage() {
  const { selectedClubId } = useClubWorkspace();
  const clubId = selectedClubId || (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') || '' : '');

  const [clubName, setClubName] = useState('');
  const [questions, setQuestions] = useState<CustomQuestionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  const [draftType, setDraftType] = useState<CustomQuestionAnswerType>('free');
  const [draftQuestion, setDraftQuestion] = useState('');
  const [draftVisible, setDraftVisible] = useState(false);
  const [draftMandatory, setDraftMandatory] = useState(false);
  const [draftListOptions, setDraftListOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) {
      setLoading(false);
      setError('Select a club first.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}/custom-questions`, {
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        error?: string;
        clubName?: string;
        canEdit?: boolean;
        questions?: CustomQuestionDef[];
      };
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setClubName(data.clubName || '');
      setCanEdit(Boolean(data.canEdit));
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const persist = async (next: CustomQuestionDef[]) => {
    if (!clubId || !canEdit) return;
    try {
      setSaving(true);
      setMessage('');
      setError('');
      const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}/custom-questions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ questions: next }),
      });
      const data = (await res.json()) as { error?: string; questions?: CustomQuestionDef[] };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setQuestions(Array.isArray(data.questions) ? data.questions : next);
      setMessage('Customized fields saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = () => {
    setDraftType('free');
    setDraftQuestion('');
    setDraftVisible(false);
    setDraftMandatory(false);
    setDraftListOptions('');
    setEditingId(null);
  };

  const createOrUpdate = () => {
    const question = draftQuestion.trim();
    if (!question) {
      setError('Please enter the question / field name.');
      return;
    }
    if (!editingId && questions.length >= MAX_QUESTIONS) {
      setError(`Maximum ${MAX_QUESTIONS} customized fields.`);
      return;
    }
    const item: CustomQuestionDef = {
      id: editingId || `cq-${Date.now()}`,
      question,
      answerType: draftType,
      visibleInRegistration: draftVisible,
      mandatory: draftMandatory,
      listOptions: draftType === 'list' ? draftListOptions : '',
    };
    const next = editingId
      ? questions.map((q) => (q.id === editingId ? item : q))
      : [...questions, item];
    resetDraft();
    void persist(next);
  };

  const startEdit = (q: CustomQuestionDef) => {
    setEditingId(q.id);
    setDraftType(q.answerType);
    setDraftQuestion(q.question);
    setDraftVisible(q.visibleInRegistration);
    setDraftMandatory(q.mandatory);
    setDraftListOptions(q.listOptions);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900">Customized fields</h1>
      <p className="mt-1 text-sm text-gray-600">
        Add personalized questions shown on the member profile schedule
        {clubName ? (
          <>
            {' '}
            for <span className="font-medium text-gray-800">{clubName}</span>
          </>
        ) : null}
        . Max {MAX_QUESTIONS} fields.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : error && !questions.length ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="rounded border border-gray-300 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {editingId ? 'Edit field' : 'Field creation'}
            </h2>
            <div className="space-y-3">
              <Field label="What type of answer should the member give? *">
                <TextSelect
                  disabled={!canEdit}
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value as CustomQuestionAnswerType)}
                >
                  {ANSWER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Field name / Question *">
                <TextInput
                  disabled={!canEdit}
                  value={draftQuestion}
                  placeholder="Field name"
                  onChange={(e) => setDraftQuestion(e.target.value)}
                />
              </Field>
              {draftType === 'list' ? (
                <Field label="Options (comma separated)">
                  <TextInput
                    disabled={!canEdit}
                    value={draftListOptions}
                    placeholder="Option 1, Option 2, Option 3"
                    onChange={(e) => setDraftListOptions(e.target.value)}
                  />
                </Field>
              ) : null}
              <CheckRow
                label="Visible in the registration form"
                disabled={!canEdit}
                checked={draftVisible}
                onChange={setDraftVisible}
              />
              <CheckRow
                label="Make mandatory"
                disabled={!canEdit}
                checked={draftMandatory}
                onChange={setDraftMandatory}
              />
              {canEdit ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={createOrUpdate}
                    className="rounded bg-[#6b4c9a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a3d82] disabled:opacity-50"
                  >
                    {editingId ? 'Save field' : 'Create field'}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800"
                      onClick={resetDraft}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-amber-700">Only the club admin can create or edit fields.</p>
              )}
            </div>
          </section>

          <section className="rounded border border-gray-300 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">List of fields</h2>
            <p className="mb-3 text-sm text-gray-600">
              {questions.length} fields inserted of {MAX_QUESTIONS}
            </p>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">No customized fields yet.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="rounded border border-gray-200 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{q.question}</div>
                        <div className="text-xs text-gray-500">
                          {ANSWER_TYPES.find((t) => t.id === q.answerType)?.label || q.answerType}
                          {q.mandatory ? ' · Mandatory' : ''}
                          {q.visibleInRegistration ? ' · Visible in registration' : ''}
                        </div>
                        {q.answerType === 'list' && q.listOptions ? (
                          <div className="mt-1 text-xs text-gray-600">Options: {q.listOptions}</div>
                        ) : null}
                      </div>
                      {canEdit ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={() => startEdit(q)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 hover:underline"
                            onClick={() =>
                              void persist(questions.filter((x) => x.id !== q.id))
                            }
                          >
                            Delete field
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
        </div>
      )}
    </div>
  );
}
