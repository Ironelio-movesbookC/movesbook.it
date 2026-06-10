/**
 * Section Exercise dialog UI strings — editable under Settings → Language → translations (same DB as Long phrases).
 * Create keys matching `SECTION_EXERCISE_UI_DEFAULTS_EN` variable names; set values per locale there.
 */

export type SectionExerciseTranslationRow = {
  key: string;
  values?: Record<string, string>;
};

/** Normalize language code for lookup (matches Translation.language rows). */
function langPrimary(code: string): string {
  return String(code || 'en')
    .toLowerCase()
    .split('-')[0];
}

export function resolveSectionExerciseUi(
  rows: SectionExerciseTranslationRow[] | null | undefined,
  langCode: string,
  dbKey: string
): string {
  const fallback = SECTION_EXERCISE_UI_DEFAULTS_EN[dbKey];
  const row = rows?.find((r) => r.key === dbKey);
  if (!row?.values || typeof row.values !== 'object') return fallback ?? dbKey;
  const prim = langPrimary(langCode);
  const raw =
    row.values[prim] ??
    row.values[langCode] ??
    row.values.en ??
    row.values.EN ??
    '';
  const s = String(raw).trim();
  return s || fallback || dbKey;
}

/** DB keys + default English (shown until admins add translations). */
export const SECTION_EXERCISE_UI_DEFAULTS_EN: Record<string, string> = {
  SectionExercise_CheckboxAvailable: 'Exercise available',

  SectionExercise_NavBasics: 'Basics',
  SectionExercise_NavMultimedia: 'Multimedia',
  SectionExercise_NavExecution: 'Execution',
  SectionExercise_NavSuggestions: 'Suggestions',
  SectionExercise_NavBreathing: 'Breathing',
  SectionExercise_NavMistakes: 'Mistakes',
  SectionExercise_NavFaqs: 'FAQs',
  SectionExercise_NavEquipment: 'Equipment',
  SectionExercise_NavPathologies: 'Pathologies',
  SectionExercise_NavMuscles: 'Muscles',
  SectionExercise_NavMore: 'More',
  SectionExercise_NavRelated: 'Related exercises',

  SectionExercise_RelatedTitle: 'Related exercises (twinned)',
  SectionExercise_RelatedIntro:
    'Select one or more exercises linked to this one. Use search and the area filter to find entries in the catalog, then check those that are related (twinned) to the current exercise.',
  SectionExercise_RelatedSearchLabel: 'Search',
  SectionExercise_RelatedSearchPlaceholder: 'Name or reference code…',
  SectionExercise_RelatedSearchButton: 'Search',
  SectionExercise_RelatedAreaFilter: 'Filter by area',
  SectionExercise_RelatedAreaAll: 'All areas',
  SectionExercise_RelatedSelectedCount: 'Related selected',
  SectionExercise_RelatedClear: 'Clear',
  SectionExercise_RelatedEmpty: 'No exercises match your search and filter.',
  SectionExercise_RelatedPreviewTitle: 'Male pictures preview',
  SectionExercise_RelatedPreviewHint: 'Click an exercise in the list to preview Picture A and Picture B (male).',
  SectionExercise_RelatedPreviewEmpty: 'Select an exercise from the list to preview pictures.',
  SectionExercise_RelatedSelectAllVisible: 'Select all shown',
  SectionExercise_RelatedDeselectVisible: 'Deselect shown',
  SectionExercise_RelatedListHint:
    'Check exercises to link as twinned / related. Click a row to preview male Picture A and B on the right.',

  SectionExercise_Label1CoreTitle: 'Input form — label 1 (core catalog fields)',
  SectionExercise_CodeLabel: 'Code',
  SectionExercise_ReferenceCodePlaceholder: 'Reference code',
  SectionExercise_EditMultilingualNamesTitle: 'Edit multilingual names',
  SectionExercise_SharingLabel: 'Shared by',
  SectionExercise_DifficultyLabel: 'Difficulty',
  SectionExercise_DifficultyHint: '(select one or more)',
  SectionExercise_DifficultyBeginner: 'Beginner',
  SectionExercise_DifficultyIntermediate: 'Intermediate',
  SectionExercise_DifficultyAdvanced: 'Advanced',
  SectionExercise_DifficultyElite: 'Elite',
  SectionExercise_DifficultyProfessional: 'Professional',
  SectionExercise_SharedByUsernameLabel: 'Username who shared',
  SectionExercise_SharedByMovesbookPlaceholder: 'Movesbook staff label (optional)',
  SectionExercise_SharedByGenericPlaceholder: 'Username or staff label (optional)',

  SectionExercise_PanelDetailsMultimediaTitle: 'Input form — details & multimedia',
  SectionExercise_CurrentSectionPrefix: 'Current section:',
  SectionExercise_TabMultimediaFiles: 'Multimedia files',
  SectionExercise_TabExecutionExercise: 'Execution exercise',
  SectionExercise_TabSuggestions: 'Suggestions',
  SectionExercise_TabBreathing: 'Breathing',
  SectionExercise_TabCommonMistakes: 'Common mistakes',
  SectionExercise_TabFaqs: 'FAQs',
  SectionExercise_TabEquipment: 'Equipment',
  SectionExercise_TabContraindicatedPathologies: 'Contraindicated pathologies',

  SectionExercise_Label2Tag: 'Input form — label 2',
  SectionExercise_Label2Title: 'How to execute the exercise',
  SectionExercise_Label3Tag: 'Input form — label 3',
  SectionExercise_Label3Title: 'Suggestions of the experts',
  SectionExercise_Label4Tag: 'Input form — label 4',
  SectionExercise_Label4Title: 'Breathing',
  SectionExercise_Label5Tag: 'Input form — label 5',
  SectionExercise_Label5Title: 'Mistakes',

  SectionExercise_RichHelpParagraph:
    'Enter the full detail for this exercise in each supported language — same sections and flow as Settings → Language → Long texts: rich text per language, English as the source, then Translation (/api/translate), then review and edit every locale below (including manual edits when needed).',

  SectionExercise_RichWorkflowFallback:
    'Same workflow as Settings → Language → Long texts: English source, then Translation (/api/translate), then review other languages.',

  SectionExercise_RichEnglishTitle: 'English (Source)',
  SectionExercise_RichEnglishHint: "Enter your text in English — we'll translate it for you.",
  SectionExercise_BtnTranslation: 'Translation',
  SectionExercise_BtnTranslating: 'Translating…',
  SectionExercise_BtnSave: 'Save',
  SectionExercise_BtnManualEdit: 'Manual Edit',
  SectionExercise_TranslationsReadyBanner: 'Translations ready! Review and edit if needed.',
  SectionExercise_RichTranslationLabel: 'Translation',
  SectionExercise_RichPlaceholderEn: 'English source text…',
  SectionExercise_RichCharsSuffix: 'characters (text only)',

  SectionExercise_Label7Tag: 'Input form — label 7',
  SectionExercise_Label7Title: 'FAQs of the current exercise',
  SectionExercise_FaqIntroParagraph:
    "Each exercise can have its own FAQs about that movement. Entries are stored on the exercise. Use Add to create a FAQ: enter the question in every supported language (short strings per locale) and the answer as long text per language — same pattern as Settings → Language → Long phrases / Long texts. After save, each FAQ can be edited, deleted, or moved within this exercise's list. All FAQs are listed below with previews.",

  SectionExercise_FaqEmptyState:
    'No FAQs for this exercise yet. Press Add to open the editor and create the first entry (label 7).',
  SectionExercise_FaqListHeading: 'All FAQs for this exercise',
  SectionExercise_FaqBadge: 'FAQ',
  SectionExercise_FaqNoQuestion: 'No question yet — Edit',
  SectionExercise_FaqNoAnswer: 'No answer text yet — Edit',
  SectionExercise_FaqQuestionPrefix: 'Q ',
  SectionExercise_FaqAnswerPrefix: 'A ',
  SectionExercise_FaqBtnEdit: 'Edit',
  SectionExercise_FaqBtnDelete: 'Delete',
  SectionExercise_FaqBtnAdd: 'Add',

  SectionExercise_MultimediaIntro:
    'Official pictures, video, and reference URLs are part of Input form — label 1 above.',
  SectionExercise_MultimediaJumpButton: 'Jump to official pictures & video',
  SectionExercise_MultimediaFootnote:
    'This tab is reserved for future extras (e.g. ethnicity-specific media). Catalog fields stay in Basics so label 1 stays in one place.',

  SectionExercise_EquipmentIntro:
    'Machines usually used — from Technical Settings → Machines.',
  SectionExercise_EquipmentSelectMachines: 'Select machines…',
  SectionExercise_EquipmentSelectedCount: 'Selected',

  SectionExercise_PathologiesBannerTitle: 'Contraindicated pathologies (multitag)',
  SectionExercise_PathologiesBannerBody:
    'Tag conditions for which this exercise is not suggested. The list comes from Technical Settings → Pathologies (same idea as sports: manage the catalog there, then multitag here).',
  SectionExercise_PathologyTagsLabel: 'Pathology tags',
  SectionExercise_PathologyTagsHint: '(not suggested)',
  SectionExercise_PathologiesEmptyHint:
    'Add pathology tags under Technical Settings → Pathologies first.',
  SectionExercise_PathologiesMultiHint:
    'Hold Ctrl / ⌘ to select several tags.',
  SectionExercise_CheckAll: 'Check all',
  SectionExercise_Clear: 'Clear',
  SectionExercise_PathologiesPicturesLabel: 'Pictures of selected pathologies',
  SectionExercise_PathologiesPicturesEmpty: 'Select pathology tags to preview their catalog pictures here.',
  SectionExercise_PathologiesInfoTitle: 'Info & Contraindications',
  SectionExercise_PathologiesInfoHelp:
    'Exercise-specific info and contraindications — rich text per language, same workflow as Execution, Suggestions, and Breathing (English source, then Translation).',
  SectionExercise_PathologiesNotesLabel: 'Info & Contraindications',
  SectionExercise_PathologiesNotesHelp:
    'Rich text per language for this exercise: extra contraindication notes beyond the tagged catalog entries.',
  SectionExercise_PathologiesNotesPlaceholder:
    'Enter English info and contraindications for this exercise…',

  SectionExercise_Label6Tag: 'Input form — label 6',
  SectionExercise_Label6Title: 'Select the muscular areas interested',
  SectionExercise_Label6Intro:
    'Selection tagging the areas interested. Choose one main muscular area and assign it a percentage, then tag any additional areas and give each a percentage. Every tagged row must use a distinct area.',
  SectionExercise_Label6Bullet1:
    'Main area with % — one row marked Main; this should match the main group chosen in Label 1 when possible.',
  SectionExercise_Label6Bullet2:
    'Tag other areas with % — add rows with the button below; set each area and its share of involvement.',
  SectionExercise_Label6Footnote:
    'All percentages together must total exactly 100%. Each muscular area can appear only once in the list.',

  SectionExercise_MusclesTotal: 'Total:',
  SectionExercise_MusclesAdjust: '(adjust until exactly 100%)',
  SectionExercise_MusclesMainRowLabel: 'Main area (with %)',
  SectionExercise_MusclesTaggedRowLabel: 'Tagged area (with %)',
  SectionExercise_MusclesPercentLabel: '%',
  SectionExercise_MusclesMainBadge: 'Main',
  SectionExercise_MusclesRemove: 'Remove',
  SectionExercise_MusclesAddRow: '+ Tag another area with %',

  SectionExercise_MoreTitle: 'Short description (optional)',
  SectionExercise_MoreHelp:
    'One-line or short summary for lists — enter English first, then use Translation or edit each language manually (same workflow as Execution, Suggestions, and Breathing). Use Label 6 for muscle % and the FAQs tab for question + answer pairs.',
  SectionExercise_MorePlaceholder: 'Brief summary for tables and cards',
  SectionExercise_MoreEnglishHint: 'English is the source language for automatic translation into the other supported languages.',
  SectionExercise_MoreTranslationLabel: 'Short description',
  SectionExercise_MorePlaceholderLang: '{languageName} short description…',
  SectionExercise_MoreCharsSuffix: 'characters',

  SectionExercise_DeleteGuardTitle: 'Optional delete protection',
  SectionExercise_DeleteGuardHelp:
    'If you set a password here, removing this exercise from the Exercise Bank (grid delete or bulk delete) requires typing this exact value. Leave empty for a normal confirm dialog only.',
  SectionExercise_DeleteGuardPlaceholder: 'Creator delete password (optional)',

  SectionExercise_BtnAdd: 'Add',
  SectionExercise_BtnCancel: 'Cancel',

  SectionExercise_DialogTitleDefault: 'Add/edit exercise',
  SectionExercise_BasicsJumpLabel6: 'Label 6 — Muscles',

  SectionExercise_RichPlaceholderLang: '{languageName} translation…',

  SectionExercise_FaqMoveUp: 'Move up',
  SectionExercise_FaqMoveDown: 'Move down',
  SectionExercise_FaqDeleteTitle: 'Delete this FAQ',
  SectionExercise_FaqAddAria: 'Add a FAQ for this exercise',

  SectionExercise_MusclesOkMark: '✓',

  SectionExercise_NameSectionTitle: 'Name of the exercise — all languages',
  SectionExercise_NameSectionHint:
    'English is required. Enter every other language you need in the grid below (same pattern as Settings → Language → Long texts), or use the dialog for a larger workspace.',
  SectionExercise_NameFullScreenEditor: 'Full-screen editor (all languages)',
  SectionExercise_NameEnglishRequired: 'English',
  SectionExercise_NameEnglishRequiredSuffix: '(required)',
  SectionExercise_NameEnglishPlaceholder:
    'Exercise name in English — you can use two lines for longer titles',
  SectionExercise_NameTranslationsHeading: 'Translations',
  SectionExercise_NameTranslationsOptional: '(optional)',
  SectionExercise_NameModalTitle: 'Exercise name — all languages',
  SectionExercise_NameModalHint:
    'English is required for the bank; all other languages are optional — same idea as Language → Long texts. Use multiple lines if the title is long.',
  SectionExercise_NameModalDone: 'Done',
  SectionExercise_NameModalPlaceholderEn: 'Exercise name in English (required)',
  SectionExercise_NameModalPlaceholderLang: 'Translation',

  SectionExercise_ReferenceUrl1: 'Reference URL 1',
  SectionExercise_ReferenceUrl2: 'Reference URL 2',
  SectionExercise_ReferencePlaceholder1: 'URL 1',
  SectionExercise_ReferencePlaceholder2: 'URL 2',

  SectionExercise_OfficialPicturesTitle: 'Official pictures & video',
  SectionExercise_GenderMale: 'Male',
  SectionExercise_GenderFemale: 'Female',
  SectionExercise_PictureAMale: 'Picture A male',
  SectionExercise_PictureBMale: 'Picture B male',
  SectionExercise_PictureAFemale: 'Picture A female',
  SectionExercise_PictureBFemale: 'Picture B female',
  SectionExercise_ImageUrlPlaceholder: 'Image URL',
  SectionExercise_PictureUrlLabel: 'Picture — URL',
  SectionExercise_OfficialVideoUrlLabel: 'Official video — URL',
  SectionExercise_OfficialVideoUrlPlaceholder: 'Paste video URL',
  SectionExercise_OfficialVideoLocalLabel: 'Official video — load from local',
  SectionExercise_PictureLocalLabel: 'Picture — load from local',
  SectionExercise_ReferenceVideoPreview: 'Video preview',
  SectionExercise_ReferenceVideoPreviewUnavailable:
    'Cannot preview this URL inline. Open the link in a new tab to watch.',
  SectionExercise_ReferenceVideoOpenLink: 'Open link',
  SectionExercise_NameEnglishTitle: 'English',
};

/** Map lower-form tab id → translation DB key (defaults above). */
export const SECTION_EXERCISE_TAB_UI_KEYS: Record<
  | 'multimedia'
  | 'execution'
  | 'suggestions'
  | 'breathing'
  | 'mistakes'
  | 'faqs'
  | 'equipment'
  | 'pathologies',
  string
> = {
  multimedia: 'SectionExercise_TabMultimediaFiles',
  execution: 'SectionExercise_TabExecutionExercise',
  suggestions: 'SectionExercise_TabSuggestions',
  breathing: 'SectionExercise_TabBreathing',
  mistakes: 'SectionExercise_TabCommonMistakes',
  faqs: 'SectionExercise_TabFaqs',
  equipment: 'SectionExercise_TabEquipment',
  pathologies: 'SectionExercise_TabContraindicatedPathologies',
};
