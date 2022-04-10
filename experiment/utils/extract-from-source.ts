import { GraphQLFieldConfig } from 'graphql/type/definition';
import { DataSource } from '../core-types';

export function extractFromSource<TContext, TSource, A>(
  dataSource: DataSource<TContext & A, TSource>,
  f: (source: TSource) => A,
): DataSource<TContext, TSource> {
  return {
    ...dataSource,
    resolve: (source, args, context, info) => dataSource.resolve(
      source,
      args,
      { ...context, ...f(source) },
      info,
    ),
  };
}
