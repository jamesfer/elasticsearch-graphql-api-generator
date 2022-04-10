import { GraphQLFieldConfig } from 'graphql/type/definition';

export interface DataSource<TContext, TSource = {}, TArgs = {}> {
  type: GraphQLFieldConfig<TSource, TContext, TArgs>['type'];
  resolve: Exclude<GraphQLFieldConfig<TSource, TContext, TArgs>['resolve'], undefined>;
  args?: GraphQLFieldConfig<TSource, TContext, TArgs>['args'],
}
