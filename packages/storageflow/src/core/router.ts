import { z } from "zod";

export type AllowedMimeTypes = string[];

export type AnyAllowedMimeTypes = AllowedMimeTypes;

export type FileSizeLimit = number;

export type AnyFileSizeLimit = FileSizeLimit;

export type Temporary = boolean;

export type AnyTemporary = Temporary;

export type AnyInput = z.ZodTypeAny | null;

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
  input: TInput extends z.ZodTypeAny ? z.infer<TInput> : never;
}) => any;

export type AnyMiddleware = Middleware<AnyMiddlewareArgs, AnyInput> | null;

export type Path<TInput extends AnyInput, TMiddleware extends AnyMiddleware> = (
  params: {
    input: TInput extends z.ZodTypeAny ? z.infer<TInput> : never;
  } & (TMiddleware extends null
    ? never
    : { context: Awaited<ReturnType<NonNullable<TMiddleware>>> }),
) => (string | number)[];

export type AnyPath = Path<AnyInput, AnyMiddleware> | null;

export type Def<
  TallowedMimeTypes extends AnyAllowedMimeTypes,
  TFileSizeLimit extends AnyFileSizeLimit,
  TTemporary extends AnyTemporary,
  TInput extends AnyInput,
  TMiddleware extends AnyMiddleware,
  TPath extends AnyPath,
> = {
  allowedMimeTypes?: TallowedMimeTypes;
  fileSizeLimit: TFileSizeLimit;
  temporary: TTemporary;
  input: TInput;
  middleware: TMiddleware;
  path: TPath;
};

export type AnyDef = Def<
  AnyAllowedMimeTypes,
  AnyFileSizeLimit,
  AnyTemporary,
  AnyInput,
  AnyMiddleware,
  AnyPath
>;

export type Builder<
  TDef extends AnyDef,
  TMiddlewareArgs extends AnyMiddlewareArgs,
> = {
  _def: TDef;
  allowedMimeTypes: <TallowedMimeTypes extends AllowedMimeTypes>(
    params: TallowedMimeTypes,
  ) => Builder<
    {
      allowedMimeTypes: TallowedMimeTypes;
      fileSizeLimit: TDef["fileSizeLimit"];
      temporary: TDef["temporary"];
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
      temporary: TDef["temporary"];
      input: TDef["input"];
      middleware: TDef["middleware"];
      path: TDef["path"];
    },
    TMiddlewareArgs
  >;
  temporary: () => Builder<
    {
      allowedMimeTypes: TDef["allowedMimeTypes"];
      fileSizeLimit: TDef["fileSizeLimit"];
      temporary: true;
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
      temporary: TDef["temporary"];
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
      temporary: TDef["temporary"];
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
      temporary: TDef["temporary"];
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
    temporary: false,
    input: null,
    middleware: null,
    path: null,
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
    temporary: () => {
      return builder({ ..._def, temporary: true }) as any;
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
