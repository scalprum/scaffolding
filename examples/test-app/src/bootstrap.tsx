import React, { PropsWithChildren, StrictMode, useEffect, useState } from 'react';
import ReactDOMLib from 'react-dom';
import ReactDOM from 'react-dom/client';
import Entry from './entry';
import { getSharedScope } from '@scalprum/core';

async function patchSharedScope() {
  const BRIDGE_KEY = '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE';
  const LEGACY_BRIDGE_KEY = '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED';
  const DOM_BRIDGE_KEY = '__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE';
  const scope = getSharedScope();
  console.log({ scope });
  const reactKey = Object.keys(scope.react).find((key) => {
    // would be chrome
    const isShell = scope.react[key].from === 'chrome';
    const isLoaded = scope.react[key].loaded;
    const isSingleton = scope.react[key].shareConfig.singleton;

    return isShell && isLoaded && isSingleton;
  });

  const reactDomKey = Object.keys(scope['react-dom']).find((key) => {
    // would be chrome
    const isShell = scope['react-dom'][key].from === 'chrome';
    const isLoaded = scope['react-dom'][key].loaded;
    const isSingleton = scope['react-dom'][key].shareConfig.singleton;

    return isShell && isLoaded && isSingleton;
  });

  console.log({ reactDomKey })

  if (!reactKey || !reactDomKey) {
    return;
  }
  const reactShellPackage = scope.react[reactKey];
  const reactDomShellPackage = scope['react-dom'][reactDomKey];

  function _createElement(type, props, children) {
    console.log('createElement', { type, props, children });
    return React.createElement(type, props, children);
  }

  const mappedReactBridge = {
    A: null,
    // @ts-ignore
    H: React[LEGACY_BRIDGE_KEY].ReactCurrentDispatcher?.current,
    // @ts-ignore
    T: React[LEGACY_BRIDGE_KEY].ReactCurrentBatchConfig?.transition,
    // @ts-ignore
    S: (...args) => {
      console.log('S', args);
    },
  };

  const patchedReact = {
    ...React,
    // createElement: _createElement,
    // @ts-ignore
    [BRIDGE_KEY]: mappedReactBridge,
  };

  const mappedReactDOMBridge = {
    findDOMNode: ReactDOMLib.findDOMNode,
    p: 0,
  }

  const patchedReactDOM = {
    ...ReactDOMLib,
    [DOM_BRIDGE_KEY]: mappedReactDOMBridge,
  }

  scope.react[reactKey].get = () => Promise.resolve(() => patchedReact);
  scope.react[reactKey].lib = () => patchedReact;
  scope['react-dom'][reactDomKey].get = () => Promise.resolve(() => patchedReactDOM);
  scope['react-dom'][reactDomKey].lib = () => patchedReactDOM;
  console.log({ reactShellPackage });
  console.log({ reactDomShellPackage });
}

const AsyncEntry = ({ children }: PropsWithChildren) => {
  const [patched, setPatched] = useState(false);
  async function patchReactBridge() {
    await patchSharedScope();
    setPatched(true);
  }
  useEffect(() => {
    patchReactBridge();
  }, []);

  if (!patched) {
    return null;
  }

  return <>{children}</>;
};

// initSharedScope();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <AsyncEntry>
      <Entry />
    </AsyncEntry>
  </StrictMode>,
);
