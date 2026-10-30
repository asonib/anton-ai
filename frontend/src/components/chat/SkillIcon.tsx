import {
  BarChart3,
  Bug,
  Code2,
  Feather,
  FileText,
  GraduationCap,
  Languages,
  Lightbulb,
  Mail,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/** Mirrors `SKILL_ICONS` in `backend/src/config/skills.config.ts`. */
const ICONS: Record<string, LucideIcon> = {
  feather: Feather,
  code: Code2,
  lightbulb: Lightbulb,
  'file-text': FileText,
  mail: Mail,
  languages: Languages,
  'graduation-cap': GraduationCap,
  bug: Bug,
  chart: BarChart3,
  sparkles: Sparkles,
};

/** Renders a skill's icon by name. `null`/unknown → sparkle (also used for the general assistant). */
export function SkillIcon({ name, size = 18 }: { name?: string | null; size?: number }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon size={size} aria-hidden />;
}
