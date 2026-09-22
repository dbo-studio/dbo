import locales from '@/locales';
import { Box } from '@mui/material';
import QRCode from 'qrcode';
import { type JSX, useEffect, useState } from 'react';

type TotpSetupQrProps = {
  otpauthUrl: string;
};

export function TotpSetupQr({ otpauthUrl }: TotpSetupQrProps): JSX.Element | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(otpauthUrl, { width: 160, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
        }
      });

    return (): void => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  if (!dataUrl) {
    return null;
  }

  return (
    <Box
      component='img'
      src={dataUrl}
      alt={locales.auth_totp_qr_alt}
      data-testid='auth-totp-qr'
      sx={{
        width: 160,
        height: 160,
        flexShrink: 0,
        borderRadius: 1,
        bgcolor: 'background.paper'
      }}
    />
  );
}
