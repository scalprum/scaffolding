import React, { useEffect } from 'react';

const LoadingComponent: React.FC = () => {
  useEffect(() => {
    console.log('Loading component mounted');
  }, []);
  return <div>Super duper loading</div>;
};

export default LoadingComponent;
