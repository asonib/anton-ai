import styled, { css } from 'styled-components';
import { spin } from '../../styles/animations';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';

export const Button = styled.button<{ $variant?: Variant; $block?: boolean; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  padding: ${({ $size, theme }) => ($size === 'sm' ? `${theme.space.xs} ${theme.space.md}` : `${theme.space.md} ${theme.space.lg}`)};
  font-size: ${({ $size, theme }) => ($size === 'sm' ? theme.fontSizes.sm : theme.fontSizes.md)};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid transparent;
  transition: background ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast}, opacity ${({ theme }) => theme.transitions.fast};

  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.text};
          border-color: ${theme.colors.border};
          &:hover:not(:disabled) { background: ${theme.colors.surfaceHover}; border-color: ${theme.colors.borderStrong}; }
        `;
      case 'subtle':
        return css`
          background: ${theme.colors.surfaceHover};
          color: ${theme.colors.text};
          &:hover:not(:disabled) { background: ${theme.colors.border}; }
        `;
      case 'danger':
        return css`
          background: ${theme.colors.dangerSoft};
          color: ${theme.colors.danger};
          &:hover:not(:disabled) { border-color: ${theme.colors.danger}; }
        `;
      default:
        return css`
          background: ${theme.colors.primary};
          color: ${theme.colors.onPrimary};
          &:hover:not(:disabled) { background: ${theme.colors.primaryHover}; }
        `;
    }
  }}
`;

export const IconButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs};
  height: 30px;
  min-width: 30px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid transparent;
  background: ${({ $active, theme }) => ($active ? theme.colors.surfaceHover : 'transparent')};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${({ $size = 16 }) => $size}px;
  height: ${({ $size = 16 }) => $size}px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: ${spin} 0.7s linear infinite;
`;
