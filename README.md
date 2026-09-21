# Scalprum

**A powerful micro-frontend framework for React applications**

Scalprum is a JavaScript micro-frontend framework that enables you to build dynamic, scalable applications by composing components from multiple sources. Built on top of [Module Federation](https://module-federation.io/), Scalprum provides a developer-friendly abstraction for managing federated modules with advanced features like Remote Hooks and runtime plugin systems.

## Key Features

- 🧩 **Dynamic Module Loading** - Load React components from remote sources at runtime
- 🎣 **Remote Hooks** - Share React hooks across micro-frontends seamlessly
- ⚡ **High Performance** - Built on Module Federation for optimal bundle sharing
- 🔧 **Build Tool Agnostic** - Compatible with Webpack 5, Rspack, and Module Federation Runtime
- 🎯 **Type Safe** - Full TypeScript support with comprehensive type definitions
- 🔌 **Plugin Architecture** - Extensible system for building plugin-based applications

## Quick Start

```bash
npm install @scalprum/core @scalprum/react-core
npm install -D @scalprum/remote-types
```

```jsx
import { ScalprumProvider, ScalprumComponent } from '@scalprum/react-core';

const config = {
  myModule: {
    name: 'myModule',
    manifestLocation: '/path/to/plugin-manifest.json'
  }
};

function App() {
  return (
    <ScalprumProvider config={config}>
      <ScalprumComponent scope="myModule" module="MyComponent" />
    </ScalprumProvider>
  );
}
```

## Packages

| Package | Description |
|---------|-------------|
| [`@scalprum/core`](./packages/core) | Framework-agnostic core for module federation |
| [`@scalprum/remote-types`](./packages/remote-types) | Build-time remote type loading for Webpack and Rspack |
| [`@scalprum/react-core`](./packages/react-core) | React bindings with hooks and components |
| [`@scalprum/build-utils`](./packages/build-utils) | Build tools and NX executors |
| [`@scalprum/react-test-utils`](./packages/react-test-utils) | Testing utilities for Scalprum apps |

## Documentation

Documentation is organized within individual package directories, following monorepo best practices. This ensures package READMEs appear on npm automatically and documentation stays aligned with the code it documents.

- 📚 **[Getting Started Guide](./packages/react-core/docs/getting-started.md)** - Complete setup tutorial
- 📦 **Package Documentation**:
  - [@scalprum/core](./packages/core/README.md) - Framework-agnostic core
  - [@scalprum/react-core](./packages/react-core/README.md) - React bindings and hooks
  - [@scalprum/build-utils](./packages/build-utils/README.md) - Build tools and NX executors
  - [@scalprum/react-test-utils](./packages/react-test-utils/README.md) - Testing utilities
- 🎣 **Remote Hooks** - Share hooks across micro-frontends:
  - [Overview](./packages/react-core/README.md#remote-hooks)
  - [useRemoteHook Guide](./packages/react-core/docs/use-remote-hook.md)
  - [useRemoteHookManager Guide](./packages/react-core/docs/use-remote-hook-manager.md)
  - [RemoteHookProvider Reference](./packages/react-core/docs/remote-hook-provider.md)
  - [Type Definitions](./packages/react-core/docs/remote-hook-types.md)
- 🏪 **Shared Stores** - Event-driven state management for micro-frontends:
  - [Complete Shared Stores Guide](./packages/react-core/docs/shared-stores.md) - Comprehensive documentation
  - [API Reference](./packages/react-core/docs/shared-stores.md#api-reference)
  - [Usage Patterns](./packages/react-core/docs/shared-stores.md#usage-patterns)
  - [Testing Guide](./packages/react-core/docs/shared-stores.md#testing)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) 24+
- Build environment with Webpack 5, Rspack, or Module Federation Runtime support
- React 16.8+ (for hooks support)

### Basic Setup

1. **Install Scalprum packages:**
   ```bash
   npm install @scalprum/core @scalprum/react-core
   ```

2. **Create a host application:**
   ```jsx
   import { ScalprumProvider, ScalprumComponent } from '@scalprum/react-core';

   const config = {
     myModule: {
       name: 'myModule',
       manifestLocation: 'http://localhost:8003/plugin-manifest.json'
     }
   };

   function App() {
     return (
       <ScalprumProvider config={config}>
         <ScalprumComponent scope="myModule" module="MyComponent" />
       </ScalprumProvider>
     );
   }
   ```

3. **Configure Module Federation in your bundler**

4. **Configure generated remote types (recommended):** Add `ScalprumRemoteTypesPlugin` to the host Webpack or Rspack config. Once generated declarations are included in `tsconfig.json`, `ScalprumComponent`, `useModule`, `useLoadModule`, `useRemoteHook`, and `getModule` infer known remote props, arguments, and results. Do not duplicate those remote interfaces in host code. See [`@scalprum/remote-types`](./packages/remote-types/README.md).

For a complete step-by-step tutorial including remote module setup, see our **[Getting Started Guide](./packages/react-core/docs/getting-started.md)**.

## API Reference

### Core Concepts

**Host Application**: The main application that manages module loading, routing, and data sharing. It loads first and provides the foundation for your micro-frontend architecture.

**Remote Modules**: Independent applications that can be loaded dynamically at runtime. They expose components that can be consumed by the host application.

### Build Tool Compatibility

Scalprum works with multiple build tools and module federation implementations:

- **Webpack 5**: Native Module Federation support
- **Rspack**: High-performance Rust-based bundler with Module Federation
- **Module Federation Runtime**: Framework-agnostic module federation for any bundler

### Module Federation Configuration

**Required shared dependencies** (must be marked as singletons):
```js
const shared = {
  '@scalprum/react-core': { singleton: true },
  'react': { singleton: true },
  'react-dom': { singleton: true }
};
```

### ScalprumProvider

Root component that provides module loading context:

```jsx
import { ScalprumProvider } from '@scalprum/react-core';

const config = {
  myModule: {
    name: 'myModule',
    manifestLocation: '/path/to/plugin-manifest.json'
  }
};

<ScalprumProvider
  config={config}
  api={{ /* shared context */ }}
>
  <App />
</ScalprumProvider>
```

### ScalprumComponent

Component for rendering remote modules:

```jsx
import { ScalprumComponent } from '@scalprum/react-core';

<ScalprumComponent
  scope="myModule"
  module="MyComponent"
  fallback={<Loading />}
  ErrorComponent={ErrorFallback}
  // Additional props passed to remote component
  customProp="value"
/>
```

## Contributing

We welcome contributions to Scalprum! Whether it's bug reports, feature requests, or code contributions, your help makes this project better.

### Development Setup

This project requires Node.js 26+.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/scalprum/scaffolding.git
   cd scaffolding
   ```

2. **Setup Node.js:**
   ```bash
   nvm use              # Install/use Node 26 from .nvmrc
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

### How to Contribute

- **[Report bugs or request features](https://github.com/scalprum/scaffolding/issues)** - Open an issue on GitHub
- **[Join discussions](https://github.com/scalprum/scaffolding/discussions)** - Ask questions or share ideas
- **Submit pull requests** - Fix bugs or add new features
- **Improve documentation** - Help make our docs better
- **Share examples** - Contribute real-world usage examples

For development setup and guidelines, check the individual package READMEs and explore the `examples/` directory for reference implementations.

## Links

- **[GitHub Repository](https://github.com/scalprum/scaffolding)**
- **[Issues](https://github.com/scalprum/scaffolding/issues)**
- **[Discussions](https://github.com/scalprum/scaffolding/discussions)**
