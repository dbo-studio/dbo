import { variables } from '@/core/theme/variables';
import { Chip, styled } from '@mui/material';

export const CapabilityBadgeChipStyled = styled(Chip)({
  height: 18,
  fontSize: variables.fontSize.xxs,
  '& .MuiChip-label': { paddingLeft: 6, paddingRight: 6 }
});