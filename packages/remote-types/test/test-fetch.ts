import { get as getHttp } from 'http';
import { get as getHttps } from 'https';

globalThis.fetch = ((input: string | URL) => {
  const request = input.toString().startsWith('https:') ? getHttps : getHttp;
  return new Promise((resolve, reject) => {
    request(input, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          arrayBuffer: async () => body,
          ok: (response.statusCode ?? 500) >= 200 && (response.statusCode ?? 500) < 300,
          status: response.statusCode ?? 500,
          statusText: response.statusMessage ?? '',
        } as unknown as Response);
      });
    }).on('error', reject);
  });
}) as typeof fetch;
