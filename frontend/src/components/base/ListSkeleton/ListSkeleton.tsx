import { Skeleton } from '@mui/material';
import type { JSX } from 'react';
import { ListSkeletonRowStyled } from './ListSkeleton.styled';

/** Placeholder rows sized like `ListRow`, shown while a list's first load is in flight. */
export default function ListSkeleton({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div aria-busy='true' data-testid='list-skeleton'>
      {Array.from({ length: rows }, (_, index) => (
        <ListSkeletonRowStyled key={index}>
          <Skeleton variant='rounded' width={20} height={20} />
          <Skeleton variant='text' sx={{ flex: 1, maxWidth: `${70 - (index % 3) * 15}%` }} />
        </ListSkeletonRowStyled>
      ))}
    </div>
  );
}
