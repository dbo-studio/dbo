import AccountStep from '@/components/common/Account/AccountStep/AccountStep';
import locales from '@/locales';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import {
  OnboardingBodyStyled,
  OnboardingBrandStyled,
  OnboardingButtonStyled,
  OnboardingCopyStyled,
  OnboardingCounterStyled,
  OnboardingEyebrowStyled,
  OnboardingFooterStyled,
  OnboardingPanelStyled,
  OnboardingProgressStyled,
  OnboardingRootStyled,
  OnboardingSegmentStyled,
  OnboardingStageStyled,
  OnboardingTitleStyled,
  OnboardingTopStyled
} from './Onboarding.styled';
import { STEP_COPY, STEP_VISUALS } from './OnboardingVisuals';
import PrivacyStep from './PrivacyStep';
import ThemeStep from './ThemeStep';

export type OnboardingProps = {
  onFinish: () => void;
};

const KEYBOARD_IGNORED = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];

/** First-run tour: what DBO does, then the look, analytics, and an optional account. Every step can be skipped. */
export default function Onboarding({ onFinish }: OnboardingProps): JSX.Element {
  const [step, setStep] = useState(0);
  const last = STEP_COPY.length - 1;
  const current = STEP_COPY[step];
  const Visual = STEP_VISUALS[current.id];

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

  const renderPanel = (): JSX.Element => {
    if (Visual) {
      return <Visual />;
    }
    if (current.id === 'theme') {
      return <ThemeStep />;
    }
    if (current.id === 'privacy') {
      return <PrivacyStep />;
    }

    return (
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <AccountStep onDone={onFinish} />
      </Box>
    );
  };

  return (
    <OnboardingRootStyled role='dialog' aria-modal='true' aria-label={current.title} data-testid='onboarding'>
      <OnboardingTopStyled>
        <OnboardingBrandStyled>
          <img src='/app-icon/icon-512.png' alt='' draggable={false} />
          <span>{locales.auth_product_name}</span>
        </OnboardingBrandStyled>
        <OnboardingProgressStyled
          aria-label={locales.onboarding_step_of
            .replace('{n}', String(step + 1))
            .replace('{total}', String(STEP_COPY.length))}
        >
          {STEP_COPY.map((item, index) => (
            <OnboardingSegmentStyled key={item.id} state={index < step ? 'done' : index === step ? 'active' : 'todo'} />
          ))}
        </OnboardingProgressStyled>
        <Box sx={{ minWidth: 96, display: 'flex', justifyContent: 'flex-end' }}>
          {step < last && (
            <OnboardingButtonStyled onClick={onFinish} sx={{ height: 36 }} data-testid='onboarding-skip'>
              {locales.onboarding_skip}
            </OnboardingButtonStyled>
          )}
        </Box>
      </OnboardingTopStyled>

      <OnboardingStageStyled>
        <OnboardingCopyStyled key={`copy-${current.id}`}>
          <OnboardingCounterStyled>
            {String(step + 1).padStart(2, '0')} / {String(STEP_COPY.length).padStart(2, '0')}
          </OnboardingCounterStyled>
          <OnboardingEyebrowStyled>{current.eyebrow}</OnboardingEyebrowStyled>
          <OnboardingTitleStyled>{current.title}</OnboardingTitleStyled>
          <OnboardingBodyStyled>{current.body}</OnboardingBodyStyled>
        </OnboardingCopyStyled>

        <OnboardingPanelStyled key={`panel-${current.id}`}>{renderPanel()}</OnboardingPanelStyled>
      </OnboardingStageStyled>

      <OnboardingFooterStyled>
        <OnboardingButtonStyled
          onClick={(): void => setStep((s) => Math.max(s - 1, 0))}
          sx={{ visibility: step === 0 ? 'hidden' : 'visible' }}
          data-testid='onboarding-back'
        >
          {locales.onboarding_back}
        </OnboardingButtonStyled>
        {step < last ? (
          <OnboardingButtonStyled tone='primary' onClick={(): void => setStep(step + 1)} data-testid='onboarding-next'>
            {locales.onboarding_next}
          </OnboardingButtonStyled>
        ) : (
          <OnboardingButtonStyled onClick={onFinish} sx={{ height: 36 }} data-testid='onboarding-finish'>
            {locales.onboarding_skip}
          </OnboardingButtonStyled>
        )}
      </OnboardingFooterStyled>
    </OnboardingRootStyled>
  );
}
