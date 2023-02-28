import React from 'react';

const DefaultErrorComponent = ({
  error,
  errorInfo,
}: {
  error?: {
    message?: React.ReactNode;
    stack?: React.ReactNode;
  };
  errorInfo?: {
    componentStack?: React.ReactNode;
  };
}) => {
  return (
    <div>
      <h2>Error loading component</h2>
      {typeof error === 'string' && <p>{error}</p>}
      {error?.message && <p>{error.message}</p>}
      {errorInfo?.componentStack ? <pre>{errorInfo?.componentStack}</pre> : error?.stack && <pre>{error.stack}</pre>}
    </div>
  );
};

export default DefaultErrorComponent;
