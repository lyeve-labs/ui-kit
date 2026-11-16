import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Button', () => {
  it('renders its children', () => {
    const { getByText } = render(Button, { props: { children: text('Save') } });
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders a <button> with type="button" by default', () => {
    const { container } = render(Button, { props: { children: text('x') } });
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('type')).toBe('button');
  });

  it('casts the raised shadow on the primary button at rest, under the pointer and on focus', () => {
    const { container } = render(Button, { props: { children: text('x') } });
    const classes = container.querySelector('button')!.className.split(/\s+/);
    expect(classes).toContain('shadow-raised');
    for (const cls of classes) {
      expect(cls).not.toMatch(/shadow-(?:glow|primary)/);
      expect(cls).not.toMatch(/^(?:hover|active|focus-visible):shadow-/);
    }
    expect(classes).toContain('transition-colors');
  });

  it('applies the primary variant class by default', () => {
    const { container } = render(Button, { props: { children: text('x') } });
    expect(container.querySelector('button')?.className).toContain('bg-brand');
  });

  it('applies the danger variant class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), variant: 'danger' },
    });
    expect(container.querySelector('button')?.className).toContain('bg-danger');
  });

  it('applies the secondary variant class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), variant: 'secondary' },
    });
    expect(container.querySelector('button')?.className).toContain('bg-surface-2');
  });

  it('draws the secondary and outline borders in the soft line, since the label marks the button', () => {
    for (const variant of ['secondary', 'outline'] as const) {
      const { container } = render(Button, { props: { children: text('x'), variant } });
      const classes = (container.querySelector('button')?.className ?? '').split(/\s+/);
      expect(classes, variant).toContain('border-line');
      expect(classes, variant).not.toContain('border-line-strong');
    }
  });

  it('applies the lg size class', () => {
    const { container } = render(Button, {
      props: { children: text('x'), size: 'lg' },
    });
    expect(container.querySelector('button')?.className).toContain('text-base');
  });

  // An icon-only control is a square that the icon sizes, the box ThemeToggle
  // uses, so a control set beside it no longer copies its classes.
  it('draws an icon-only button as a square', () => {
    const { container } = render(Button, {
      props: { children: text('x'), size: 'icon', variant: 'ghost', 'aria-label': 'Open menu' },
    });
    const cls = container.querySelector('button')?.className ?? '';
    // 7px of padding and the 1px border every variant carries: 8px round the icon.
    expect(cls).toContain('p-1.75');
    expect(cls.split(/\s+/)).toContain('border');
    expect(cls).not.toMatch(/\bpx-\d/);
    expect(cls).toContain('coarse:min-h-control');
  });

  it('applies w-full when full=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), full: true },
    });
    expect(container.querySelector('button')?.className).toContain('w-full');
  });

  it('is disabled when disabled=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), disabled: true },
    });
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is marked disabled and shows a spinner when loading=true', () => {
    const { container } = render(Button, {
      props: { children: text('x'), loading: true },
    });
    expect(container.querySelector('button')?.getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('fires onclick when clicked', async () => {
    const onclick = vi.fn();
    const { container } = render(Button, { props: { children: text('x'), onclick } });
    await fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('renders an anchor instead of a button when href is set', () => {
    const { container } = render(Button, {
      props: { children: text('x'), href: '/go' },
    });
    expect(container.querySelector('button')).toBeNull();
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('/go');
  });

  // The link branch spread the rest props but never applied onclick, so a
  // host's handler on a link button was dropped without a word.
  it('calls onclick on a link button, so a host can handle the click in place', async () => {
    const onclick = vi.fn((e: MouseEvent) => e.preventDefault());
    const { container } = render(Button, {
      props: { href: '/go', onclick, children: text('Go') },
    });
    await fireEvent.click(container.querySelector('a') as HTMLAnchorElement);
    expect(onclick).toHaveBeenCalledOnce();
    expect(onclick.mock.calls[0][0].defaultPrevented).toBe(true);
  });

  // Assistive technology or a script can still click an inert link, so the
  // click handler refuses it.
  it.each([
    ['disabled', { disabled: true }],
    ['loading', { loading: true }],
  ])('does not call onclick on a %s link button', async (_state, over) => {
    const onclick = vi.fn();
    const { container } = render(Button, {
      props: { href: '/go', onclick, children: text('Go'), ...over },
    });
    await fireEvent.click(container.querySelector('a') as HTMLAnchorElement);
    expect(onclick).not.toHaveBeenCalled();
  });

  it('does not navigate when a link button is disabled', () => {
    // `disabled` is not an anchor attribute and `disabled:opacity-50` never
    // matches an <a>, so the prop was accepted and dropped: the link rendered
    // ordinary and followed on click. Removing href is what actually stops it.
    const { container } = render(Button, {
      props: { href: '/somewhere', disabled: true, children: text('Go') },
    });
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('reports a submit in flight to assistive technology', () => {
    const { container } = render(Button, { props: { loading: true, children: text('Save') } });
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});

/*
 * A browser moves focus off a control that turns disabled, so a person who
 * pressed the button from the keyboard was left on the page body while the
 * action ran. A loading button stays enabled and refuses activation itself.
 */
describe('Button while loading', () => {
  it('keeps focus on the button once it starts loading', async () => {
    const { getByRole, rerender } = render(Button, { props: { children: text('Save') } });
    const button = getByRole('button') as HTMLButtonElement;
    button.focus();
    await rerender({ loading: true });
    expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('does not call onclick while loading', async () => {
    const onclick = vi.fn();
    const { getByRole } = render(Button, {
      props: { loading: true, onclick, children: text('Save') },
    });
    await fireEvent.click(getByRole('button'));
    expect(onclick).not.toHaveBeenCalled();
  });

  it('does not submit its form while loading', async () => {
    const form = document.body.appendChild(document.createElement('form'));
    const onsubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onsubmit);
    const { getByRole } = render(Button, {
      target: form,
      props: { type: 'submit', loading: true, children: text('Save') },
    });
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    await fireEvent.click(button);
    expect(onsubmit).not.toHaveBeenCalled();
    form.remove();
  });

  // Svelte delegates a declared onclick to the root, so an ancestor that
  // stops the click on its way up kept a delegated guard from running and the
  // form submitted again.
  it('does not submit its form while loading when an ancestor stops the click', async () => {
    const form = document.body.appendChild(document.createElement('form'));
    const onsubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onsubmit);
    const onclick = vi.fn();
    const { getByRole } = render(Button, {
      target: form,
      props: { type: 'submit', loading: true, onclick, children: text('Save') },
    });
    const button = getByRole('button');
    const wrapper = document.createElement('div');
    button.before(wrapper);
    wrapper.append(button);
    wrapper.addEventListener('click', (e) => e.stopPropagation());
    await fireEvent.click(button);
    expect(onsubmit).not.toHaveBeenCalled();
    expect(onclick).not.toHaveBeenCalled();
    form.remove();
  });

  it('keeps a disabled button disabled while it loads', () => {
    const { getByRole } = render(Button, {
      props: { disabled: true, loading: true, children: text('Save') },
    });
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a loading link button in the tab order and refuses its click', async () => {
    const onclick = vi.fn();
    const { container } = render(Button, {
      props: { href: '/go', loading: true, onclick, children: text('Go') },
    });
    const a = container.querySelector('a') as HTMLAnchorElement;
    a.focus();
    expect(document.activeElement).toBe(a);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('aria-busy')).toBe('true');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(onclick).not.toHaveBeenCalled();
  });
});

describe('Button in forced colors', () => {
  it('gives every filled variant an outline that takes no space', () => {
    // The fill is the boundary, and a forced colors scheme replaces it with
    // the canvas. An outline inset by its width keeps the box the same size.
    for (const variant of ['primary', 'violet', 'danger'] as const) {
      const { getByRole, unmount } = render(Button, { props: { variant, children: text('Go') } });
      const cls = getByRole('button').className;
      expect(cls, variant).toContain('forced-colors:outline-[color:ButtonText]');
      expect(cls, variant).toContain('forced-colors:-outline-offset-1');
      expect(cls, variant).not.toMatch(/forced-colors:border\b/);
      unmount();
    }
  });
});

describe('Button pressed state', () => {
  const variants = ['primary', 'secondary', 'danger', 'ghost', 'outline', 'violet'] as const;
  // A held step applies only while the button is neither disabled nor
  // aria-disabled. Chromium matches :active on a disabled button, and a
  // loading button stays enabled, and a press on either must not read as
  // accepted.
  const HELD = 'not-disabled:not-aria-disabled:active:';

  const classesOf = (variant: (typeof variants)[number]) => {
    const { container } = render(Button, { props: { children: text('x'), variant } });
    return (container.querySelector('button')?.className ?? '').split(/\s+/).filter(Boolean);
  };

  /*
   * Only the outlined variants carried a border, so a filled button drew 2px
   * shorter than a secondary one beside it and 2px short of the input in the
   * same row. Every class that adds to the height has to match across the
   * variants of one size.
   */
  it('gives every variant the same height at each size', () => {
    const height =
      /^(?:border(?:-[xytb])?(?:-\d+)?|p[ytb]?-[\d.]+|h-\S+|min-h-\S+|text-(?:xs|sm|base|lg))$/;
    for (const size of ['sm', 'md', 'lg', 'icon'] as const) {
      const of = (variant: (typeof variants)[number]) => {
        const { container, unmount } = render(Button, {
          props: { children: text('x'), variant, size },
        });
        const cls = (container.querySelector('button')?.className ?? '').split(/\s+/);
        unmount();
        return cls.filter((c) => height.test(c)).sort();
      };
      const primary = of('primary');
      for (const variant of variants) {
        expect({ size, variant, cls: of(variant) }).toEqual({ size, variant, cls: primary });
      }
    }
  });

  it('shows no held step on a disabled or loading button', () => {
    for (const variant of variants) {
      const ungated = classesOf(variant).filter(
        (c) => c.includes('active:') && !c.startsWith(HELD),
      );
      expect({ variant, ungated }).toEqual({ variant, ungated: [] });
    }
  });

  it('gives every variant something to show while it is held', () => {
    for (const variant of variants) {
      const held = classesOf(variant).filter((c) => c.startsWith(HELD));
      expect({ variant, held: held.length }).toEqual({ variant, held: held.length || -1 });
      expect(held.length).toBeGreaterThan(0);
    }
  });

  /*
   * A pressed state that paints the resting appearance is not a pressed state.
   * Two variants shipped one: `active:bg-brand` on a button already wearing
   * `bg-brand`, and `active:brightness-100` on a button with no filter to
   * return to. Both read as feedback in the source and neither moved a pixel,
   * which nothing caught because a pointer device covers the gap with
   * `hover:` and a finger, for which `hover:` never matches, does not.
   */
  it('never spells the held state as the resting one', () => {
    for (const variant of variants) {
      const cls = classesOf(variant);
      const held = cls.filter((c) => c.startsWith(HELD)).map((c) => c.slice(HELD.length));
      for (const step of held) {
        expect({ variant, step, alsoAtRest: cls.includes(step) }).toEqual({
          variant,
          step,
          alsoAtRest: false,
        });
        expect({ variant, step }).not.toEqual({ variant, step: 'brightness-100' });
      }
    }
  });
});

/*
 * An icon-only button is named by aria-label, which a pointer user never
 * sees. The name doubles as a hover and focus hint, and because the button
 * already announces it, the hint does not describe the button a second time.
 */
describe('Button hint', () => {
  it('shows its aria-label on hover and hides it again', async () => {
    const { container } = render(Button, {
      props: { 'aria-label': 'Delete tenant', children: text('x') },
    });
    const button = container.querySelector('button')!;
    const hint = container.querySelector('[aria-hidden="true"]')!;
    expect(hint.textContent).toContain('Delete tenant');
    expect(hint.classList.contains('invisible')).toBe(true);
    await fireEvent.mouseEnter(button.parentElement!);
    expect(hint.classList.contains('invisible')).toBe(false);
    await fireEvent.mouseLeave(button.parentElement!);
    expect(hint.classList.contains('invisible')).toBe(true);
  });

  it('does not describe the button with the words it is already named by', () => {
    const { container } = render(Button, {
      props: { 'aria-label': 'Delete tenant', children: text('x') },
    });
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('takes a hint of its own, and none when told', () => {
    const own = render(Button, {
      props: { 'aria-label': 'Copy', hint: 'Copy the URL', children: text('x') },
    });
    expect(own.container.querySelector('[aria-hidden="true"]')?.textContent).toContain(
      'Copy the URL',
    );

    const silent = render(Button, {
      props: { 'aria-label': 'Copy', hint: false, children: text('x') },
    });
    expect(silent.container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders a plain button when it has visible text and no aria-label', () => {
    const { container } = render(Button, { props: { children: text('Save') } });
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('keeps a full-width button full inside its hint', () => {
    const { container } = render(Button, {
      props: { 'aria-label': 'Go', full: true, children: text('x') },
    });
    expect(container.firstElementChild?.className).toContain('w-full');
  });
});

describe('Button in a narrow row', () => {
  it('never breaks its label across lines', () => {
    // A two-word ghost button in a flex row rendered on two lines under a
    // Table's `overflow-wrap: anywhere`.
    const { container } = render(Button, { props: { children: text('New flow') } });
    expect(container.querySelector('button')?.className.split(/\s+/)).toContain(
      'whitespace-nowrap',
    );
  });

  it('keeps the link form to one line as well', () => {
    const { container } = render(Button, {
      props: { href: '/flows/new', children: text('New flow') },
    });
    expect(container.querySelector('a')?.className.split(/\s+/)).toContain('whitespace-nowrap');
  });
});
