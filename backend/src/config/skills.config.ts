/**
 * Skills = preset modes the user can pick from the skills bubble (top right of the chat screen).
 * Each skill changes the welcome screen (icon, title, description, sample prompts) and steers the
 * model through `instructions`, which are appended to `LLM_SYSTEM_PROMPT` on every request.
 *
 * This file is the single source of truth: the frontend loads the public fields from `GET /skills`.
 * `instructions` never leave the server.
 *
 * Sample prompts may contain `[PLACEHOLDER]` slots; the UI selects the first slot after filling the
 * composer so the user can type straight over it.
 */

/** Icon names the frontend knows how to render (mapped to lucide icons in `SkillIcon.tsx`). */
export const SKILL_ICONS = [
  'feather',
  'code',
  'lightbulb',
  'file-text',
  'mail',
  'languages',
  'graduation-cap',
  'bug',
  'chart',
  'sparkles',
] as const;
export type SkillIconName = (typeof SKILL_ICONS)[number];

export interface SkillDefinition {
  /** Stable id sent by the client (`skill` field of POST /chats/prompt). kebab-case. */
  id: string;
  name: string;
  icon: SkillIconName;
  /** Short line shown in the skills bubble. */
  tagline: string;
  /** Longer copy shown on the welcome screen. */
  description: string;
  /** 2–6 prompts. Clicking one fills the composer (it is not sent). */
  samplePrompts: string[];
  /** Extra system instructions for the model. Server-only. */
  instructions: string;
}

export const SKILLS: readonly SkillDefinition[] = Object.freeze([
  {
    id: 'writing-assistant',
    name: 'Writing Assistant',
    icon: 'feather',
    tagline: 'Emails, summaries and polished drafts',
    description:
      'Turn rough notes into clear, well-structured writing. Paste a draft or your notes, or start from one of the examples below.',
    samplePrompts: [
      'Help me organize these meeting notes into a clear and concise summary highlighting key points and next steps: [MEETING NOTES]',
      'Help me improve this draft of a client email for clarity, professionalism, and tone: [EMAIL DRAFT]',
      'Help me create talking points for a client meeting to discuss upcoming project milestones: [PROJECT DETAILS]',
      'Generate a follow-up email to a client recapping action items from a recent workshop: [WORKSHOP NOTES]',
    ],
    instructions: [
      'You are acting as a professional writing assistant.',
      'Produce clear, concise, well-structured prose in a professional but warm tone. Prefer short paragraphs and plain words.',
      'When the user shares a draft, return the improved version first, then a brief list of the main changes.',
      'When summarising notes, lead with the key points, then decisions, then action items with owners if known.',
      'If the user leaves a [PLACEHOLDER] unfilled, ask for that content instead of inventing it.',
    ].join(' '),
  },
  {
    id: 'coding-assistant',
    name: 'Coding Assistant',
    icon: 'code',
    tagline: 'Write, review and debug code',
    description:
      'Get working code, reviews and explanations. Share a snippet, an error message or a file, or start from an example below.',
    samplePrompts: [
      'Review this code for bugs, readability and performance, and suggest improvements: [CODE]',
      'Explain what this error means and how to fix it: [ERROR MESSAGE]',
      'Write unit tests for this function, covering edge cases: [FUNCTION]',
      'Refactor this code to be easier to read without changing its behavior: [CODE]',
    ],
    instructions: [
      'You are acting as a senior software engineer and pair programmer.',
      'Give correct, idiomatic, production-quality code in fenced blocks with a language tag.',
      'Explain the reasoning briefly, call out edge cases and trade-offs, and point out bugs or security issues you notice.',
      'Keep changes minimal when reviewing or refactoring, and show only the relevant parts unless asked for the full file.',
    ].join(' '),
  },
  {
    id: 'brainstorming-coach',
    name: 'Brainstorming Coach',
    icon: 'lightbulb',
    tagline: 'Generate and shape ideas',
    description:
      'Explore ideas from different angles, then narrow them down. Describe the problem or goal, or start from an example below.',
    samplePrompts: [
      'Brainstorm 10 creative ideas for [TOPIC], then group them by effort and impact',
      'Help me think through the pros, cons and risks of this idea: [IDEA]',
      'Suggest names for a new [PRODUCT OR PROJECT] that feel [TONE]',
      'Run a quick pre-mortem: imagine [PROJECT] failed in six months. What went wrong?',
    ],
    instructions: [
      'You are acting as a brainstorming coach and facilitator.',
      'Generate a wide range of distinct ideas before converging; include a few unconventional ones.',
      'Organise ideas with short headings or tables, and finish with a recommendation or the two or three strongest options and why.',
      'Ask one clarifying question when the goal or constraints are unclear.',
    ].join(' '),
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    icon: 'file-text',
    tagline: 'Condense documents and long text',
    description:
      'Get the gist of long documents fast. Attach a PDF or Word file, or paste text, then choose how you want it summarized.',
    samplePrompts: [
      'Summarize the attached document in 5 bullet points, then list any open questions',
      'Give me a one-paragraph executive summary of this text: [TEXT]',
      'Extract every action item, owner and deadline from these notes into a table: [NOTES]',
      'Explain this document to someone new to the topic, in plain language: [TEXT]',
    ],
    instructions: [
      'You are acting as an expert summarizer.',
      'Be faithful to the source: never add facts that are not in it, and say so when something is unclear or missing.',
      'Lead with the most important point. Use bullet points or tables where they make the summary easier to scan.',
      'Match the length the user asks for; default to a short summary followed by key details.',
    ].join(' '),
  },
]);
