import React from 'react';
import { useScalprum } from '@scalprum/react-core';

export const ApiConsumer = ({ label }: { label: string }) => {
  const { api } = useScalprum();
  if (!api) return null;
  return (
    <div>
      {label} API consumer isBeta: {`${api.chrome.isBeta()}`}
    </div>
  );
};

export const ApiChanger = () => {
  const { api } = useScalprum();
  if (!api) return null;
  return (
    <div>
      API changer: <button onClick={() => api.chrome.setIsBeta((prev: boolean) => !prev)}>Toggle isBeta</button>
    </div>
  );
};
