// Remote declarations augment this interface from consumer-generated .d.ts files.
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
export interface RemoteTypes {}

export type RemoteTypeKey<S extends string, M extends string, I extends string | undefined = undefined> = `${S}${M}${I extends string
  ? I extends 'default'
    ? ''
    : `.${I}`
  : ''}`;

export type RemoteType<S extends string, M extends string, I extends string | undefined = undefined> =
  RemoteTypeKey<S, M, I> extends keyof RemoteTypes ? RemoteTypes[RemoteTypeKey<S, M, I>] : any;
