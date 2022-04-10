import { GraphQLArgumentConfig, GraphQLFieldConfigArgumentMap } from 'graphql/type/definition';
import { DataSource } from '../core-types';

export type FieldArgumentMap<TArgs> = {
  [K in keyof TArgs]: GraphQLArgumentConfig
}

export const addArguments = <TArgs>(
  args: FieldArgumentMap<TArgs>,
) => <TContext, TSource>(
  dataSource: DataSource<TContext & TArgs, TSource>,
): DataSource<TContext, TSource, TArgs> => {
  return {
    ...dataSource,
    args: { ...dataSource.args ?? {}, ...args },
    resolve: (source, args, context, info) => dataSource.resolve(
      source,
      args,
      { ...context, ...args },
      info,
    ),
  }
}
