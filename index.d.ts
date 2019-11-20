// Definitions by: Jannik <https://github.com/jannikkeye>
//                 Leo <https://github.com/leomelzer>
/// <reference types="node" />
import fastify, { Plugin } from "fastify";
import { Server, IncomingMessage, ServerResponse } from "http";
import { Http2SecureServer, Http2Server, Http2ServerRequest, Http2ServerResponse } from "http2";

type HttpServer = Server | Http2Server | Http2SecureServer;
type HttpRequest = IncomingMessage | Http2ServerRequest;
type HttpResponse = ServerResponse | Http2ServerResponse;

declare module "fastify" {
  interface FastifyReply<HttpResponse> {
    sendFile(filename: string): FastifyReply<HttpResponse>;
  }
}

declare function fastifyStatic(): fastify.Plugin<
  Server,
  IncomingMessage,
  ServerResponse,
  {
    root: string;
    prefix?: string;
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
>;

declare namespace fastifyStatic {
  interface FastifyStaticOptions {}
}

export = fastifyStatic;
