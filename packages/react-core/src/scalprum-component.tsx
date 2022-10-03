import React, { useEffect, Suspense, useState, ReactNode, useReducer } from 'react';
import { getCachedModule, getAppData, injectScript, processManifest, getPendingLoading, setPendingLoading } from '@scalprum/core';
import isEqual from 'lodash/isEqual';
import { loadComponent } from './async-loader';
import DefaultErrorComponent from './default-error-component';

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
  const [Component, setComponent] = useState<React.ComponentType<{ ref?: React.Ref<unknown> }> | undefined>(undefined);
  const cachedModule = getCachedModule(scope, module, skipCache);
  useEffect(() => {
    let isMounted = true;
    const handleLoadingError = () => isMounted && setComponent(() => (props: any) => <ErrorComponent {...props} />);
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
          const injecttionPromise = injectScript(appName, scriptLocation)
            .then(() => {
              isMounted && setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
            })
            .catch(handleLoadingError);
          // lock module preload
          setPendingLoading(scope, module, injecttionPromise);
        } else if (manifestLocation) {
          const processPromise = processManifest(manifestLocation, appName, scope, processor)
            .then(() => {
              isMounted && setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
            })
            .catch(handleLoadingError);
          // lock module preload
          setPendingLoading(scope, module, processPromise);
        }
      } else {
        try {
          isMounted && setComponent(() => cachedModule.default);
        } catch {
          handleLoadingError();
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [appName, scope, cachedModule, skipCache, reRender]);

  return <Suspense fallback={fallback}>{Component ? <Component ref={innerRef} {...props} /> : fallback}</Suspense>;
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
