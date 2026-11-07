// Lets the logic tests import TypeScript files the way the app does (without writing ".ts").
import { register } from 'node:module';

const hook = `
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && /^\\.{1,2}\\//.test(specifier)) return next(specifier + '.ts', context);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hook));
