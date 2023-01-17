import React from 'react';
import { asyncLoader, PrefetchFunction } from '@scalprum/core';

export async function loadComponent(scope: string, module: string): Promise<{ prefetch?: PrefetchFunction; component: React.ComponentType<any> }> {
  {
    const mod = await asyncLoader<React.ComponentType>(scope, module);
    return {
      prefetch: mod.prefetch,
      component: mod.default,
    };
  }
}
