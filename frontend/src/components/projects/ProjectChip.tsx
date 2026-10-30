import { FolderOpen, Github, X } from 'lucide-react';
import styled from 'styled-components';
import type { Project, ProjectDetail } from '../../api/types';

const Chip = styled.div`
  align-self: flex-start;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.xs} ${theme.space.xxs} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary}; }
`;

const Open = styled.button`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font-size: inherit;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover strong { text-decoration: underline; }
`;

const Detach = styled.button`
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSubtle};
  svg { color: inherit; }
  &:hover { background: ${({ theme }) => theme.colors.surfaceHover}; color: ${({ theme }) => theme.colors.text}; }
`;

interface Props {
  project: Project;
  detail: ProjectDetail | null;
  onOpen: () => void;
  onDetach: () => void;
}

/** Shown above the composer while a project is attached: its files go to the model with every prompt. */
export function ProjectChip({ project, detail, onOpen, onDetach }: Props) {
  const Icon = project.source === 'github' ? Github : FolderOpen;
  return (
    <Chip>
      <Open type="button" onClick={onOpen} title={project.rootPath}>
        <Icon size={13} aria-hidden />
        <span>Project context:</span>
        <strong>{project.name}</strong>
        {detail && <span>· {detail.stats.fileCount.toLocaleString()} files</span>}
      </Open>
      <Detach type="button" aria-label="Detach project" title="Detach project" onClick={onDetach}>
        <X size={13} />
      </Detach>
    </Chip>
  );
}
