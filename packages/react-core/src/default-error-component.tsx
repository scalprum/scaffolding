import React from 'react';

type ErrorWithCause = {
  cause: {
    message?: string;
    name?: string;
    request?: string;
    type?: string;
    stack?: string;
  };
};
function isErrorWithCause(error: any): error is ErrorWithCause {
  return error?.cause && typeof error.cause === 'object';
}

const DefaultErrorComponent = ({
  error,
  errorInfo,
}: {
  error?: {
    cause?: ErrorWithCause;
    message?: React.ReactNode;
    stack?: React.ReactNode;
  };
  errorInfo?: {
    componentStack?: React.ReactNode;
  };
}) => {
  if (isErrorWithCause(error)) {
    return <DefaultErrorComponent error={error.cause as any} errorInfo={errorInfo} />;
  }
  return (
    <div>
      <h2>Error loading component</h2>
      {typeof error === 'string' && <p>{error}</p>}
      {error?.cause && typeof error?.cause !== 'object' && <p>{error.cause}</p>}
      {error?.message && <p>{error.message}</p>}
      {errorInfo?.componentStack ? <pre>{errorInfo?.componentStack}</pre> : error?.stack && <pre>{error.stack}</pre>}
    </div>
  );
};

export default DefaultErrorComponent;
