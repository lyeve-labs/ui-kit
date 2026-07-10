import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ThemeToggle from './ThemeToggle.svelte';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('renders a toggle button labelled for the current (dark) theme', () => {
    const { getByRole } = render(ThemeToggle);
    expect(getByRole('button').getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('flips the theme and its label when clicked', async () => {
    const { getByRole } = render(ThemeToggle);
    const btn = getByRole('button');
    await fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark mode');
  });
});
