import type { RemoteTypes } from '@scalprum/remote-types';

export type { RemoteTypes } from '@scalprum/remote-types';

export type RemoteModuleKey<S extends string, M extends string, I extends string | undefined = undefined> = `${S}${M}${I extends string
  ? I extends 'default'
    ? ''
    : `.${I}`
  : ''}`;

export type RemoteModule<S extends string, M extends string, I extends string | undefined = undefined> =
  RemoteModuleKey<S, M, I> extends infer Key ? (Key extends keyof RemoteTypes ? RemoteTypes[Key] : any) : never;

export type RemoteModuleArgs<S extends string, M extends string, I extends string | undefined = undefined> =
  RemoteModule<S, M, I> extends (...args: infer Args) => any ? Args : any[];

export type RemoteModuleResult<S extends string, M extends string, I extends string | undefined = undefined> =
  RemoteModule<S, M, I> extends (...args: any[]) => any ? ReturnType<Extract<RemoteModule<S, M, I>, (...args: any[]) => any>> : any;

export type RemoteComponentProps<S extends string, M extends string, I extends string | undefined = undefined> =
  RemoteModuleKey<S, M, I> extends infer Key
    ? Key extends keyof RemoteTypes
      ? RemoteTypes[Key] extends (...args: infer Args) => any
        ? Args extends []
          ? Record<never, never>
          : NonNullable<Args[0]> extends Record<string, any>
            ? NonNullable<Args[0]>
            : Record<string, any>
        : Record<string, any>
      : Record<string, any>
    : Record<string, any>;
