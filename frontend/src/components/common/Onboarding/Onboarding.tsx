import AccountStep from '@/components/common/Account/AccountStep/AccountStep';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import { Check } from 'lucide-react';
import { type JSX, useEffect, useState } from 'react';
import {
  OnboardingBodyStyled,
  OnboardingBrandStyled,
  OnboardingEyebrowStyled,
  OnboardingFooterStyled,
  OnboardingMainStyled,
  OnboardingShellStyled,
  OnboardingSideStyled,
  OnboardingTitleStyled,
  StepBadgeStyled,
  StepRowStyled
} from './Onboarding.styled';
import PrivacyStep from './PrivacyStep';
import ThemeStep from './ThemeStep';
import WelcomeStep from './WelcomeStep';
import { Typography } from '@mui/material';

export type OnboardingProps = {
  onFinish: () => void;
};

const KEYBOARD_IGNORED = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];

const STEPS = [
  {
    id: 'welcome',
    label: locales.onboarding_nav_welcome,
    eyebrow: locales.onboarding_welcome_eyebrow,
    title: locales.onboarding_welcome_title,
    body: locales.onboarding_welcome_body
  },
  {
    id: 'theme',
    label: locales.onboarding_nav_look,
    eyebrow: locales.onboarding_theme_eyebrow,
    title: locales.onboarding_theme_title,
    body: locales.onboarding_theme_body
  },
  {
    id: 'privacy',
    label: locales.onboarding_privacy_eyebrow,
    eyebrow: locales.onboarding_privacy_eyebrow,
    title: locales.onboarding_privacy_title,
    body: locales.onboarding_privacy_body
  },
  {
    id: 'account',
    label: locales.onboarding_nav_account,
    eyebrow: locales.onboarding_nav_account,
    title: locales.onboarding_account_title,
    body: locales.onboarding_account_body
  }
];

/** First-run setup: a fixed-size dialog with a step rail on the left and one calm step on the right. */
export default function Onboarding({ onFinish }: OnboardingProps): JSX.Element {
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // A focused control owns Enter and the arrows.
      if (e.target instanceof HTMLElement && KEYBOARD_IGNORED.includes(e.target.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        setStep((s) => Math.min(s + 1, last));
      } else if (e.key === 'ArrowLeft') {
        setStep((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => window.removeEventListener('keydown', onKey);
  }, [last]);

  return (
    <Modal open padding='0'>
      <OnboardingShellStyled role='dialog' aria-modal='true' aria-label={current.title} data-testid='onboarding'>
        <OnboardingSideStyled>
          <OnboardingBrandStyled>
            <img src='/app-icon/icon-512.png' alt='' draggable={false} />
            <span>{locales.auth_product_name}</span>
          </OnboardingBrandStyled>
          <Box
            component='nav'
            aria-label={locales.onboarding_step_of
              .replace('{n}', String(step + 1))
              .replace('{total}', String(STEPS.length))}
            sx={{ display: 'grid', gap: 0.5, position: 'relative' }}
          >
            {STEPS.map((item, index) => {
              const state = index < step ? 'done' : index === step ? 'active' : 'todo';

              return (
                <StepRowStyled key={item.id} state={state} disabled={index > step} onClick={(): void => setStep(index)}>
                  <StepBadgeStyled state={state}>{state === 'done' ? <Check size={12} /> : index + 1}</StepBadgeStyled>
                  <Typography variant='body2' sx={{ fontWeight: 'inherit' }}>
                    {item.label}
                  </Typography>
                </StepRowStyled>
              );
            })}
          </Box>
        </OnboardingSideStyled>

        <OnboardingMainStyled>
          <OnboardingBodyStyled key={current.id}>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <OnboardingEyebrowStyled>{current.eyebrow}</OnboardingEyebrowStyled>
              <OnboardingTitleStyled>{current.title}</OnboardingTitleStyled>
              <Typography variant='body2' color='text.secondary'>
                {current.body}
              </Typography>
            </Box>
            {current.id === 'welcome' && <WelcomeStep />}
            {current.id === 'theme' && <ThemeStep />}
            {current.id === 'privacy' && <PrivacyStep />}
            {current.id === 'account' && <AccountStep onDone={onFinish} />}
          </OnboardingBodyStyled>

          <OnboardingFooterStyled>
            {step > 0 && (
              <Button onClick={(): void => setStep(step - 1)} data-testid='onboarding-back'>
                {locales.onboarding_back}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {step < last ? (
              <>
                <Button onClick={onFinish} data-testid='onboarding-skip'>
                  {locales.onboarding_skip}
                </Button>
                <Button variant='contained' onClick={(): void => setStep(step + 1)} data-testid='onboarding-next'>
                  {locales.onboarding_next}
                </Button>
              </>
            ) : (
              <Button variant='contained' onClick={onFinish} data-testid='onboarding-finish'>
                {locales.onboarding_finish}
              </Button>
            )}
          </OnboardingFooterStyled>
        </OnboardingMainStyled>
      </OnboardingShellStyled>
    </Modal>
  );
}
