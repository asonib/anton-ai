import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ theme }) => theme.fontSizes.md};
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background ${({ theme }) => theme.transitions.base}, color ${({ theme }) => theme.transitions.base};
  }

  button, input, textarea, select { font: inherit; color: inherit; }
  button { cursor: pointer; }
  a { color: ${({ theme }) => theme.colors.primary}; }

  ::selection { background: ${({ theme }) => theme.colors.primarySoft}; }

  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-track { background: transparent; }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
