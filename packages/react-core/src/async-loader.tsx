import React from 'react';
import { asyncLoader, PrefetchFunction } from '@scalprum/core';

export async function loadComponent<P = {}>(
  scope: string,
  module: string
): Promise<{ prefetch?: PrefetchFunction; component: React.ComponentType<P> }> {
  {
    const mod = await asyncLoader<React.ComponentType<P>>(scope, module);
    return {
      prefetch: mod.prefetch,
      component: mod.default,
    };
  }
}
