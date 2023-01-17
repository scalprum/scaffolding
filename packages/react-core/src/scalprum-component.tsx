import React, { useEffect, Suspense, useState, ReactNode, useReducer } from 'react';
import {
  getCachedModule,
  handlePrefetchPromise,
  getAppData,
  injectScript,
  processManifest,
  getPendingLoading,
  setPendingLoading,
  getPendingPrefetch,
} from '@scalprum/core';
import isEqual from 'lodash/isEqual';
import { loadComponent } from './async-loader';
import DefaultErrorComponent from './default-error-component';
import { PrefetchProvider } from './prefetch-context';
import { useScalprum } from './use-scalprum';

// eslint-disable-next-line @typescript-eslint/ban-types
export type ScalprumComponentProps<API extends Record<string, any> = {}, Props extends Record<string, any> = {}> = Props & {
  fallback?: NonNullable<React.ReactNode> | null;
  appName: string;
  api?: API;
  scope: string;
  module: string;
  ErrorComponent?: React.ReactElement;
  LoadingComponent?: React.ComponentType;
  innerRef?: React.Ref<unknown>;
  processor?: (item: any) => string;
  skipCache?: boolean;
};

interface LoadModuleProps extends Omit<ScalprumComponentProps, 'ErrorComponent'> {
  ErrorComponent: React.ComponentType;
}

async function setComponentFromModule(
  scope: string,
  module: string,
  isMounted: boolean,
  setComponent: React.Dispatch<
    React.SetStateAction<
      | React.ComponentType<{
          ref?: React.Ref<unknown> | undefined;
        }>
      | undefined
    >
  >
): Promise<(...args: any[]) => Promise<any> | undefined> {
  const { prefetch, component } = await loadComponent(scope, module);
  isMounted && setComponent(() => component);
  return prefetch;
}

const LoadModule: React.ComponentType<LoadModuleProps> = ({
  fallback = 'loading',
  appName,
  scope,
  module,
  ErrorComponent,
  processor,
  innerRef,
  skipCache = false,
  ...props
}) => {
  const { scriptLocation, manifestLocation } = getAppData(appName);
  const [reRender, forceRender] = useReducer((prev) => prev + 1, 0);
  const [Component, setComponent] = useState<React.ComponentType<{ ref?: React.Ref<unknown> } & Record<string, any>> | undefined>(undefined);
  const [prefetchPromise, setPrefetchPromise] = useState<Promise<any>>();
  const [loadingError, setLoadingError] = useState<Error | undefined>();

  if (loadingError) {
    // Error has to be thrown during render loop. Promise based errors won't be catched by error boundary.
    throw loadingError;
  }

  const { api: scalprumApi } = useScalprum();

  useEffect(() => {
    const prefetchID = `${scope}#${module}`;
    const { cachedModule, prefetchPromise } = getCachedModule(scope, module, skipCache);
    setPrefetchPromise(prefetchPromise);

    let isMounted = true;
    const handleLoadingError = (error?: Error) => {
      if (isMounted) {
        setLoadingError(error);
        setComponent(() => (props: any) => <ErrorComponent error={error} {...props} />);
      }
    };
    let pref;
    /**
     * Check if module is being pre-loaded
     */
    const pendingLoading = getPendingLoading(scope, module);

    if (!cachedModule && pendingLoading) {
      pendingLoading.finally(() => {
        forceRender();
      });
    } else {
      /**
       * Here will be registry check
       */
      if (!cachedModule) {
        if (scriptLocation) {
          const injectionPromise = injectScript(appName, scriptLocation)
            .then(() => {
              pref = setComponentFromModule(scope, module, isMounted, setComponent);
              if (pref) {
                pref.then((result) => {
                  if (result) {
                    const prefetch = getPendingPrefetch(prefetchID) || result(scalprumApi);
                    setPrefetchPromise(prefetch);
                    handlePrefetchPromise(prefetchID, prefetch);
                  }
                });
              }
              return pref;
            })
            .catch(handleLoadingError);

          // lock module preload
          setPendingLoading(scope, module, injectionPromise);
        } else if (manifestLocation) {
          const processPromise = processManifest(manifestLocation, appName, scope, processor)
            .then(() => {
              pref = setComponentFromModule(scope, module, isMounted, setComponent);
              pref.then((result) => {
                if (result) {
                  const prefetch = getPendingPrefetch(prefetchID) || result(scalprumApi);
                  setPrefetchPromise(prefetch);
                  handlePrefetchPromise(prefetchID, prefetch);
                }
              });
              return pref;
            })
            .catch(handleLoadingError);

          // lock module preload
          setPendingLoading(scope, module, processPromise);
        }
      } else {
        try {
          isMounted && setComponent(() => cachedModule.default);

          pref = cachedModule.prefetch;
          if (pref) {
            const prefetch = getPendingPrefetch(prefetchID) || pref(scalprumApi);
            setPrefetchPromise(prefetch);
            prefetch.then(console.error);
            handlePrefetchPromise(prefetchID, prefetch);
          }
        } catch (e) {
          handleLoadingError(e as Error);
        }
      }
    }

    return () => {
      isMounted = false;
      setLoadingError(undefined);
    };
  }, [appName, scope, skipCache, reRender]);

  // clear prefetchPromise (from factory)
  useEffect(() => {
    setPrefetchPromise(undefined);
  }, [appName, scope, module]);

  return (
    <PrefetchProvider prefetchPromise={prefetchPromise}>
      <Suspense fallback={fallback}>{Component ? <Component ref={innerRef} {...props} /> : fallback}</Suspense>
    </PrefetchProvider>
  );
};

interface BaseScalprumComponentState {
  hasError: boolean;
  error?: any;
  errorInfo?: any;
  repairAttempt?: boolean;
}

class BaseScalprumComponent extends React.Component<ScalprumComponentProps, BaseScalprumComponentState> {
  selfRepairAttempt: boolean;
  static defaultProps = {
    ErrorComponent: <DefaultErrorComponent />,
  };
  constructor(props: ScalprumComponentProps) {
    super(props);
    this.state = { hasError: false };
    this.selfRepairAttempt = false;
  }

  static getDerivedStateFromError(): BaseScalprumComponentState {
    return { hasError: true };
  }

  shouldComponentUpdate(nextProps: ScalprumComponentProps, nextState: BaseScalprumComponentState) {
    if (this.state.hasError !== nextState.hasError) {
      return true;
    }

    return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.selfRepairAttempt === true) {
      console.error('Scalprum encountered an error!', error.message);
      this.setState({ error, errorInfo });
    } else {
      console.warn('Scalprum failed to render component. Attempting to skip module cache.');
      this.setState({ repairAttempt: true });
    }
  }

  render(): ReactNode {
    const { ErrorComponent = <DefaultErrorComponent {...this.state} />, ...props } = this.props;

    const PreparedError: React.ComponentType = (props: any) => {
      return React.cloneElement<typeof this.state>(ErrorComponent, { ...this.state, ...props });
    };

    if (this.state.repairAttempt && !this.selfRepairAttempt) {
      /**
       * Retry fetching module with disabled cache
       */
      this.selfRepairAttempt = true;
      return <LoadModule {...props} skipCache ErrorComponent={PreparedError} />;
    }

    if (this.state.hasError && this.selfRepairAttempt) {
      return React.cloneElement(ErrorComponent as React.FunctionComponentElement<BaseScalprumComponentState>, { ...this.state });
    }
    return <LoadModule {...props} ErrorComponent={PreparedError} />;
  }
}

export const ScalprumComponent: React.ComponentType<ScalprumComponentProps> = React.forwardRef((props, ref) => (
  <BaseScalprumComponent {...props} innerRef={ref} />
));
