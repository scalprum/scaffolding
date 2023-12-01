/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect, useState } from 'react';

const RemoteSetup = () => {
  const [Component, setComponent] = useState<React.ComponentType | undefined>(undefined);
  useEffect(() => {
    const src = '/testApp.js';
    const script = document.createElement('script');
    script.src = src;
    script.onload = async () => {
      document.body.removeChild(script);
      // @ts-ignore
      await global['testApp'].init(__webpack_share_scopes__.default);
      // @ts-ignore
      const mod = await global['testApp'].get('BaseModule');
      console.log({ mod: mod().default });
      setComponent(() => mod().default);
    };
    document.body.appendChild(script);
  }, []);
  return <div>{!Component ? <p>Loading...</p> : <Component />}</div>;
};

export function App() {
  return (
    <React.Suspense fallback={null}>
      <div>
        <h1>There will be dragons</h1>
      </div>
      <RemoteSetup />
    </React.Suspense>
  );
}

export default App;
