import * as AdmZipModule from 'adm-zip';
import type AdmZipClass from 'adm-zip';

type AdmZipConstructor = new (input?: string | Buffer) => AdmZipClass;

// adm-zip is CommonJS. Normalize native CommonJS and transpiled default interop.
export const AdmZip = ((AdmZipModule as unknown as { default?: AdmZipConstructor }).default ?? AdmZipModule) as AdmZipConstructor;
