import React from 'react';

const DefaultErrorComponent = ({ error, errorInfo }: { error?: any; errorInfo?: any }) => {
  return (
    <div>
      <h2>Error loading component</h2>
      {error?.message && <p className="foo">{error.message}</p>}
      {errorInfo?.componentStack ? <pre>{errorInfo?.componentStack}</pre> : error?.stack && <pre>{error.stack}</pre>}
    </div>
  );
};

export default DefaultErrorComponent;
