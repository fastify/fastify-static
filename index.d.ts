import FastifyPlugin from 'fastify';

declare namespace fastifyStatic {
    const instance : { FastifyPlugin };
}

export = fastifyStatic.instance;