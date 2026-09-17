# Linting and Complexity

For a new project, use the official `eslint-plugin-obsidianmd` recommended configuration plus
TypeScript rules. Add React Hooks and Storybook rules when those tools are present, matching the
installed versions. Add formatting and pre-commit tooling only when the repository uses it or the
team requests it; keep CI authoritative.

## Complexity Baseline

Use ESLint flat config and register `eslint-plugin-sonarjs` directly for cognitive complexity.
Enabling the complete SonarJS recommended preset is a separate policy decision because it adds
unrelated rules. Merge these blocks after the Obsidian, TypeScript, React Hooks, and optional
Storybook presets already selected by the project:

```typescript
import sonarjs from 'eslint-plugin-sonarjs';

const generatedCode = ['src/**/generated/**', 'src/**/vendor/**'];

const complexityConfig = [
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: generatedCode,
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'max-statements': ['error', 60],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      ...generatedCode,
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/*.stories.{ts,tsx}',
      'src/test/**',
    ],
    plugins: { sonarjs },
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
];
```

Spread `complexityConfig` into the repository's `defineConfig(...)` call. The four structural rules
apply to handwritten production, test, and story files under `src`; cognitive complexity and
function length apply to handwritten production code. Keep build output in global ignores and
adapt generated or vendor globs to real repository boundaries.

Treat a violation as a refactoring prompt. Flatten control flow, separate host orchestration from
domain decisions, or extract a cohesive owner. Avoid pass-through helpers that only move the score,
and keep an unavoidable suppression beside the affected code with the rule name and reason. Use
`$simplify-code` when a behavior-preserving reduction is non-trivial. Passing the ceilings is a
gate, not proof of simple ownership; inspect clusters of threshold-adjacent functions during a
complexity review when the available report exposes their scores.

Preserve an established Biome or Oxlint setup when stable native rules cover the same intent. Do
not add ESLint as a second engine solely to reproduce every numeric signal. Make an engine migration
or an intentionally reduced native baseline explicit when exact parity is unavailable.

For an existing ESLint project, keep the rules at `error`. When legacy violations cannot be fixed
in the same tooling change, create and commit `eslint-suppressions.json` for only these six rules:

```text
pnpm exec eslint src --fix \
  --suppress-rule complexity \
  --suppress-rule max-depth \
  --suppress-rule max-params \
  --suppress-rule max-statements \
  --suppress-rule max-lines-per-function \
  --suppress-rule sonarjs/cognitive-complexity
```

Review the baseline before committing it. Run `pnpm exec eslint src --prune-suppressions` after
fixes and commit the smaller file so new complexity remains blocking. Prefer this ratchet over
folder-wide ignores or permanent warning severity. If the established ESLint version lacks bulk
suppressions, treat upgrading it as an explicit tooling migration.

References: [ESLint complexity](https://eslint.org/docs/latest/rules/complexity),
[ESLint bulk suppressions](https://eslint.org/docs/latest/use/suppressions), and
[SonarJS cognitive complexity](https://github.com/SonarSource/SonarJS/tree/master/packages/analysis/src/jsts/rules/S3776).
