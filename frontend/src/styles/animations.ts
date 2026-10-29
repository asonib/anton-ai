import { css, keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

export const messageEnter = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

export const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
`;

export const shimmer = keyframes`
  0%   { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

export const typingBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0) scale(0.8); opacity: 0.45; }
  40%           { transform: translateY(-5px) scale(1); opacity: 1; }
`;

/** Pulsing ring in the given colour (pass `theme.colors.glow`). */
export const pulseRing = (color: string) => keyframes`
  0%   { box-shadow: 0 0 0 0 ${color}; }
  70%  { box-shadow: 0 0 0 10px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const popIn = keyframes`
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); }
`;

export const shake = keyframes`
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
`;

/** Reusable skeleton shimmer mixin. */
export const skeletonShimmer = css`
  background: ${({ theme }) => theme.colors.skeleton};
  background-image: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.skeleton} 0px,
    ${({ theme }) => theme.colors.skeletonHighlight} 120px,
    ${({ theme }) => theme.colors.skeleton} 240px
  );
  background-size: 936px 100%;
  animation: ${shimmer} 1.3s linear infinite;
`;

/**
 * Gradient fill for primary call-to-action buttons. Uses `theme.colors.primaryGradient`
 * (so it follows the active palette and dark/light mode); on hover the gradient slides and glows.
 */
export const gradientFill = css`
  background-color: ${({ theme }) => theme.colors.primary};
  background-image: ${({ theme }) => theme.colors.primaryGradient};
  background-size: 200% 100%;
  background-position: 0% 50%;
  color: ${({ theme }) => theme.colors.onPrimary};
  transition: background-position ${({ theme }) => theme.transitions.slow}, box-shadow ${({ theme }) => theme.transitions.base},
    transform ${({ theme }) => theme.transitions.fast}, opacity ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-position: 100% 50%;
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }
`;

/** Slides a 200%-wide, two-period gradient one full period to the right — loops seamlessly. */
export const borderFlow = keyframes`
  from { background-position: 100% 50%; }
  to   { background-position: 0% 50%; }
`;

/**
 * Animated gradient border (left → right) drawn on a ::before layer, so the element keeps its own
 * background. The host needs `position: relative`, a `border-radius`, and a transparent border of the same width.
 */
export const flowingBorder = (width = '1.5px') => css`
  &::before {
    content: '';
    position: absolute;
    inset: -${width};
    padding: ${width};
    border-radius: inherit;
    pointer-events: none;
    background-image: linear-gradient(
      90deg,
      ${({ theme }) => theme.colors.primary},
      ${({ theme }) => theme.colors.accent},
      ${({ theme }) => theme.colors.primaryHover},
      ${({ theme }) => theme.colors.primary},
      ${({ theme }) => theme.colors.accent},
      ${({ theme }) => theme.colors.primaryHover},
      ${({ theme }) => theme.colors.primary}
    );
    background-size: 200% 100%;
    animation: ${borderFlow} 4s linear infinite;
    opacity: 0.75;
    transition: opacity ${({ theme }) => theme.transitions.base};
    /* Show only the padding ring, not the centre */
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }
`;
