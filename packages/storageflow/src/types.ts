export type Prettify<T> = {
  [K in keyof T]: T[K];
} & unknown;

type AddFn = (args: { a: string; b: string }) => number;

type OmitParameters<
  T extends (...args: any) => any,
  K extends keyof Parameters<T>[0],
> = (args: Omit<Parameters<T>[0], K>) => ReturnType<T>;
