declare module 'whatwg-fetch' {
  function fetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response>;
}
