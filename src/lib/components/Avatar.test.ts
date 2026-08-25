import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
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

  // The handler sits on the wrapper rather than the image, because Svelte's
  // server renderer turns an onerror on an <img> into an inline attribute that
  // a script-src policy with a nonce refuses to run.
  it('leaves the image markup free of an inline handler', () => {
    const { container } = render(Avatar, {
      props: { name: 'Sam', src: 'https://example.com/a.png' },
    });
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('onerror')).toBeNull();
    expect(img.getAttribute('onload')).toBeNull();
  });

  it('falls back to initials when the image fails to load', async () => {
    const { container } = render(Avatar, {
      props: { name: 'Jane Doe', src: 'https://example.com/missing.png' },
    });
    const img = container.querySelector('img') as HTMLImageElement;

    // error does not bubble, so the wrapper only sees it in the capture phase.
    img.dispatchEvent(new Event('error'));
    await tick();

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('JD');
  });
});
