/**
 * Sidebar snippets that report what the shell tells them, the way a
 * SidebarNav reads `collapsed`.
 *
 * A raw snippet renders its markup once. A snippet written in a component
 * follows its argument, so these write the argument again after every change,
 * and a case reads what the shell says now rather than what it said first.
 */

import { createRawSnippet } from 'svelte';

type Side = { rail: boolean };

/** A nav holding one link, with the rail answer in `data-rail`. */
export const tellingNav = createRawSnippet<[Side]>((state) => ({
  render: () => `<nav data-testid="nav"><a href="/a">A</a></nav>`,
  setup(node) {
    $effect(() => {
      node.setAttribute('data-rail', String(state().rail));
    });
  },
}));

/** A band that reads `mark` on the rail and `wordmark` in the full column. */
export const tellingBand = (name: string) =>
  createRawSnippet<[Side]>((state) => ({
    render: () => `<span data-testid="${name}"></span>`,
    setup(node) {
      $effect(() => {
        node.textContent = state().rail ? 'mark' : 'wordmark';
      });
    },
  }));
