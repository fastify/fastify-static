// Definitions by: Jannik <https://github.com/jannikkeye>
//                 Leo <https://github.com/leomelzer>

import fastify = require("fastify");

import { Server, IncomingMessage, ServerResponse } from "http";

declare module "fastify" {
    interface FastifyReply<HttpResponse> {
        sendFile(filename: string): FastifyReply<HttpResponse>;
    }
}

declare const fastifyStatic: fastify.Plugin<Server, IncomingMessage, ServerResponse, {
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
}>;

export = fastifyStatic;
