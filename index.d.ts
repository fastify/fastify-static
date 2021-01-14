// Definitions by: Jannik <https://github.com/jannikkeye>
//                 Leo <https://github.com/leomelzer>
/// <reference types="node" />

import { FastifyPlugin, FastifyReply, RawServerBase } from 'fastify'

declare module "fastify" {
  interface FastifyReply {
    sendFile(filename: string, rootPath?: string): FastifyReply;
  }
}

interface ListDir {
  href: string;
  name: string;
}

interface ListFile {
  href: string;
  name: string;
}

interface ListRender {
  (dirs: ListDir[], files: ListFile[]): string;
}

interface ListOptions {
  format: 'json' | 'html';
  names: string[];
  render: ListRender;
}

export interface FastifyStaticOptions {
  root: string | string[];
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (...args: any[]) => void;
  redirect?: boolean;
  wildcard?: boolean | string;
  list?: boolean | ListOptions;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: 'allow' | 'deny' | 'ignore';
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[];
  lastModified?: boolean;
  maxAge?: string | number;
}

declare const fastifyStatic: FastifyPlugin<FastifyStaticOptions>

export default fastifyStatic;
