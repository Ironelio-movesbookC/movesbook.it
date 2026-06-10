/**
 * UX wireframe reference for **Add / Edit Exercise** (Section Exercise dialog, detail panel, FAQs, machines modal).
 *
 * Drop exported mockup PNGs under `public/design/exercise-editor/` so they load at
 * `/design/exercise-editor/<filename>` while implementing or reviewing layout.
 *
 * Suggested filenames (rename Cursor exports to match):
 * - `overview-flow.png` — full flow with modals
 * - `main-form-tabs.png` — header grid + tab strip + multimedia regions
 * - `long-text-tabs.png` — Execution / Suggestions / … stacked RTE + green banner
 * - `faq-editor.png` — FAQ question translation modal + multi-language answers
 * - `machines-usually-used.png` — purple header, pages, checklist + preview
 * - `multimedia-male-female.png` — Male | Female, Picture A/B, URLs, local load
 */
export const EXERCISE_EDITOR_WIREFRAME = {
  publicBasePath: '/design/exercise-editor',
  suggestedFilenames: [
    'overview-flow.png',
    'main-form-tabs.png',
    'long-text-tabs.png',
    'faq-editor.png',
    'machines-usually-used.png',
    'multimedia-male-female.png',
  ] as const,
} as const;

/** Checklist aligned with wireframes — keep UI changes traceable here. */
export const EXERCISE_EDITOR_LAYOUT_CHECKLIST = [
  'Modal shell: title + Enable exercise; sticky pill nav; scroll body; footer Save (primary red) + Cancel (dark).',
  'Label 1 core: two-column grid (typology / sports / equipment vs code + names / main / secondary / levels / sharing).',
  'Official media block: male + female Picture A/B URLs, official video URLs, reference URLs; file inputs where supported.',
  'Lower tabs (fixed order): Multimedia | Execution | Suggestions | Breathing | Mistakes | FAQs | Equipment | Pathologies.',
  'Labels 2–5: English “source” card (blue emphasis), Translate / Save / Manual edit, green “translations ready” strip, then per-locale grey RTE cards.',
  'Label 7 FAQs: list reorder/edit/delete; editor uses short multilingual Question table + long multilingual Answer stack.',
  'Equipment tab: opens Machines usually used — violet header, Reset, numeric pages, left checklist + right “Equipment selected” preview.',
  'Future: Multimedia tab ethnolinguistic region sub-tabs (Indo-European, Afrikan, …) per wireframe — wire into multimedia slot + model when schema exists.',
] as const;
