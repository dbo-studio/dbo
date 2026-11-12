import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { variables } from '@/core/theme/variables';
import { Box, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { CONNECTOR_BRAND_LOGOS, CONNECTOR_COLORS, specOf } from './connectorTypes';

/** A connector's icon: the provider's real logo when it has one, else a white glyph on a brand colour. */
export default function ConnectorIcon({ type, size = 32 }: { type: string; size?: number }): JSX.Element {
  const spec = specOf(type);
  const theme = useTheme();
  const logo = CONNECTOR_BRAND_LOGOS[type];

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: variables.radius.small,
        ...(logo
          ? { background: theme.palette.common.white, border: `1px solid ${theme.palette.divider}` }
          : { background: CONNECTOR_COLORS[type] ?? theme.palette.grey[600] })
      }}
    >
      {logo ? (
        <img src={`/icons/brand_${logo}.svg`} alt='' width={size * 0.62} height={size * 0.62} />
      ) : (
        <CustomIcon type={spec?.icon ?? 'cloud'} size='s' color={theme.palette.common.white} />
      )}
    </Box>
  );
}
