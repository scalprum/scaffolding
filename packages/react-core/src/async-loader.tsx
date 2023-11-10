import React from 'react';
import { ExposedScalprumModule, getCachedModule, getScalprum, PrefetchFunction } from '@scalprum/core';

export async function loadComponent<P = {}>(
  scope: string,
  module: string,
  importName = 'default',
): Promise<{ prefetch?: PrefetchFunction; component: React.ComponentType<P> }> {
  {
    const { pluginStore } = getScalprum();
    let mod: ExposedScalprumModule | undefined;
    const { cachedModule } = getCachedModule<React.ComponentType<P>, PrefetchFunction>(scope, module);
    mod = cachedModule;
    if (!mod) {
      mod = await pluginStore.getExposedModule<ExposedScalprumModule>(scope, module);
    }
    return {
      prefetch: mod.prefetch,
      component: mod[importName],
    };
  }
}
