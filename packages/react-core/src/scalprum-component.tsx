import React, { Fragment, useEffect, Suspense, useState, ReactNode } from 'react';
import { getFactory, getAppData, injectScript, processManifest } from '@scalprum/core';
import isEqual from 'lodash/isEqual';
import { loadComponent } from './async-loader';

export type ScalprumComponentProps<API = Record<string, unknown>, Props = Record<string, unknown>> = Props & {
  fallback?: NonNullable<React.ReactNode> | null;
  appName: string;
  api?: API;
  scope: string;
  module: string;
  ErrorComponent?: ReactNode;
  LoadingComponent?: React.ComponentType;
  innerRef?: React.Ref<unknown>;
  processor?: (item: any) => string;
  skipCache?: boolean;
};

const DefaultErrorComponent: React.ComponentType = () => <span>Error while loading component!</span>;

const LoadModule: React.ComponentType<ScalprumComponentProps & { ErrorComponent: React.ComponentType }> = ({
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
  const [Component, setComponent] = useState<React.ComponentType<{ ref?: React.Ref<unknown> }> | undefined>(undefined);
  const factory = getFactory(scope, skipCache);
  useEffect(() => {
    /**
     * Here will be registry check
     */
    if (!factory) {
      if (scriptLocation) {
        injectScript(appName, scriptLocation)
          .then(() => {
            setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
          })
          .catch(() => {
            setComponent(() => ErrorComponent);
          });
      } else if (manifestLocation) {
        processManifest(manifestLocation, appName, scope, processor)
          .then(() => {
            setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
          })
          .catch(() => {
            setComponent(() => ErrorComponent);
          });
      }
    } else {
      try {
        setComponent(() => factory.get(module).default);
      } catch {
        setComponent(() => ErrorComponent);
      }
    }
  }, [appName, scope, factory]);

  return <Suspense fallback={fallback}>{Component ? <Component ref={innerRef} {...props} /> : fallback}</Suspense>;
};

interface BaseScalprumComponentState {
  hasError: boolean;
  error?: any;
  errorInfo?: any;
}

class BaseScalprumComponent extends React.Component<ScalprumComponentProps, BaseScalprumComponentState> {
  static defaultProps = {
    ErrorComponent: <DefaultErrorComponent />,
  };
  constructor(props: ScalprumComponentProps) {
    super(props);
    this.state = { hasError: false };
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
    console.error('Scalprum encountered an error!', error.message);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    const { ErrorComponent = <DefaultErrorComponent />, ...props } = this.props;

    if (this.state.hasError) {
      return React.cloneElement(ErrorComponent as React.FunctionComponentElement<BaseScalprumComponentState>, { ...this.state });
    }

    return <LoadModule {...props} ErrorComponent={() => <Fragment>{ErrorComponent}</Fragment>} />;
  }
}

export const ScalprumComponent: React.ComponentType<ScalprumComponentProps> = React.forwardRef((props, ref) => (
  <BaseScalprumComponent {...props} innerRef={ref} />
));
