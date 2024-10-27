import {
  FastifyPluginCallback,
  FastifyPluginAsync,
  FastifyPlugin,
  ApplyDependencies,
  UnEncapsulatedPlugin,
  FastifyDependencies,
} from 'fastify'

export function createPlugin<
  TPlugin extends FastifyPluginCallback,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced>
export function createPlugin<
  TPlugin extends FastifyPluginAsync,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced>
export function createPlugin<
  TPlugin extends FastifyPlugin,
  TDependencies extends FastifyDependencies,
  TEnhanced extends ApplyDependencies<TPlugin, TDependencies> = ApplyDependencies<TPlugin, TDependencies>
> (plugin: TEnhanced, options?: { dependencies?: TDependencies }): UnEncapsulatedPlugin<TEnhanced> {
  return plugin as UnEncapsulatedPlugin<TEnhanced>
}
