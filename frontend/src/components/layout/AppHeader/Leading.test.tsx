import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Leading from './Leading';

describe('Leading.tsx', () => {
  test('should render the the Leading', () => {
    render(<Leading />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });
});
