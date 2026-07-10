import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar.svelte';

describe('Avatar', () => {
  it('derives up to two initials from the name', () => {
    const { getByText } = render(Avatar, { props: { name: 'Jane Doe' } });
    expect(getByText('JD')).toBeTruthy();
  });

  it('uses only the first two words for initials', () => {
    const { getByText } = render(Avatar, { props: { name: 'Ada B Lovelace' } });
    expect(getByText('AB')).toBeTruthy();
  });

  it('sets the name as the title', () => {
    const { container } = render(Avatar, { props: { name: 'Sam' } });
    expect(container.querySelector('span[title="Sam"]')).toBeTruthy();
  });

  it('applies the md size wrapper by default and lg when requested', () => {
    const md = render(Avatar, { props: { name: 'Sam' } });
    expect(md.container.querySelector('.w-8')).toBeTruthy();
    const lg = render(Avatar, { props: { name: 'Sam', size: 'lg' } });
    expect(lg.container.querySelector('.w-10')).toBeTruthy();
  });

  it('renders an image when src is provided', () => {
    const { container } = render(Avatar, {
      props: { name: 'Sam', src: 'https://example.com/a.png' },
    });
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Sam');
  });
});
