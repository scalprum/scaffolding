import { TextEncoder, TextDecoder } from 'node:util';

// jsdom's test environment doesn't expose these globally, but react-router-dom
// v7 references them at module load time.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}
