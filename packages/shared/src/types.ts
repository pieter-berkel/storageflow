export type MaybePromise<TType> = Promise<TType> | TType;

export type Simplify<TType> = TType extends any[] | Date
  ? TType
  : { [K in keyof TType]: TType[K] };
