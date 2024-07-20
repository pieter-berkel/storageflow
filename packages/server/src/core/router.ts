import { z } from "zod";

export type allowedMimeTypes = string[];

export type AnyallowedMimeTypes = allowedMimeTypes;

export type FileSizeLimit = number;

export type AnyFileSizeLimit = FileSizeLimit;

export type AnyInput = z.ZodTypeAny | z.ZodNever;

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

export type AnyMiddleware = Middleware<AnyMiddlewareArgs, never>;

export type Path<
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
> = (params: {
  input: z.infer<TInput>;
  metadata: Awaited<ReturnType<TMiddleware>>;
}) => string | undefined;

export type AnyPath = Path<never, AnyMiddleware>;

export type Def<
  TallowedMimeTypes extends AnyallowedMimeTypes,
  TFileSizeLimit extends AnyFileSizeLimit,
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
  TPath extends AnyPath,
> = {
  allowedMimeTypes?: TallowedMimeTypes;
  fileSizeLimit: TFileSizeLimit;
  input: TInput;
  middleware: TMiddleware;
  path: TPath;
};

export type AnyDef = Def<
  AnyallowedMimeTypes,
  AnyFileSizeLimit,
  AnyInput,
  AnyMiddleware,
  AnyPath
>;

export type Builder<
  TDef extends AnyDef,
  TMiddlewareArgs extends AnyMiddlewareArgs,
> = {
  _def: TDef;
  allowedMimeTypes: <TallowedMimeTypes extends allowedMimeTypes>(
    params: TallowedMimeTypes,
  ) => Builder<
    {
      allowedMimeTypes: TallowedMimeTypes;
      fileSizeLimit: TDef["fileSizeLimit"];
      input: TDef["input"];
      middleware: TDef["middleware"];
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  fileSizeLimit: <TFileSizeLimit extends FileSizeLimit>(
    params: TFileSizeLimit,
  ) => Builder<
    {
      allowedMimeTypes: TDef["allowedMimeTypes"];
      fileSizeLimit: TFileSizeLimit;
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
      allowedMimeTypes: TDef["allowedMimeTypes"];
      fileSizeLimit: TDef["fileSizeLimit"];
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
      allowedMimeTypes: TDef["allowedMimeTypes"];
      fileSizeLimit: TDef["fileSizeLimit"];
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
      allowedMimeTypes: TDef["allowedMimeTypes"];
      fileSizeLimit: TDef["fileSizeLimit"];
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
    allowedMimeTypes: undefined,
    fileSizeLimit: Infinity,
    input: z.never().nullish(),
    middleware: () => ({}),
    path: () => undefined,
    ...initDef,
  };

  return {
    _def,
    allowedMimeTypes: (allowedMimeTypes) => {
      return builder({ ..._def, allowedMimeTypes }) as any;
    },
    fileSizeLimit: (fileSizeLimit) => {
      return builder({ ..._def, fileSizeLimit }) as any;
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
