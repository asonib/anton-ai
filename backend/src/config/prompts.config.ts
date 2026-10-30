/**
 * Prompt library configuration.
 *
 * - `PROMPT_CATEGORIES` is the fixed list of categories a prompt can belong to. The frontend loads it
 *   from `GET /prompts/categories` and maps `icon` to a lucide icon in `PromptCategoryIcon.tsx`
 *   (keep the two in sync).
 * - `BUILT_IN_PROMPTS` are shipped with the app ("Created by Anton AI"). They are upserted into the
 *   `prompts` table on server start (matched by `key`), so editing one here updates it everywhere;
 *   removing one here deletes it from the library (and from users' favourites).
 *
 * Prompt content may contain `[PLACEHOLDER]` slots; the UI selects the first slot after filling the
 * composer so the user can type straight over it.
 */

export const PROMPT_CATEGORY_ICONS = ['pen', 'code', 'chart', 'briefcase', 'graduation-cap', 'lightbulb', 'shield', 'sparkles'] as const;
export type PromptCategoryIcon = (typeof PROMPT_CATEGORY_ICONS)[number];

export interface PromptCategoryDefinition {
  /** Stable id stored in `prompts.category`. kebab-case, max 32 chars. */
  id: string;
  name: string;
  icon: PromptCategoryIcon;
}

export const PROMPT_CATEGORIES: readonly PromptCategoryDefinition[] = [
  { id: 'writing', name: 'Content Creation & Writing', icon: 'pen' },
  { id: 'engineering', name: 'Software Engineering', icon: 'code' },
  { id: 'analysis', name: 'Data & Analysis', icon: 'chart' },
  { id: 'business', name: 'Business & Strategy', icon: 'briefcase' },
  { id: 'audit', name: 'Audit & Compliance', icon: 'shield' },
  { id: 'learning', name: 'Learning & Research', icon: 'graduation-cap' },
  { id: 'ideas', name: 'Brainstorming', icon: 'lightbulb' },
  { id: 'other', name: 'Other', icon: 'sparkles' },
];

export interface BuiltInPromptDefinition {
  /** Stable identity used to upsert the row. Never change it once shipped. */
  key: string;
  title: string;
  /** One of `PROMPT_CATEGORIES[].id`. */
  category: string;
  content: string;
}

export const BUILT_IN_PROMPTS: readonly BuiltInPromptDefinition[] = [
  {
    key: 'slide-content',
    title: 'Slide Content',
    category: 'writing',
    content:
      'Turn the project inputs below into copy-ready slide content (text only, no HTML). For each slide give a title, 3–5 concise bullets and a one-line takeaway. If the inputs are too thin, ask me one focused question first. Do not invent metrics.\n\nInputs:\n[PASTE NOTES, METRICS OR DOCUMENT TEXT]',
  },
  {
    key: 'synthesize-feedback',
    title: 'Synthesize User Feedback',
    category: 'analysis',
    content:
      'You have received the output of user interviews. Synthesize the qualitative feedback into clear, actionable insights for upcoming design decisions. Group findings into themes, quote representative comments, rate each theme by frequency and severity, and finish with the top 3 recommendations.\n\nFeedback:\n[PASTE INTERVIEW NOTES]',
  },
  {
    key: 'code-review',
    title: 'Code Review',
    category: 'engineering',
    content:
      'Review the following [LANGUAGE] code for correctness, security, performance and readability. List issues by severity (blocker, major, minor) with the line and a suggested fix, then show the improved version.\n\n```\n[PASTE CODE]\n```',
  },
  {
    key: 'policy-review',
    title: 'Policy Review',
    category: 'audit',
    content:
      'Review the policy below against [STANDARD OR REGULATION]. Identify gaps, ambiguous wording and missing controls. Present the result as a table (section, finding, risk level, recommended wording) followed by a short summary for management.\n\nPolicy:\n[PASTE POLICY TEXT]',
  },
  {
    key: 'cutover-plan',
    title: 'Business Cutover Plan',
    category: 'business',
    content:
      'Draft a cutover plan for moving [SYSTEM OR PROCESS] to [TARGET]. Include scope, roles and responsibilities, a timeline (T-minus checklist), go/no-go criteria, rollback steps and a communication plan.',
  },
  {
    key: 'explain-concept',
    title: 'Explain a Concept',
    category: 'learning',
    content:
      'Explain [CONCEPT] to someone with a [BEGINNER / INTERMEDIATE / EXPERT] background. Start with a one-sentence definition, then an analogy, a worked example, common misconceptions and three questions I can use to check my understanding.',
  },
];
