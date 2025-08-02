# AGENTS.md

## Build/Lint/Test Commands

**Build:**
- `pnpm build` - Production build
- `pnpm dev` - Development server
- `pnpm tauri build` - Desktop app build

**Lint:**
- `pnpm lint` - TypeScript + Tailwind linter

**Test:**
- `pnpm test` - Run all tests
- `pnpm test <test-file>` - Run single test file
- `pnpm test:watch` - Watch mode

## Code Style

- **TypeScript**: Strict mode, prefer `const`/`let` over `var`
- **Imports**: Alphabetical order, group `react`/`convex`/`local`
- **Formatting**: Prettier + Tailwind class order
- **Naming**: PascalCase for components, camelCase for variables
- **Error Handling**: Use `try/catch` with `console.error()`
- **Tests**: Vitest + SolidJS testing library patterns

## Conventions
- State management via SolidJS signals
- Convex mutations/queries in `lib/convex.ts`
- UI components in `components/` with Radix primitives
- Tauri file system access via `src-tauri/src/`