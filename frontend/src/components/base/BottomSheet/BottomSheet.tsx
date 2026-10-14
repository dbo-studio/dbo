import { Typography } from '@mui/material';
import type { JSX } from 'react';
import {
  BottomSheetContentStyled,
  BottomSheetHandleStyled,
  BottomSheetHeaderStyled,
  BottomSheetStyled
} from './BottomSheet.styled';
import type { BottomSheetProps } from './types';

const noop = (): void => {};

export default function BottomSheet({
  open,
  onClose,
  title,
  actions,
  fullHeight,
  children
}: BottomSheetProps): JSX.Element {
  return (
    <BottomSheetStyled
      anchor='bottom'
      open={open}
      onClose={onClose}
      onOpen={noop}
      disableSwipeToOpen
      fullHeight={fullHeight}
    >
      <BottomSheetHandleStyled />
      {(title || actions) && (
        <BottomSheetHeaderStyled>
          <Typography variant='h6' color='textTitle'>
            {title}
          </Typography>
          {actions}
        </BottomSheetHeaderStyled>
      )}
      <BottomSheetContentStyled>{children}</BottomSheetContentStyled>
    </BottomSheetStyled>
  );
}
