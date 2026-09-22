import type { AuthTotpSetupResponse } from '@/api/auth/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { type JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  TotpSetupActionsStyled,
  TotpSetupModalBodyStyled,
  TotpSetupModalScanStyled,
  TotpSetupOrDividerStyled,
  TotpSetupPanelStyled,
  TotpSetupScanRowStyled,
  TotpSetupSecretRowStyled
} from './TotpSettings.styled';
import { TotpSetupQr } from './TotpSetupQr';

type TotpSetupPanelProps = {
  variant?: 'panel' | 'modal';
  setup: AuthTotpSetupResponse;
  enableCode: string;
  enableError: string | null;
  isEnabling: boolean;
  onEnableCodeChange: (value: string) => void;
  onCancel: () => void;
  onEnable: () => void;
};

export function TotpSetupPanel({
  variant = 'panel',
  setup,
  enableCode,
  enableError,
  isEnabling,
  onEnableCodeChange,
  onCancel,
  onEnable
}: TotpSetupPanelProps): JSX.Element {
  const [, copy] = useCopyToClipboard();

  const handleCopySecret = (): void => {
    void copy(setup.secret).then((ok) => {
      if (ok) {
        toast.success(locales.copied);
      }
    });
  };

  const Container = variant === 'modal' ? TotpSetupModalBodyStyled : TotpSetupPanelStyled;

  return (
    <Container data-testid='auth-totp-enable-form'>
      <Box>
        <Typography variant='caption' color='textSecondary' sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
          {locales.auth_totp_setup_step_scan}
        </Typography>
        {variant === 'modal' ? (
          <TotpSetupModalScanStyled>
            <TotpSetupQr otpauthUrl={setup.otpauthUrl} />
            <Typography variant='caption' color='textText' sx={{ lineHeight: 1.5, maxWidth: 280 }}>
              {locales.auth_totp_setup_scan_desc}
            </Typography>
          </TotpSetupModalScanStyled>
        ) : (
          <TotpSetupScanRowStyled>
            <TotpSetupQr otpauthUrl={setup.otpauthUrl} />
            <Typography variant='caption' color='textText' sx={{ pt: 0.5, lineHeight: 1.5 }}>
              {locales.auth_totp_setup_scan_desc}
            </Typography>
          </TotpSetupScanRowStyled>
        )}
      </Box>

      <TotpSetupOrDividerStyled>
        <Typography variant='caption' color='textSecondary'>
          {locales.auth_totp_setup_or}
        </Typography>
      </TotpSetupOrDividerStyled>

      <Box>
        <Typography variant='caption' color='textSecondary' sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
          {locales.auth_totp_setup_step_manual}
        </Typography>
        <TotpSetupSecretRowStyled>
          <Typography
            variant='body2'
            color='textTitle'
            data-testid='auth-totp-secret'
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.8125rem',
              letterSpacing: '0.04em',
              wordBreak: 'break-all'
            }}
          >
            {setup.secret}
          </Typography>
          <Tooltip title={locales.copy}>
            <IconButton
              size='small'
              onClick={handleCopySecret}
              aria-label={locales.copy}
              data-testid='auth-totp-secret-copy'
            >
              <CustomIcon type='copy' size='xs' />
            </IconButton>
          </Tooltip>
        </TotpSetupSecretRowStyled>
      </Box>

      <Stack spacing={1}>
        <Typography variant='caption' color='textSecondary' sx={{ fontWeight: 600 }}>
          {locales.auth_totp_setup_step_verify}
        </Typography>
        <FieldInput
          type='text'
          label={locales.auth_totp_code}
          value={enableCode}
          size='small'
          fullWidth={variant === 'modal'}
          onChange={(e): void => onEnableCodeChange(e.target.value)}
          inputProps={{
            'data-testid': 'auth-totp-enable-code',
            inputMode: 'numeric',
            maxLength: 6,
            autoComplete: 'one-time-code'
          }}
          sx={variant === 'modal' ? undefined : { maxWidth: 200 }}
        />
        {enableError ? <FormError mb={0} errors={[enableError]} /> : null}
      </Stack>

      <TotpSetupActionsStyled>
        <Button size='small' onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          variant='contained'
          size='small'
          disabled={isEnabling || enableCode.length < 6}
          data-testid='auth-totp-enable-submit'
          onClick={onEnable}
        >
          {locales.auth_totp_enable}
        </Button>
      </TotpSetupActionsStyled>
    </Container>
  );
}
