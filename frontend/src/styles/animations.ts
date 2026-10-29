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

export const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0.45); }
  70%  { box-shadow: 0 0 0 10px rgba(124, 92, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0); }
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
