import { QueryDslQueryContainer, SearchSortCombinations } from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { compact } from 'fp-ts/Array';
import { compact as recordCompact, mapWithIndex } from 'fp-ts/Record';
import { flow, pipe } from 'fp-ts/function';
import { chain, fromNullable, map, Option } from 'fp-ts/Option';
import { GraphQLFieldConfig } from 'graphql';
import { GraphQLInputFieldConfig } from 'graphql/type/definition';
import { ComputedField } from '../handlers/handler-types';
import { selectHandler } from '../handlers/handler-utils';
import { applyN, castFunction } from '../utils';

export function getHandlerField<T extends schema.DefinedType>(type: T, path: string[]): Option<GraphQLFieldConfig<unknown, unknown>> {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toGraphQLField)),
    chain(flow(castFunction, applyN(type, path), fromNullable)),
  );
}

export function getHandlerFilterArg<T extends schema.DefinedType>(type: T, path: string[]): Option<GraphQLInputFieldConfig> {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toGraphQLFieldFilterArg)),
    chain(flow(castFunction, applyN(type, path), fromNullable)),
  );
}

export function getHandlerOrderArg<T extends schema.DefinedType>(type: T, path: string[]): Option<GraphQLInputFieldConfig> {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toGraphQLFieldOrderArg)),
    chain(flow(castFunction, applyN(type, path), fromNullable)),
  );
}

export const getHandlerFilter = <T extends schema.DefinedType>(
  type: T,
  path: string[],
) => (
  parameters: any,
): Option<QueryDslQueryContainer[]> => {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toElasticsearchFilter)),
    chain(flow(castFunction, applyN(type, path, parameters), fromNullable)),
  );
}

export const getHandlerSort = <T extends schema.DefinedType>(
  type: T,
  path: string[],
) => (
  parameters: any,
): Option<SearchSortCombinations[]> => {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toElasticsearchSort)),
    chain(flow(castFunction, applyN(type, path, parameters), fromNullable)),
  );
}

export function getComputedField<T, A>(
  computedField: ComputedField<T, A, any, any>,
  path: string[],
): Option<GraphQLFieldConfig<T, unknown, A>> {
  return pipe(
    fromNullable(computedField.toGraphQLField),
    chain(flow(castFunction, applyN(path), fromNullable))
  );
}

export function getComputedFilterArg(
  computedField: ComputedField,
  path: string[],
): Option<GraphQLInputFieldConfig> {
  return pipe(
    fromNullable(computedField.toGraphQLFieldFilterArg),
    chain(flow(castFunction, applyN(path), fromNullable))
  );
}

export function getComputedOrderArg(
  computedField: ComputedField,
  path: string[],
): Option<GraphQLInputFieldConfig> {
  return pipe(
    fromNullable(computedField.toGraphQLFieldOrderArg),
    chain(flow(castFunction, applyN(path), fromNullable))
  );
}

export function createMapFromFields<B>(
  fields: schema.RecordType['fields'][0][],
  path: string[],
  f: (s: schema.DefinedType, path: string[]) => Option<B>,
): { [k: string]: B } {
  const entries = compact(fields.map(field => pipe(
    f(field.type as schema.DefinedType, [...path, field.name]),
    map(value => [field.name, value]),
  )));
  return Object.fromEntries(entries);
}

export function createMapFromComputedFields<B>(
  fields: { [k: string]: ComputedField<any, any, any> },
  path: string[],
  f: (field: ComputedField<any, any, any>, path: string[]) => Option<B>,
): { [k: string]: B } {
  return pipe(
    fields,
    mapWithIndex((name, field) => f(field, [...path, name])),
    recordCompact,
  );
}
