import './overrides';
import { PluginManifest } from '@openshift/dynamic-plugin-sdk';
import { ScalprumProvider, ScalprumProviderProps, useScalprum } from '@scalprum/react-core';
import { fetch as fetchPolyfill } from 'whatwg-fetch';
import React, { useEffect } from 'react';
import { AppsConfig, getModuleIdentifier, getScalprum } from '@scalprum/core';

type SharedScope = Record<string, Record<string, { loaded?: 1; get: () => Promise<unknown>; from: string; eager: boolean }>>;

declare global {
  // eslint-disable-next-line no-var
  var __webpack_share_scopes__: SharedScope;
  // var fetch: typeof fetchInternal;
}

export function mockWebpackShareScope() {
  const __webpack_share_scopes__: SharedScope = {
    default: {},
  };
  globalThis.__webpack_share_scopes__ = __webpack_share_scopes__;
}

export function mockFetch() {
  if (!globalThis.fetch) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.fetch = fetchPolyfill;
  }
}

export function mockScalprum() {
  mockWebpackShareScope();
  mockFetch();
}

type ModuleMock = {
  [importName: string]: React.ComponentType<any>;
};

const ScalprumInitGate: React.ComponentType<
  React.PropsWithChildren<{
    moduleMock: ModuleMock;
    pluginManifest: PluginManifest;
    moduleName: string;
  }>
> = ({ children, moduleMock, pluginManifest, moduleName }) => {
  const scalprum = useScalprum();
  const [mockReady, setMockReady] = React.useState(false);
  const { initialized } = scalprum;
  useEffect(() => {
    if (initialized && !mockReady) {
      const scalprum = getScalprum();
      scalprum.exposedModules[getModuleIdentifier(pluginManifest.name, moduleName)] = moduleMock;
      setMockReady(true);
    }
  }, [initialized, mockReady]);
  if (!initialized || !mockReady) {
    return null;
  }

  return <>{children}</>;
};

export const DEFAULT_MODULE_TEST_ID = 'default-module-test-id';

export function mockPluginData(
  {
    headers = new Headers(),
    url = 'http://localhost:3000/test-plugin/plugin-manifest.json',
    type = 'default',
    ok = true,
    status = 200,
    statusText = 'OK',
    pluginManifest = {
      baseURL: 'http://localhost:3000',
      extensions: [],
      loadScripts: [],
      name: 'test-plugin',
      version: '1.0.0',
      registrationMethod: 'custom',
    },
    module = 'ExposedModule',
    moduleMock = {
      default: () => <div data-testid={DEFAULT_MODULE_TEST_ID}>Default module</div>,
    },
    config = {
      [pluginManifest.name]: {
        name: pluginManifest.name,
        manifestLocation: url,
      },
    },
  }: {
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
  } = {},
  api: ScalprumProviderProps['api'] = {},
) {
  const response: Response = {
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    headers,
    ok,
    redirected: false,
    status,
    statusText,
    url,
    type,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => {
      return Promise.resolve(new ArrayBuffer(0));
    },
    text() {
      return Promise.resolve(JSON.stringify(pluginManifest));
    },
    json: () => {
      return Promise.resolve(pluginManifest);
    },
    clone: () => response,
  };

  const TestScalprumProvider: React.ComponentType<React.PropsWithChildren<{}>> = ({ children }) => {
    return (
      <ScalprumProvider config={config} api={api}>
        <ScalprumInitGate moduleName={module} pluginManifest={pluginManifest} moduleMock={moduleMock}>
          {children}
        </ScalprumInitGate>
      </ScalprumProvider>
    );
  };

  return { response, TestScalprumProvider };
}

mockScalprum();
