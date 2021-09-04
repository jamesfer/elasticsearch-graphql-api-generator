import {
  Property,
  QueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { DefinitionNode, GraphQLFieldConfig } from 'graphql';
import {
  GraphQLInputFieldConfig,
} from 'graphql/type/definition';
import { WithIncludes } from '../../with-includes';

export type WithDefinitions<T> = WithIncludes<T, DefinitionNode>

export type MaybeFunction<F extends Function> = F extends (...args: infer A) => infer R
  ? R | ((...args: A) => R)
  : never;

export type MaybeNullableFunction<F extends Function> = F extends (...args: (infer A)) => infer R
  ? MaybeFunction<(...args: A) => R | undefined | null>
  : never;

export interface Handler<T extends schema.DefinedType, F = {}, S = {}, A = {}> {
  /**
   * Checks if the given defined type should use this handler.
   */
  select(type: schema.DefinedType, path: string[]): type is T;

  /**
   * Returns graphql field to represent this value.
   */
  toGraphQLField?: MaybeNullableFunction<(field: T, path: string[]) => GraphQLFieldConfig<unknown, unknown>>;

  /**
   * Returns the graphql filter options available for this type.
   */
  toGraphQLFieldFilterArg?: MaybeNullableFunction<(field: T, path: string[]) => GraphQLInputFieldConfig>;

  /**
   * Returns the graphql order options available for this type.
   */
  toGraphQLFieldOrderArg?: MaybeNullableFunction<(field: T, path: string[]) => GraphQLInputFieldConfig>;

  /**
   * Returns the Elasticsearch mapping used to index this field.
   */
  toElasticsearchMapping?: MaybeNullableFunction<(field: T, path: string[]) => Property>;

  /**
   * Generates an Elasticsearch query fragment to add to the query based on the graphql
   * arguments provided in the query.
   */
  toElasticsearchFilter?: MaybeNullableFunction<(field: T, path: string[], parameters: F) => QueryContainer[]>;

  /**
   * Generates an Elasticsearch sort fragment to add to the query based on the graphql
   * arguments provided in the query.
   */
  toElasticsearchSort?: MaybeNullableFunction<(field: T, path: string[], parameters: S) => SortCombinations[]>;
}

export interface ComputedField<T = {}, A = {}, F = {}, S = {}> {
  /**
   * Returns the value of the field from the data returned from Elasticsearch.
   */
  // getValue: MaybeFunction<(path: string[], data: any) => any>;

  /**
   * Returns graphql field to represent this value.
   */
  toGraphQLField?: MaybeNullableFunction<(path: string[]) => GraphQLFieldConfig<T, unknown, A>>;

  /**
   * Returns the graphql filter options available for this type.
   */
  toGraphQLFieldFilterArg?: MaybeNullableFunction<(path: string[]) => GraphQLInputFieldConfig>;

  /**
   * Returns the graphql order options available for this type.
   */
  toGraphQLFieldOrderArg?: MaybeNullableFunction<(path: string[]) => GraphQLInputFieldConfig>;

  /**
   * Generates an Elasticsearch query fragment to add to the query based on the graphql
   * arguments provided in the query.
   */
  toElasticsearchFilter?: MaybeNullableFunction<(path: string[], parameters: F) => QueryContainer[]>;

  /**
   * Generates an Elasticsearch sort fragment to add to the query based on the graphql
   * arguments provided in the query.
   */
  toElasticsearchSort?: MaybeNullableFunction<(path: string[], parameters: S) => SortCombinations[]>;
}

