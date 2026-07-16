# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-07-16
### Added
- `EmptyState` now accepts an `iconSnippet` prop, so consumers can render a custom icon component (e.g. a Lucide icon) in the icon chip instead of only a text/emoji `icon` string. `iconSnippet` takes precedence over `icon` when both are supplied.

## [0.6.2] - 2026-07-13
### Changed
- Apply prettier formatting to component test files
- Exclude generated CHANGELOG from prettier check

## [0.6.1] - 2026-07-10
### Changed
- pin pnpm 9.15.0 in mise to match packageManager + lockfile
- add render tests for all primitives + logic coverage

### Fixed
- key Pagination ellipses by index to avoid each_key_duplicate

## [0.6.0] - 2026-07-05
### Added
- imperative dialog stack (openDialog/confirm), release v0.3.0

### Changed
- refine theme tokens
- bump deps and pin cookie>=0.7.0 for CVE fix
- sync pnpm-lock.yaml with package.json
- apply prettier formatting to satisfy CI format gate

## [0.5.0] - 2026-05-27
### Added
- brand identity

### Changed
- v0.2.0

## [0.4.0] - 2026-05-23
### Added
- add interactive playground page

### Changed
- README, CHANGELOG, CONTRIBUTING, MEMORY
- add GitHub Actions workflow + PR template
- green the install + check + test + package + docs-build pipeline
- finish reference pages for the remaining 30 components
- pre-publish polish
- resolve styles.css to source for file: dev workflows
- PUBLISHING.md + publishConfig for the public npm push
- pin Node 20 via mise to fix crypto.getRandomValues on build
- ignore PUBLISHING.md and NOTES.md from git tracking

## [0.3.0] - 2026-05-22
### Added
- wire up the public API surface
- scaffold docs site shell
- landing page + getting-started + foundations

### Changed
- add reference pages for the launch set

## [0.2.0] - 2026-05-21
### Added
- add cn() class merger and theme helpers
- add toast service backed by Svelte 5 $state
- add the 45-component primitive set

## [0.1.0] - 2026-05-20
### Added
- add Soft Dark + Soft Light token sheet

### Changed
- scaffold svelte-package + sveltekit project
