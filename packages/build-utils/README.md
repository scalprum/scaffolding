# @scalprum/build-utils

**Build tools and NX executors for Scalprum projects**

The `@scalprum/build-utils` package provides NX executors and utilities for building, bundling, and managing Scalprum-based micro-frontend projects. It streamlines the build process and automates dependency synchronization across your monorepo.

## Installation

```bash
npm install @scalprum/build-utils --save-dev
```

## Key Features

- **Builder Executor**: Custom TypeScript build executor with ESM and CJS support
- **Dependency Sync**: Automatic workspace dependency synchronization
- **NX Integration**: Seamless integration with NX monorepo workflows
- **TypeScript Support**: Full TypeScript compilation with dual module output
- **Asset Management**: Automated asset copying during builds

## NX Executors

### builder

Custom build executor that compiles TypeScript projects with both ESM and CommonJS outputs.

#### Configuration

Add to your `project.json`:

```json
{
  "targets": {
    "build": {
      "executor": "@scalprum/build-utils:builder",
      "options": {
        "esmTsConfig": "packages/my-package/tsconfig.esm.json",
        "cjsTsConfig": "packages/my-package/tsconfig.cjs.json",
        "outputPath": "dist/packages/my-package",
        "assets": ["packages/my-package/README.md"]
      }
    }
  }
}
```

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `esmTsConfig` | `string` | Yes | Path to ESM TypeScript config |
| `cjsTsConfig` | `string` | Yes | Path to CJS TypeScript config |
| `outputPath` | `string` | Yes | Output directory path |
| `assets` | `string[]` | No | Additional files to copy to output |

#### Usage

```bash
nx build my-package
```

This executor:
1. Validates all config files exist
2. Compiles TypeScript to ESM format (outputs to `outputPath/esm/`)
3. Compiles TypeScript to CJS format (outputs to `outputPath/`)
4. Copies `package.json` and any specified assets to output directory

#### Example TypeScript Configs

**tsconfig.esm.json**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "target": "es2015",
    "declaration": true
  }
}
```

**tsconfig.cjs.json**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2015",
    "declaration": true
  }
}
```

### sync-dependencies

Automatically synchronizes workspace package dependencies across your monorepo. Updates package versions when local dependencies are bumped and commits changes to your branch.

#### Configuration

Add to your `project.json`:

```json
{
  "targets": {
    "sync-deps": {
      "executor": "@scalprum/build-utils:sync-dependencies",
      "options": {
        "baseBranch": "main",
        "remote": "origin"
      }
    }
  }
}
```

#### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `baseBranch` | `string` | No | `"main"` | Git branch to push changes to |
| `remote` | `string` | No | `"origin"` | Git remote name |

#### Usage

```bash
nx sync-deps my-package
```

This executor:
1. Analyzes the NX project dependency graph
2. Finds all workspace dependencies for the current project
3. Checks if dependency versions satisfy current ranges
4. Updates `package.json` with newer versions if available
5. Commits changes with message `"chore: [skip ci] sync dependencies"`
6. Pushes changes to the specified remote branch

#### How It Works

The executor uses semantic versioning to determine if dependencies need updating:

```typescript
// Example: If my-package depends on @scalprum/core
// Current: "@scalprum/core": "^0.8.0"
// Available: @scalprum/core@0.8.3

// Executor checks:
// 1. Is 0.8.3 a valid semver? ✓
// 2. Does 0.8.3 satisfy ^0.8.0? ✓
// 3. Update to: "@scalprum/core": "^0.8.3"
```

Only updates versions that:
- Are valid semantic versions
- Satisfy the existing version range
- Preserve the range prefix (^, ~, etc.)

#### CI/CD Integration

Perfect for automated workflows:

```yaml
# .github/workflows/sync-deps.yml
name: Sync Dependencies

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: nx run-many --target=sync-deps --all
```

The `[skip ci]` commit message prevents infinite CI loops.

## Package Structure

This package follows NX executor conventions:

```
@scalprum/build-utils/
├── src/
│   ├── executors/
│   │   ├── builder/
│   │   │   ├── executor.ts
│   │   │   └── schema.json
│   │   └── sync-dependencies/
│   │       ├── executor.ts
│   │       └── schema.json
│   └── index.ts
├── executors.json
└── package.json
```

## Dependencies

```json
{
  "dependencies": {
    "@nx/devkit": "^17.1.3",
    "semver": "^7.5.4",
    "zod": "^3.22.4"
  }
}
```

- **@nx/devkit**: NX workspace utilities and APIs
- **semver**: Semantic version parsing and comparison
- **zod**: Schema validation for executor options

## TypeScript Support

The package is written in TypeScript and provides type definitions:

```typescript
import { BuilderExecutorSchemaType } from '@scalprum/build-utils';

const options: BuilderExecutorSchemaType = {
  esmTsConfig: './tsconfig.esm.json',
  cjsTsConfig: './tsconfig.cjs.json',
  outputPath: 'dist/my-package',
  assets: ['README.md', 'LICENSE']
};
```

## Complete Example

### Project Setup

**packages/my-library/project.json**
```json
{
  "name": "my-library",
  "sourceRoot": "packages/my-library/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@scalprum/build-utils:builder",
      "outputs": ["{options.outputPath}"],
      "options": {
        "esmTsConfig": "packages/my-library/tsconfig.esm.json",
        "cjsTsConfig": "packages/my-library/tsconfig.cjs.json",
        "outputPath": "dist/packages/my-library",
        "assets": [
          "packages/my-library/README.md",
          "packages/my-library/LICENSE"
        ]
      }
    },
    "sync-deps": {
      "executor": "@scalprum/build-utils:sync-dependencies",
      "options": {
        "baseBranch": "main",
        "remote": "origin"
      }
    }
  }
}
```

**packages/my-library/package.json**
```json
{
  "name": "@myorg/my-library",
  "version": "1.0.0",
  "main": "./index.js",
  "module": "./esm/index.js",
  "types": "./index.d.ts",
  "dependencies": {
    "@scalprum/core": "^0.8.3"
  }
}
```

### Build Commands

```bash
# Build single package
nx build my-library

# Build all packages
nx run-many --target=build --all

# Sync dependencies for single package
nx sync-deps my-library

# Sync dependencies for all packages
nx run-many --target=sync-deps --all

# Watch mode (if configured)
nx build my-library --watch
```

## Build Output Structure

After running the builder, your output directory will contain:

```
dist/packages/my-library/
├── esm/                    # ESM modules
│   ├── index.js
│   └── index.d.ts
├── index.js                # CJS modules
├── index.d.ts              # Type definitions
├── package.json            # Copied from source
├── README.md               # Copied asset
└── LICENSE                 # Copied asset
```

## Advanced Usage

### Custom Build Scripts

You can wrap the executors in npm scripts:

**package.json**
```json
{
  "scripts": {
    "build": "nx run-many --target=build --all --parallel",
    "build:prod": "nx run-many --target=build --all --configuration=production",
    "sync-deps": "nx run-many --target=sync-deps --all"
  }
}
```

### Conditional Asset Copying

Only copy assets that exist:

```json
{
  "assets": [
    "packages/my-library/README.md",
    "packages/my-library/CHANGELOG.md"
  ]
}
```

Missing files are silently skipped.

### Integration with Other Executors

Combine with other NX executors:

```json
{
  "targets": {
    "build": {
      "executor": "@scalprum/build-utils:builder",
      "options": { /* ... */ }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": { /* ... */ }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "options": { /* ... */ }
    },
    "sync-deps": {
      "executor": "@scalprum/build-utils:sync-dependencies"
    }
  }
}
```

## Troubleshooting

### Build Fails: TypeScript Config Not Found

```
Error: ENOENT: no such file or directory
```

**Solution:** Ensure both `esmTsConfig` and `cjsTsConfig` paths are correct and files exist.

### Dependency Sync No Changes

The sync executor only updates versions that:
1. Are valid semantic versions
2. Satisfy the current version range
3. Are newer than what's currently specified

If no updates occur, dependencies are already at the latest satisfying version.

### Git Push Fails

```
Error: failed to push some refs
```

**Solution:** Ensure the executor has permissions to push to the remote branch. In CI/CD, configure git credentials:

```bash
git config --global user.email "bot@example.com"
git config --global user.name "Dependency Bot"
```

## Best Practices

1. **Separate TS Configs**: Maintain separate `tsconfig.esm.json` and `tsconfig.cjs.json` for clarity
2. **Asset Management**: Include README and LICENSE in assets for published packages
3. **Automated Sync**: Run `sync-dependencies` in CI for automatic version updates
4. **Output Path Convention**: Use `dist/packages/{package-name}` for consistency
5. **Skip CI**: The sync executor includes `[skip ci]` to prevent infinite loops

## Build Tool Compatibility

This package is designed for:

- **NX Workspaces** (v17+)
- **TypeScript** (v4+)
- **Module Federation** projects (via proper build configuration)

## Related Packages

- [`@scalprum/core`](../core) - Framework-agnostic core library
- [`@scalprum/react-core`](../react-core) - React bindings and components
- [`@scalprum/react-test-utils`](../react-test-utils) - Testing utilities

## Contributing

When adding new executors:

1. Create executor directory in `src/executors/{executor-name}/`
2. Add `executor.ts` with default export function
3. Add `schema.json` with Zod validation
4. Update `executors.json` with executor registration
5. Document options and usage in this README

## License

Apache-2.0
