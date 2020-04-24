// Definitions by: Jannik <https://github.com/jannikkeye>
//                 Leo <https://github.com/leomelzer>
/// <reference types="node" />

import { FastifyPlugin, FastifyReply, RawServerBase } from 'fastify'

declare module "fastify" {
  interface FastifyReplyInterface {
    sendFile(filename: string, rootPath?: string): FastifyReply;
  }
}

export interface FastifyStaticOptions {
  root: string;
  prefix?: string;
  prefixAvoidTrailingSlash?: boolean;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: (...args: any[]) => void;
  redirect?: boolean;
  wildcard?: boolean | string;

  // Passed on to `send`
  acceptRanges?: boolean;
  cacheControl?: boolean;
  dotfiles?: boolean;
  etag?: boolean;
  extensions?: string[];
  immutable?: boolean;
  index?: string[];
  lastModified?: boolean;
  maxAge?: string | number;
}

declare const fastifyStatic: FastifyPlugin<FastifyStaticOptions>

export default fastifyStatic;
