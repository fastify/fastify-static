import fastify = require("fastify");

import { Server, IncomingMessage, ServerResponse } from "http";

declare module "fastify" {
    interface FastifyReply<HttpResponse> {
        sendFile(filename: string): FastifyReply<HttpResponse>;
    }
}

declare function fastifyStatic(): void;

declare namespace fastifyStatic {
    interface FastifyStaticOptions {
        root: string;
        prefix?: string;
        serve?: boolean;
        decorateReply?: boolean;
        schemaHide?: boolean;
        setHeaders?: (...args: any[]) => void;

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
}

export = fastifyStatic;