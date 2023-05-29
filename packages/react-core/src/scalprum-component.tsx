import React, { useEffect, Suspense, useState, ReactNode, useRef, useMemo } from 'react';
import {
  getCachedModule,
  handlePrefetchPromise,
  getAppData,
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
  api?: API;
  scope: string;
  module: string;
  ErrorComponent?: React.ReactElement;
  LoadingComponent?: React.ComponentType;
  innerRef?: React.Ref<unknown>;
  processor?: (item: any) => string[];
  skipCache?: boolean;
};

type LoadModuleProps = Omit<ScalprumComponentProps, 'ErrorComponent'>;

const LoadModule: React.ComponentType<LoadModuleProps> = ({
  fallback = 'loading',
  scope,
  module,
  processor,
  innerRef,
  skipCache = false,
  ...props
}) => {
  const { manifestLocation } = getAppData(scope);
  const [prefetchPromise, setPrefetchPromise] = useState<Promise<any>>();
  const { cachedModule } = getCachedModule(scope, module);
  const prefetchID = `${scope}#${module}`;

  const scalprumApi = useScalprum();

  const initComponent = async (): Promise<React.ComponentType<{ ref?: React.Ref<unknown> } & Record<string, any>>> => {
    const { cachedModule, prefetchPromise } = getCachedModule(scope, module);
    if (!skipCache && cachedModule) {
      setPrefetchPromise(prefetchPromise);
      return cachedModule.default;
    }
    const pendingLoading = getPendingLoading(scope, module);
    if (pendingLoading) {
      return pendingLoading.then(() => {
        const { cachedModule } = getCachedModule(scope, module);
        return cachedModule?.default;
      });
    }
    const processPromise = processManifest(manifestLocation || '', scope, module, processor).then(() =>
      loadComponent(scope, module).then(({ component, prefetch }) => {
        if (prefetch) {
          const prefetchResult = getPendingPrefetch(prefetchID) || prefetch(scalprumApi);
          setPrefetchPromise(prefetchResult);
          handlePrefetchPromise(prefetchID, prefetchResult);
        }
        return component;
      })
    );
    setPendingLoading(module, scope, processPromise);
    return processPromise;
  };

  // clear prefetchPromise (from factory)
  const initialPrefetch = useRef(false);
  useEffect(() => {
    if (initialPrefetch.current) {
      setPrefetchPromise(undefined);
    }
    // handle promise prefetch for duplicate module
    if (!prefetchPromise && cachedModule?.prefetch) {
      const prefetchResult = getPendingPrefetch(prefetchID) || cachedModule.prefetch(scalprumApi);
      setPrefetchPromise(prefetchResult);
      handlePrefetchPromise(prefetchID, prefetchResult);
    }
    initialPrefetch.current = true;
  }, [scope, module]);

  const Component = useMemo(() => {
    if (!skipCache && cachedModule?.default) {
      return cachedModule.default;
    }
    return React.lazy(() =>
      initComponent().then((r) => {
        return { default: r };
      })
    );
  }, [scope, module]);
  return (
    <PrefetchProvider prefetchPromise={prefetchPromise}>
      <Suspense fallback={fallback}>{<Component ref={innerRef} {...props} />}</Suspense>
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
  static defaultProps = {
    ErrorComponent: <DefaultErrorComponent />,
  };
  constructor(props: ScalprumComponentProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): BaseScalprumComponentState {
    return { hasError: true, error };
  }

  shouldComponentUpdate(nextProps: ScalprumComponentProps, nextState: BaseScalprumComponentState) {
    if (this.state.hasError !== nextState.hasError) {
      return true;
    }

    return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error('Scalprum encountered an error!', error?.cause || error.message, error);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    const { ErrorComponent = <DefaultErrorComponent {...this.state} />, ...props } = this.props;

    if (this.state.hasError) {
      return React.cloneElement(ErrorComponent as React.FunctionComponentElement<BaseScalprumComponentState>, { ...this.state });
    }
    return <LoadModule {...props} />;
  }
}

export const ScalprumComponent: React.ComponentType<ScalprumComponentProps> = React.forwardRef((props, ref) => (
  <BaseScalprumComponent {...props} innerRef={ref} />
));
