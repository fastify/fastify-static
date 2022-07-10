// Definitions by: Jannik <https://github.com/jannikkeye>
//                 Leo <https://github.com/leomelzer>
/// <reference types="node" />

import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import { Stats } from 'fs';

declare module "fastify" {
  interface FastifyReply {
    sendFile(filename: string, rootPath?: string): FastifyReply;
    sendFile(filename: string, options?: SendOptions): FastifyReply;
    sendFile(filename: string, rootPath?: string, options?: SendOptions): FastifyReply;
    download(filepath: string, options?: SendOptions): FastifyReply;
    download(filepath: string, filename?: string): FastifyReply;
    download(filepath: string, filename?: string, options?: SendOptions): FastifyReply;
  }
}

interface ExtendedInformation {
  fileCount: number;
  totalFileCount: number;
  folderCount: number;
  totalFolderCount: number;
  totalSize: number;
  lastModified: number;
}

interface ListDir {
  href: string;
  name: string;
  stats: Stats;
  extendedInfo?: ExtendedInformation;
}

interface ListFile {
  href: string;
  name: string;
  stats: Stats;
}

interface ListRender {
  (dirs: ListDir[], files: ListFile[]): string;
}

interface ListOptions {
  names?: string[];
  extendedFolderInfo?: boolean;
  jsonFormat?: 'names' | 'extended';
}

interface ListOptionsJsonFormat extends ListOptions {
  format: 'json';
  // Required when the URL parameter `format=html` exists
  render?: ListRender;
}

interface ListOptionsHtmlFormat extends ListOptions {
  format: 'html';
  render: ListRender;
}

// Passed on to `send`
interface SendOptions {
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[] | string | false;
  lastModified?: boolean;
  maxAge?: string | number;
}

export interface FastifyStaticOptions extends SendOptions {
  root: string | string[];
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (...args: any[]) => void;
  redirect?: boolean;
  wildcard?: boolean;
  list?: boolean | ListOptionsJsonFormat | ListOptionsHtmlFormat;
  allowedPath?: (pathName: string, root?: string, request: FastifyRequest) => boolean;
  /**
   * @description
   * Opt-in to looking for pre-compressed files
   */
  preCompressed?: boolean;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[] | string | false;
  lastModified?: boolean;
  maxAge?: string | number;
}

export declare const fastifyStatic: FastifyPluginCallback<FastifyStaticOptions>

export default fastifyStatic;
