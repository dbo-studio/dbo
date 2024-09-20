import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ConnectionInfo from './ConnectionInfo';

describe('ConnectionInfo.tsx', () => {
  it('should render the the connection info', () => {
    render(
      <BrowserRouter>
        <ConnectionInfo />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('sql')).not.toBeNull();
    expect(screen.getByLabelText('databases')).not.toBeNull();
    expect(screen.getByLabelText('connections')).not.toBeNull();
  });
});
