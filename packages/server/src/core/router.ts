import { z } from "zod";

export type Accept = string[];

export type AnyAccept = Accept;

export type MaxSize = number;

export type AnyMaxSize = MaxSize;

export type AnyInput = z.ZodTypeAny;

export type MiddlewareArgs<TRequest, TResponse> = {
  request: TRequest;
  response: TResponse;
};

export type AnyMiddlewareArgs = MiddlewareArgs<any, any>;

export type Middleware<
  TMiddlewareArgs extends AnyMiddlewareArgs,
  TInput extends AnyInput,
> = (params: {
  request: TMiddlewareArgs["request"];
  response: TMiddlewareArgs["response"];
  input: z.infer<TInput>;
}) => any;

export type AnyMiddleware = Middleware<AnyMiddlewareArgs, AnyInput>;

export type Path<
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
> = (params: {
  input: z.infer<TInput>;
  metadata: Awaited<ReturnType<TMiddleware>>;
}) => string | undefined;

export type AnyPath = Path<AnyInput, AnyMiddleware>;

export type Def<
  TAccept extends AnyAccept,
  TMaxSize extends AnyMaxSize,
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
  TPath extends AnyPath,
> = {
  accept?: TAccept;
  maxSize: TMaxSize;
  input: TInput;
  middleware: TMiddleware;
  path: TPath;
};

export type AnyDef = Def<
  AnyAccept,
  AnyMaxSize,
  AnyInput,
  AnyMiddleware,
  AnyPath
>;

export type Builder<
  TDef extends AnyDef,
  TMiddlewareArgs extends AnyMiddlewareArgs,
> = {
  _def: TDef;
  accept: <TAccept extends Accept>(
    params: TAccept,
  ) => Builder<
    {
      accept: TAccept;
      maxSize: TDef["maxSize"];
      input: TDef["input"];
      middleware: TDef["middleware"];
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  maxSize: <TMaxSize extends MaxSize>(
    params: TMaxSize,
  ) => Builder<
    {
      accept: TDef["accept"];
      maxSize: TMaxSize;
      input: TDef["input"];
      middleware: TDef["middleware"];
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  input: <TInput extends AnyInput>(
    input: TInput,
  ) => Builder<
    {
      accept: TDef["accept"];
      maxSize: TDef["maxSize"];
      input: TInput;
      middleware: TDef["middleware"];
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  middleware: <TMiddleware extends Middleware<TMiddlewareArgs, TDef["input"]>>(
    params: TMiddleware,
  ) => Builder<
    {
      accept: TDef["accept"];
      maxSize: TDef["maxSize"];
      input: TDef["input"];
      middleware: TMiddleware;
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  path: <TPath extends Path<TDef["input"], TDef["middleware"]>>(
    params: TPath,
  ) => Builder<
    {
      accept: TDef["accept"];
      maxSize: TDef["maxSize"];
      input: TDef["input"];
      middleware: TDef["middleware"];
      path: TPath;
    },
    TMiddlewareArgs
  >;
};

export const builder = <TMiddlewareArgs extends AnyMiddlewareArgs>(
  initDef?: Partial<AnyDef>,
): Builder<AnyDef, TMiddlewareArgs> => {
  const _def: AnyDef = {
    accept: undefined,
    maxSize: Infinity,
    input: z.never(),
    middleware: () => ({}),
    path: () => undefined,
    ...initDef,
  };

  return {
    _def,
    accept: (accept) => {
      return builder({ ..._def, accept }) as any;
    },
    maxSize: (maxSize) => {
      return builder({ ..._def, maxSize }) as any;
    },
    input: (input) => {
      return builder({ ..._def, input }) as any;
    },
    middleware: (middleware) => {
      return builder({ ..._def, middleware }) as any;
    },
    path: (path) => {
      return builder({ ..._def, path }) as any;
    },
  };
};

export type StorageRouter = Record<string, Builder<AnyDef, AnyMiddlewareArgs>>;

export const createStorageRouter = <
  TMiddlewareArgs extends AnyMiddlewareArgs,
  TOutput extends StorageRouter = StorageRouter,
>(
  func: (storage: typeof builder<TMiddlewareArgs>) => TOutput,
) => func(builder);
