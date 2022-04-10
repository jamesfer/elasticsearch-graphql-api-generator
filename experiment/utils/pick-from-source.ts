import { GraphQLFieldConfig } from 'graphql/type/definition';
import { pick } from 'lodash';
import { DataSource } from '../core-types';
import { extractFromSource } from './extract-from-source';

export const pickFromSource = <TSource extends object, K extends keyof TSource>(
  keys: K[],
) => <TContext>(
  dataSource: DataSource<TContext & Pick<TSource, K>, TSource>,
): DataSource<TContext, TSource> => {
  return extractFromSource<TContext, TSource, Pick<TSource, K>>(
    dataSource,
    source => pick(source, ...keys),
  );
}
