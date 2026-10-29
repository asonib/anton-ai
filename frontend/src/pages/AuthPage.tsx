import { Eye, EyeOff, Lock, Mail, Moon, Sparkles, Sun } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Button, IconButton, Spinner } from '../components/common/Button';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { appEnv } from '../config/env';
import { messageEnter } from '../styles/animations';
import { NormalisedError, toNormalisedError } from '../utils/errors';

type Mode = 'login' | 'register';

const Page = styled.main`
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space.xl};
  background:
    radial-gradient(1200px 600px at 10% -10%, ${({ theme }) => theme.colors.primarySoft}, transparent 60%),
    radial-gradient(900px 500px at 110% 110%, ${({ theme }) => theme.colors.primarySoft}, transparent 60%),
    ${({ theme }) => theme.colors.bg};
`;

const ThemeToggle = styled(IconButton)`
  position: fixed;
  top: ${({ theme }) => theme.space.lg};
  right: ${({ theme }) => theme.space.lg};
`;

const Card = styled.section`
  width: 100%;
  max-width: 420px;
  padding: ${({ theme }) => theme.space.xxl};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${messageEnter} 420ms ease both;
`;

const Logo = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.onPrimary};
  margin-bottom: ${({ theme }) => theme.space.lg};
  box-shadow: ${({ theme }) => theme.shadows.glow};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.xl};
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.space.xs} 0 ${({ theme }) => theme.space.xl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Tabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: ${({ theme }) => theme.space.xl};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgSunken};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.space.sm};
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: all ${({ theme }) => theme.transitions.base};
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.surface};
      color: ${theme.colors.text};
      box-shadow: ${theme.shadows.sm};
    `}
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
`;

const InputWrap = styled.div<{ $invalid?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};

  &:focus-within {
    border-color: ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.primary)};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
  > svg { margin-left: ${({ theme }) => theme.space.md}; color: ${({ theme }) => theme.colors.textSubtle}; flex-shrink: 0; }
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.md}`};
  border: none;
  outline: none;
  background: transparent;
  &::placeholder { color: ${({ theme }) => theme.colors.textSubtle}; }
`;

const Reveal = styled.button`
  background: none;
  border: none;
  padding: 0 ${({ theme }) => theme.space.md};
  color: ${({ theme }) => theme.colors.textSubtle};
  display: grid;
  place-items: center;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const FieldError = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 400;
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

function validate(mode: Mode, email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'E-mail is required';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid e-mail address';

  if (!password) errors.password = 'Password is required';
  else if (mode === 'register') {
    if (password.length < 8) errors.password = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Include at least one letter and one number';
    if (confirm !== password) errors.confirm = 'Passwords do not match';
  }
  return errors;
}

export function AuthPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const { login, register, isAuthenticated } = useAuth();
  const { mode: themeMode, toggle } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<NormalisedError | null>(null);

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const errors = validate(mode, email, password, confirm);
  const hasErrors = Object.keys(errors).length > 0;

  const switchMode = (next: Mode) => {
    setMode(next);
    setServerError(null);
    setTouched(false);
    navigate(next === 'login' ? '/login' : '/register', { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (hasErrors) return;

    setSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      if (mode === 'login') await login(credentials);
      else await register(credentials);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(toNormalisedError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <ThemeToggle type="button" onClick={toggle} aria-label="Toggle theme">
        {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </ThemeToggle>
      <Card>
        <Logo>
          <Sparkles size={22} />
        </Logo>
        <Title>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Title>
        <Subtitle>{appEnv.appName} — chat with Ollama, Claude, Gemini, ChatGPT and Grok from one place.</Subtitle>

        <Tabs role="tablist">
          <Tab type="button" role="tab" aria-selected={mode === 'login'} $active={mode === 'login'} onClick={() => switchMode('login')}>
            Sign in
          </Tab>
          <Tab type="button" role="tab" aria-selected={mode === 'register'} $active={mode === 'register'} onClick={() => switchMode('register')}>
            Register
          </Tab>
        </Tabs>

        <Form onSubmit={onSubmit} noValidate>
          {serverError && (
            <ErrorBanner message={serverError.message} details={serverError.details} onDismiss={() => setServerError(null)} />
          )}

          <FieldLabel>
            E-mail
            <InputWrap $invalid={touched && !!errors.email}>
              <Mail size={16} />
              <Input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </InputWrap>
            {touched && errors.email && <FieldError>{errors.email}</FieldError>}
          </FieldLabel>

          <FieldLabel>
            Password
            <InputWrap $invalid={touched && !!errors.password}>
              <Lock size={16} />
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'Min. 8 chars, letters + numbers' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Reveal type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Reveal>
            </InputWrap>
            {touched && errors.password && <FieldError>{errors.password}</FieldError>}
          </FieldLabel>

          {mode === 'register' && (
            <FieldLabel>
              Confirm password
              <InputWrap $invalid={touched && !!errors.confirm}>
                <Lock size={16} />
                <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </InputWrap>
              {touched && errors.confirm && <FieldError>{errors.confirm}</FieldError>}
            </FieldLabel>
          )}

          <Button type="submit" $block disabled={submitting}>
            {submitting && <Spinner />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </Form>
      </Card>
    </Page>
  );
}
