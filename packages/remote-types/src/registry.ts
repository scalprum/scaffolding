import { getArchiveLocation } from './locations.js';
import type { ModuleConfigEntry, ModulesConfig, RegistryEntry } from './plugin-types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedRemoteTypesLocation(manifest: Record<string, unknown>): string | undefined {
  const customProperties = isRecord(manifest.customProperties) ? manifest.customProperties : undefined;
  const scalprumProperties = customProperties && isRecord(customProperties.scalprum) ? customProperties.scalprum : undefined;
  const metadata = isRecord(manifest.metaData) ? manifest.metaData : undefined;
  const metadataTypes = metadata && isRecord(metadata.types) ? metadata.types : undefined;
  const candidates = [
    manifest.remoteTypesLocation,
    customProperties?.remoteTypesLocation,
    scalprumProperties?.remoteTypesLocation,
    metadataTypes?.zip,
  ];
  return candidates.find((value): value is string => typeof value === 'string');
}

function defaultRemoteTypesLocation(registryLocation: string | URL, filename: string): string | URL {
  return getArchiveLocation(filename, registryLocation);
}

export function normalizeRegistryPayload(
  payload: unknown,
  registryLocation: string | URL,
  remoteTypesFilename: string,
  expectedScope?: string,
): RegistryEntry[] {
  if (isRecord(payload) && typeof payload.name === 'string') {
    if (expectedScope && payload.name !== expectedScope) {
      throw new Error(`Remote type scope mismatch: expected ${expectedScope}, manifest declares ${payload.name}`);
    }
    return [
      {
        scope: expectedScope ?? payload.name,
        config: {
          remoteTypesLocation: getNestedRemoteTypesLocation(payload) ?? defaultRemoteTypesLocation(registryLocation, remoteTypesFilename),
        },
        registryLocation,
      },
    ];
  }

  if (!isRecord(payload)) {
    throw new Error(`Remote types source must contain registry object or plugin manifest: ${registryLocation.toString()}`);
  }

  if (expectedScope) {
    const config = payload[expectedScope];
    if (!isRecord(config)) throw new Error(`Remote type registry does not contain scope: ${expectedScope}`);
    return [{ scope: expectedScope, config: config as ModuleConfigEntry, registryLocation }];
  }

  return Object.entries(payload as ModulesConfig).map(([scope, config]) => {
    if (!isRecord(config)) throw new Error(`Remote type registry entry must be an object: ${scope}`);
    return { scope, config: config as ModuleConfigEntry, registryLocation };
  });
}
