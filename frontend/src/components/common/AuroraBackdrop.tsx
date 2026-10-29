import styled from 'styled-components';
import { auroraBackdrop } from '../../styles/animations';

/**
 * Animated gradient layer that fills its nearest positioned ancestor (the host needs `position: relative`
 * and should lift its own content above it with `position: relative; z-index: 1`).
 * Fades in/out with `$visible`; hidden layers stop painting via `visibility`.
 */
export const AuroraBackdrop = styled.div.attrs({ 'aria-hidden': true })<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  ${auroraBackdrop}
  opacity: ${({ $visible, theme }) => ($visible ? (theme.mode === 'dark' ? 0.22 : 0.3) : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transition: opacity 700ms ease, visibility 0s linear ${({ $visible }) => ($visible ? '0s' : '700ms')};
`;
