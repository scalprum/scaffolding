import React, { useEffect, Suspense, useState, ReactNode, useReducer, useRef } from 'react';
import {
  getCachedModule,
  handlePrefetchPromise,
  getAppData,
  processManifest,
  getPendingLoading,
  setPendingLoading,
  getPendingPrefetch,
  PrefetchFunction,
} from '@scalprum/core';
import isEqual from 'lodash/isEqual';
import { loadComponent } from './async-loader';
import DefaultErrorComponent from './default-error-component';
import { PrefetchProvider } from './prefetch-context';
import { useScalprum } from './use-scalprum';

export type ScalprumComponentProps<API extends Record<string, any> = {}, Props extends Record<string, any> = {}> = Props & {
  fallback?: NonNullable<React.ReactNode> | null;
  api?: API;
  scope: string;
  module: string;
  importName?: string;
  ErrorComponent?: React.ReactElement;
  LoadingComponent?: React.ComponentType;
  innerRef?: React.Ref<unknown>;
  processor?: (item: any) => string[];
  skipCache?: boolean;
};

interface LoadModuleProps extends Omit<ScalprumComponentProps, 'ErrorComponent'> {
  ErrorComponent: React.ComponentType;
}

async function setComponentFromModule(
  scope: string,
  module: string,
  isMounted: boolean,
  importName: string,
  setComponent: React.Dispatch<
    React.SetStateAction<
      | React.ComponentType<{
          ref?: React.Ref<unknown> | undefined;
        }>
      | undefined
    >
  >,
): Promise<PrefetchFunction | undefined> {
  const { prefetch, component } = await loadComponent(scope, module, importName);
  isMounted && setComponent(() => component);
  return prefetch;
}

const LoadModule: React.ComponentType<LoadModuleProps> = ({
  fallback = 'loading',
  scope,
  module,
  ErrorComponent,
  processor,
  innerRef,
  skipCache = false,
  importName = 'default',
  ...props
}) => {
  const { manifestLocation, pluginManifest } = getAppData(scope);
  const [reRender, forceRender] = useReducer((prev) => prev + 1, 0);
  const [Component, setComponent] = useState<React.ComponentType<{ ref?: React.Ref<unknown> } & Record<string, any>> | undefined>(undefined);
  const [prefetchPromise, setPrefetchPromise] = useState<Promise<any>>();
  const [loadingError, setLoadingError] = useState<Error | undefined>();

  if (loadingError) {
    // Error has to be thrown during render loop. Promise based errors won't be catched by error boundary.
    throw loadingError;
  }

  const scalprumApi = useScalprum();

  useEffect(() => {
    const prefetchID = `${scope}#${module}`;
    const { cachedModule, prefetchPromise } = getCachedModule(scope, module);
    setPrefetchPromise(prefetchPromise);

    let isMounted = true;
    const handleLoadingError = (error?: Error) => {
      setLoadingError(error);
      setComponent(() => (props: any) => <ErrorComponent error={error} {...props} />);
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
        if (manifestLocation || pluginManifest) {
          const processPromise = processManifest((manifestLocation ?? pluginManifest)!, scope, module, processor)
            .then(() => {
              pref = setComponentFromModule(scope, module, isMounted, importName, setComponent);
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
          isMounted && setComponent(() => cachedModule[importName]);

          pref = cachedModule.prefetch;
          if (pref) {
            const prefetch = getPendingPrefetch(prefetchID) || pref(scalprumApi);
            setPrefetchPromise(prefetch);
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
  }, [scope, skipCache, reRender]);

  // clear prefetchPromise (from factory)
  const initialPrefetch = useRef(false);
  useEffect(() => {
    if (initialPrefetch.current) {
      setPrefetchPromise(undefined);
    }
    initialPrefetch.current = true;
  }, [scope, module]);

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

  // TODO: Use ErrorWithCause once the type is available
  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    if (this.selfRepairAttempt === true) {
      console.error('Scalprum encountered an error!', error?.cause || error.message, error);
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
