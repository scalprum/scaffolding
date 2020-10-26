export const injectScript = (appName: string, scriptLocation: string) => {
  let s: HTMLScriptElement | undefined = undefined;
  const injectionPromise = new Promise((res, rej) => {
    s = document.createElement('script');
    s.src = scriptLocation;
    s.id = appName;
    s.onload = (...args) => {
      console.log(args);
      res(name);
    };
    s.onerror = (...args) => {
      console.log(args);
      rej(args);
    };
  });
  if (typeof s !== 'undefined') {
    document.body.appendChild(s);
  }

  return injectionPromise;
};
