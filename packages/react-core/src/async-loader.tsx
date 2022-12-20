import React from 'react';
import { asyncLoader } from '@scalprum/core';

export async function loadComponent(
  scope: string,
  module: string
): Promise<{ prefetch: Promise<any> | undefined; component: React.ComponentType<any> }> {
  {
    const mod = await asyncLoader(scope, module);
    return {
      prefetch: mod.prefetch,
      component: mod.default,
    };
  }
}
