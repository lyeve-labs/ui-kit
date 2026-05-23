# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
