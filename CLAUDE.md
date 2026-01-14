# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@kopexa/krn is the TypeScript implementation of Kopexa Resource Names (KRN), following Google's Resource Name Design. This package is a port of the Go package at github.com/kopexa-grc/krn.

**The Go package is the source of truth** - any changes should be made there first, then ported here.

KRN Format:
```
//kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
//{service}.kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
```

Examples:
- `//kopexa.com/frameworks/iso27001` - Simple KRN without service
- `//catalog.kopexa.com/frameworks/iso27001/controls/5.1.1` - With service and dot-notation control ID
- `//isms.kopexa.com/tenants/acme-corp/workspaces/main@v1` - With service and version

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Build the package
pnpm build

# Lint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck
```

## Architecture

Single-file TypeScript library with zero runtime dependencies:

- `src/index.ts` - Core implementation: KRN class, parse/tryParse, builder pattern, validation
- `src/index.test.ts` - Comprehensive tests including Go compatibility suite

### Key Types

- `KRN` - The main class representing a Kopexa Resource Name
- `Segment` - A collection/resource-id pair interface
- `KRNBuilder` - Fluent API for constructing KRNs
- `KRNError` - Custom error class with error codes
- `KRNErrorCode` - Error code constants (matching Go package)

### Error Codes (must match Go)

These error codes must be kept in sync with the Go package:
- `EMPTY_KRN` → Go: `ErrEmptyKRN`
- `INVALID_KRN` → Go: `ErrInvalidKRN`
- `INVALID_DOMAIN` → Go: `ErrInvalidDomain`
- `INVALID_RESOURCE_ID` → Go: `ErrInvalidResourceID`
- `INVALID_VERSION` → Go: `ErrInvalidVersion`
- `RESOURCE_NOT_FOUND` → Go: `ErrResourceNotFound`

**Note:** Invalid service names use `INVALID_DOMAIN`, not a separate error code (for Go compatibility).

## Code Quality Requirements

- **90% test coverage** enforced in CI (currently at 97%)
- All tests must pass
- No Biome linting errors
- Go compatibility tests must pass

## Go Compatibility

The test file includes a "Go Compatibility" test suite that verifies:
- All parse test cases from Go pass
- Error codes match Go exactly
- Service preservation behavior matches Go
- String round-trip works identically

When updating this package, run the Go tests too to ensure parity:
```bash
cd ../krn && go test ./...
```

## Release Process

Uses Google Release Please for automated releases. Push conventional commits to main:
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `chore:`, `docs:`, `test:` - No version bump

Release Please creates PRs that, when merged, trigger npm publish with provenance.

## Package Publishing

Published to npm as `@kopexa/krn` with:
- Dual ESM/CJS builds
- TypeScript declarations
- npm provenance for supply chain security
