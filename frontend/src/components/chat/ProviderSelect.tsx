import { ChevronDown, Cpu } from 'lucide-react';
import styled from 'styled-components';
import type { LLMProvider, ProviderInfo } from '../../api/types';

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const Field = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  > svg {
    position: absolute;
    pointer-events: none;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  > svg:first-child { left: 10px; }
  > svg:last-child { right: 10px; }
`;

const Select = styled.select`
  width: 100%;
  appearance: none;
  padding: ${({ theme }) => `${theme.space.sm} 32px ${theme.space.sm} 32px`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
  option { background: ${({ theme }) => theme.colors.bgElevated}; }
`;

const ModelHint = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ORDER: LLMProvider[] = ['ollama', 'anthropic', 'gemini', 'openai'];

interface Props {
  providers: ProviderInfo[];
  value: LLMProvider;
  onChange: (p: LLMProvider) => void;
  disabled?: boolean;
}

export function ProviderSelect({ providers, value, onChange, disabled }: Props) {
  const sorted = [...providers].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const current = providers.find((p) => p.id === value);

  return (
    <div>
      <Label htmlFor="provider-select">LLM provider</Label>
      <Field>
        <Cpu size={15} />
        <Select
          id="provider-select"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as LLMProvider)}
        >
          {sorted.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.configured}>
              {p.label}
              {p.isDefault ? ' — default' : ''}
              {!p.configured ? ' (not configured)' : ''}
            </option>
          ))}
        </Select>
        <ChevronDown size={15} />
      </Field>
      {current?.model && <ModelHint title={current.model}>Model: {current.model}</ModelHint>}
    </div>
  );
}
