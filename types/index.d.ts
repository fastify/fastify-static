import {
  AnyFastifyInstance,
  ApplyDecorators,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  RouteOptions,
  UnEncapsulatedPlugin
} from 'fastify'
import { Stats } from 'node:fs'

declare namespace fastifyStatic {
  export type FastifyStaticPluginDecorators = {
    reply: {
      sendFile(filename: string, rootPath?: string): FastifyReply;
      sendFile(filename: string, options?: fastifyStatic.SendOptions): FastifyReply;
      sendFile(filename: string, rootPath?: string, options?: fastifyStatic.SendOptions): FastifyReply;
      download(filepath: string, options?: fastifyStatic.SendOptions): FastifyReply;
      download(filepath: string, filename?: string): FastifyReply;
      download(filepath: string, filename?: string, options?: fastifyStatic.SendOptions): FastifyReply;
    }
  }

  export type FastifyStaticPlugin<TInstance extends AnyFastifyInstance = AnyFastifyInstance> = UnEncapsulatedPlugin<
    FastifyPluginAsync<
      NonNullable<fastifyStatic.FastifyStaticOptions>,
      TInstance,
      ApplyDecorators<TInstance, FastifyStaticPluginDecorators>
    >
  >

  export interface SetHeadersResponse {
    getHeader: FastifyReply['getHeader'];
    setHeader: FastifyReply['header'];
    readonly filename: string;
    statusCode: number;
  }

  export interface ExtendedInformation {
    fileCount: number;
    totalFileCount: number;
    folderCount: number;
    totalFolderCount: number;
    totalSize: number;
    lastModified: number;
  }

  export interface ListDir {
    href: string;
    name: string;
    stats: Stats;
    extendedInfo?: ExtendedInformation;
  }

  export interface ListFile {
    href: string;
    name: string;
    stats: Stats;
  }

  export interface ListRender {
    (dirs: ListDir[], files: ListFile[]): string;
  }

  export interface ListOptions {
    names?: string[];
    extendedFolderInfo?: boolean;
    jsonFormat?: 'names' | 'extended';
  }

  export interface ListOptionsJsonFormat extends ListOptions {
    format: 'json';
    render?: ListRender;
  }

  export interface ListOptionsHtmlFormat extends ListOptions {
    format: 'html';
    render: ListRender;
  }

  export interface SendOptions {
    acceptRanges?: boolean;
    contentType?: boolean;
    cacheControl?: boolean;
    dotfiles?: 'allow' | 'deny' | 'ignore';
    etag?: boolean;
    extensions?: string[];
    immutable?: boolean;
    index?: string[] | string | false;
    lastModified?: boolean;
    maxAge?: string | number;
    serveDotFiles?: boolean;
  }

  type Root = string | string[] | URL | URL[]

  type RootOptions = {
    serve: true;
    root: Root;
  } | {
    serve?: false;
    root?: Root;
  }

  export type FastifyStaticOptions =
    SendOptions
    & RootOptions
    & {
      prefix?: string;
      prefixAvoidTrailingSlash?: boolean;
      decorateReply?: boolean;
      schemaHide?: boolean;
      setHeaders?: (res: SetHeadersResponse, path: string, stat: Stats) => void;
      redirect?: boolean;
      wildcard?: boolean;
      globIgnore?: string[];
      list?: boolean | ListOptionsJsonFormat | ListOptionsHtmlFormat;
      allowedPath?: (pathName: string, root: string, request: FastifyRequest) => boolean;
      preCompressed?: boolean;
      acceptRanges?: boolean;
      contentType?: boolean;
      cacheControl?: boolean;
      dotfiles?: 'allow' | 'deny' | 'ignore';
      etag?: boolean;
      extensions?: string[];
      immutable?: boolean;
      index?: string[] | string | false;
      lastModified?: boolean;
      maxAge?: string | number;
      constraints?: RouteOptions['constraints'];
      logLevel?: RouteOptions['logLevel'];
    }

  export const fastifyStatic: FastifyStaticPlugin
  export { fastifyStatic as default }
}

declare function fastifyStatic (...params: Parameters<fastifyStatic.FastifyStaticPlugin>): ReturnType<fastifyStatic.FastifyStaticPlugin>

export = fastifyStatic
