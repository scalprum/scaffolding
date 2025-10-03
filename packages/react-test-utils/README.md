# @scalprum/react-test-utils

**Testing utilities for Scalprum React applications**

The `@scalprum/react-test-utils` package provides comprehensive testing utilities for Scalprum-based React applications. It simplifies testing micro-frontend components by mocking module federation, providing test providers, and setting up the necessary environment for testing federated modules.

## Installation

```bash
npm install @scalprum/react-test-utils --save-dev
```

## Key Features

- **Mock Scalprum Environment**: Complete Scalprum testing environment setup
- **Plugin Data Mocking**: Mock federated modules and plugin manifests
- **Test Provider Component**: Ready-to-use ScalprumProvider for tests
- **Webpack Share Scope Mocking**: Automatic webpack module federation mocking
- **Fetch Polyfill**: Built-in fetch polyfill for test environments
- **Module Mocking**: Easy mocking of remote federated modules

## Quick Start

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';

// Initialize Scalprum mocks once per test file
mockScalprum();

describe('MyComponent', () => {
  it('renders with mocked plugin', () => {
    const { TestScalprumProvider } = mockPluginData();

    render(
      <TestScalprumProvider>
        <MyComponent />
      </TestScalprumProvider>
    );

    expect(screen.getByTestId('default-module-test-id')).toBeInTheDocument();
  });
});
```

## Core Utilities

### mockScalprum()

Initializes the complete Scalprum testing environment. Call this once at the beginning of your test file.

```tsx
import { mockScalprum } from '@scalprum/react-test-utils';

// Set up Scalprum mocks before tests
mockScalprum();

describe('Scalprum Tests', () => {
  // Your tests
});
```

**What it does:**
1. Mocks webpack share scope (`__webpack_share_scopes__`)
2. Adds fetch polyfill if not available
3. Sets up necessary global objects for module federation

### mockWebpackShareScope()

Mocks the webpack module federation shared scope. Usually called via `mockScalprum()`.

```tsx
import { mockWebpackShareScope } from '@scalprum/react-test-utils';

beforeAll(() => {
  mockWebpackShareScope();
});
```

**Creates:**
```typescript
globalThis.__webpack_share_scopes__ = {
  default: {}
};
```

### mockFetch()

Adds fetch polyfill to the test environment. Usually called via `mockScalprum()`.

```tsx
import { mockFetch } from '@scalprum/react-test-utils';

beforeAll(() => {
  mockFetch();
});
```

### mockPluginData()

Creates a complete mock setup for testing federated modules with custom configuration.

```tsx
import { mockPluginData, DEFAULT_MODULE_TEST_ID } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';

describe('Plugin Module Tests', () => {
  it('renders mocked module', () => {
    const { TestScalprumProvider, response } = mockPluginData({
      pluginManifest: {
        name: 'my-plugin',
        version: '1.0.0',
        baseURL: 'http://localhost:3001',
        loadScripts: ['plugin.js'],
        extensions: [],
        registrationMethod: 'custom'
      },
      module: 'MyExposedComponent',
      moduleMock: {
        default: () => <div data-testid="my-component">Hello from plugin</div>
      }
    });

    render(
      <TestScalprumProvider>
        <MyApp />
      </TestScalprumProvider>
    );

    expect(screen.getByTestId('my-component')).toBeInTheDocument();
  });
});
```

#### Parameters

```typescript
interface MockPluginDataOptions {
  headers?: Headers;
  url?: string;
  type?: ResponseType;
  ok?: boolean;
  status?: number;
  statusText?: string;
  pluginManifest?: PluginManifest;
  module?: string;
  moduleMock?: ModuleMock;
  config?: AppsConfig;
}

type ModuleMock = {
  [importName: string]: React.ComponentType<any>;
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headers` | `Headers` | `new Headers()` | Response headers |
| `url` | `string` | `'http://localhost:3000/test-plugin/plugin-manifest.json'` | Manifest URL |
| `type` | `ResponseType` | `'default'` | Response type |
| `ok` | `boolean` | `true` | Response ok status |
| `status` | `number` | `200` | HTTP status code |
| `statusText` | `string` | `'OK'` | HTTP status text |
| `pluginManifest` | `PluginManifest` | Default manifest | Plugin manifest configuration |
| `module` | `string` | `'ExposedModule'` | Module name to expose |
| `moduleMock` | `ModuleMock` | Default component | Mock module exports |
| `config` | `AppsConfig` | Auto-generated | Apps configuration |

**Second Parameter:**

```typescript
api?: ScalprumProviderConfigurableProps['api']
```

Optional API context to pass to ScalprumProvider.

#### Returns

```typescript
{
  response: Response;           // Mocked fetch response
  TestScalprumProvider: React.ComponentType<React.PropsWithChildren>;
}
```

## Complete Examples

### Basic Component Test

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';
import { ScalprumComponent } from '@scalprum/react-core';

mockScalprum();

describe('ScalprumComponent', () => {
  it('loads and renders remote component', async () => {
    const { TestScalprumProvider } = mockPluginData({
      pluginManifest: {
        name: 'dashboard',
        version: '1.0.0',
        baseURL: 'http://localhost:3001',
        loadScripts: ['dashboard.js'],
        extensions: [],
        registrationMethod: 'custom'
      },
      module: 'Dashboard',
      moduleMock: {
        default: () => <div data-testid="dashboard">Dashboard Content</div>
      }
    });

    render(
      <TestScalprumProvider>
        <ScalprumComponent
          scope="dashboard"
          module="Dashboard"
          fallback={<div>Loading...</div>}
        />
      </TestScalprumProvider>
    );

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });
});
```

### Custom Module Mock with Props

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';

mockScalprum();

describe('Widget Component', () => {
  it('passes props to remote component', async () => {
    const WidgetMock = ({ title, data }) => (
      <div data-testid="widget">
        <h2>{title}</h2>
        <p>Data points: {data.length}</p>
      </div>
    );

    const { TestScalprumProvider } = mockPluginData({
      module: 'Widget',
      moduleMock: {
        default: WidgetMock
      }
    });

    render(
      <TestScalprumProvider>
        <ScalprumComponent
          scope="test-plugin"
          module="Widget"
          title="Sales Chart"
          data={[1, 2, 3, 4, 5]}
        />
      </TestScalprumProvider>
    );

    expect(screen.getByText('Sales Chart')).toBeInTheDocument();
    expect(screen.getByText('Data points: 5')).toBeInTheDocument();
  });
});
```

### Testing with Custom API Context

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';
import { useScalprum } from '@scalprum/react-core';

mockScalprum();

function ComponentUsingAPI() {
  const { api } = useScalprum();
  return <div>User: {api.user.name}</div>;
}

describe('Component with API', () => {
  it('provides custom API context', () => {
    const api = {
      user: { id: '123', name: 'Test User' },
      theme: 'dark'
    };

    const { TestScalprumProvider } = mockPluginData({}, api);

    render(
      <TestScalprumProvider>
        <ComponentUsingAPI />
      </TestScalprumProvider>
    );

    expect(screen.getByText('User: Test User')).toBeInTheDocument();
  });
});
```

### Testing Multiple Modules

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';

mockScalprum();

describe('Multiple Modules', () => {
  it('handles multiple exposed modules', async () => {
    const { TestScalprumProvider } = mockPluginData({
      module: 'MainComponent',
      moduleMock: {
        default: () => <div data-testid="main">Main</div>,
        SecondaryComponent: () => <div data-testid="secondary">Secondary</div>
      }
    });

    function TestApp() {
      return (
        <>
          <ScalprumComponent scope="test-plugin" module="MainComponent" />
          <ScalprumComponent
            scope="test-plugin"
            module="MainComponent"
            importName="SecondaryComponent"
          />
        </>
      );
    }

    render(
      <TestScalprumProvider>
        <TestApp />
      </TestScalprumProvider>
    );

    expect(await screen.findByTestId('main')).toBeInTheDocument();
    expect(await screen.findByTestId('secondary')).toBeInTheDocument();
  });
});
```

### Testing Error States

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen } from '@testing-library/react';

mockScalprum();

describe('Error Handling', () => {
  it('handles failed plugin loading', () => {
    const { TestScalprumProvider } = mockPluginData({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    function ErrorComponent({ error }) {
      return <div data-testid="error">Error: {error?.message}</div>;
    }

    render(
      <TestScalprumProvider>
        <ScalprumComponent
          scope="test-plugin"
          module="Missing"
          ErrorComponent={<ErrorComponent />}
        />
      </TestScalprumProvider>
    );

    // Component should handle the error gracefully
  });
});
```

### Testing with useModule Hook

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen, waitFor } from '@testing-library/react';
import { useModule } from '@scalprum/react-core';

mockScalprum();

function TestComponent() {
  const Widget = useModule('test-plugin', 'Widget');

  if (!Widget) {
    return <div>Loading...</div>;
  }

  return <Widget title="Test" />;
}

describe('useModule Hook', () => {
  it('loads module with useModule', async () => {
    const WidgetMock = ({ title }) => <div data-testid="widget">{title}</div>;

    const { TestScalprumProvider } = mockPluginData({
      module: 'Widget',
      moduleMock: {
        default: WidgetMock
      }
    });

    render(
      <TestScalprumProvider>
        <TestComponent />
      </TestScalprumProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget')).toBeInTheDocument();
    });
  });
});
```

### Testing with Remote Hooks

```tsx
import { mockScalprum, mockPluginData } from '@scalprum/react-test-utils';
import { render, screen, waitFor } from '@testing-library/react';
import { useRemoteHook } from '@scalprum/react-core';
import { useMemo, useState } from 'react';

mockScalprum();

function ComponentWithRemoteHook() {
  const args = useMemo(() => [{ initialValue: 0 }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'test-plugin',
    module: 'useCounter',
    args
  });

  if (loading) return <div>Loading hook...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div data-testid="count">Count: {hookResult?.count}</div>;
}

describe('Remote Hooks', () => {
  it('loads and executes remote hook', async () => {
    const useCounterMock = ({ initialValue }) => {
      const [count, setCount] = useState(initialValue);
      return { count, increment: () => setCount(c => c + 1) };
    };

    const { TestScalprumProvider } = mockPluginData({
      module: 'useCounter',
      moduleMock: {
        default: useCounterMock
      }
    });

    render(
      <TestScalprumProvider>
        <ComponentWithRemoteHook />
      </TestScalprumProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('Count: 0');
    });
  });
});
```

## Default Values

### DEFAULT_MODULE_TEST_ID

Constant for the default test ID used by the default module mock.

```tsx
import { DEFAULT_MODULE_TEST_ID } from '@scalprum/react-test-utils';

expect(screen.getByTestId(DEFAULT_MODULE_TEST_ID)).toBeInTheDocument();
```

Value: `'default-module-test-id'`

## Jest Setup

For Jest testing, add initialization to your setup file:

**jest.setup.js**
```javascript
import { mockScalprum } from '@scalprum/react-test-utils';

// Initialize Scalprum mocks globally
mockScalprum();
```

**jest.config.js**
```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  // ... other config
};
```

## Testing Best Practices

1. **Call `mockScalprum()` once per test file** - Usually at the top level
2. **Create fresh mocks per test** - Call `mockPluginData()` inside each test
3. **Use async/await with `findBy`** - Remote modules load asynchronously
4. **Mock only what you need** - Don't over-configure `mockPluginData()`
5. **Test error states** - Use `ok: false` to test error handling
6. **Provide API context** - Use second parameter for components needing shared API

## TypeScript Support

Full TypeScript support with type definitions:

```tsx
import { mockPluginData } from '@scalprum/react-test-utils';
import { PluginManifest } from '@openshift/dynamic-plugin-sdk';

interface MyComponentProps {
  title: string;
  data: number[];
}

const manifest: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  baseURL: 'http://localhost:3001',
  loadScripts: ['plugin.js'],
  extensions: [],
  registrationMethod: 'custom'
};

const MyComponentMock: React.ComponentType<MyComponentProps> = ({ title, data }) => (
  <div>{title}: {data.length} items</div>
);

const { TestScalprumProvider } = mockPluginData({
  pluginManifest: manifest,
  moduleMock: {
    default: MyComponentMock
  }
});
```

## Testing Framework Compatibility

This package is compatible with:

- **Jest** - Recommended test runner
- **React Testing Library** - For component testing
- **Vitest** - Modern alternative to Jest
- **Any test framework** that supports jsdom environment

## Package Dependencies

```json
{
  "dependencies": {
    "@openshift/dynamic-plugin-sdk": "^5.0.1",
    "@scalprum/core": "^0.8.3",
    "@scalprum/react-core": "^0.9.5",
    "whatwg-fetch": "^3.6.0"
  }
}
```

## Troubleshooting

### Module Not Loading in Tests

**Problem:** Component shows loading state indefinitely

**Solution:** Ensure you're using `findBy` queries (async) instead of `getBy`:

```tsx
// ❌ Wrong - synchronous query
expect(screen.getByTestId('my-component')).toBeInTheDocument();

// ✅ Correct - async query
expect(await screen.findByTestId('my-component')).toBeInTheDocument();
```

### Webpack Share Scope Errors

**Problem:** `__webpack_share_scopes__ is not defined`

**Solution:** Call `mockScalprum()` before running tests:

```tsx
import { mockScalprum } from '@scalprum/react-test-utils';

mockScalprum(); // Add this

describe('Tests', () => {
  // ...
});
```

### Fetch Not Available

**Problem:** `fetch is not defined` in test environment

**Solution:** `mockScalprum()` includes fetch polyfill. If called separately, use:

```tsx
import { mockFetch } from '@scalprum/react-test-utils';

mockFetch();
```

## API Reference

### Exports

```typescript
// Main utilities
export function mockScalprum(): void;
export function mockWebpackShareScope(): void;
export function mockFetch(): void;
export function mockPluginData(
  options?: MockPluginDataOptions,
  api?: ScalprumProviderConfigurableProps['api']
): {
  response: Response;
  TestScalprumProvider: React.ComponentType<React.PropsWithChildren>;
};

// Constants
export const DEFAULT_MODULE_TEST_ID: string;

// Re-exports from other packages
export { useScalprum, ScalprumProvider } from '@scalprum/react-core';
export type { AppsConfig } from '@scalprum/core';
export type { PluginManifest } from '@openshift/dynamic-plugin-sdk';
```

## Related Packages

- [`@scalprum/core`](../core) - Framework-agnostic core library
- [`@scalprum/react-core`](../react-core) - React components and hooks
- [`@scalprum/build-utils`](../build-utils) - Build tools and NX executors

## License

Apache-2.0
