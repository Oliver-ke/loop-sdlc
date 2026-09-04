import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Page from './page';

describe('home page', () => {
  it('renders the control room heading', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', { name: /loop control room/i }),
    ).toBeInTheDocument();
  });
});
