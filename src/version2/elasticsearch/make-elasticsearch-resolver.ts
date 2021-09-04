import {
  QueryContainer,
  SearchRequest, SearchResponse,
  SortCombinations,
} from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { compact, flatten, head } from 'fp-ts/array';
import { pipe, flow } from 'fp-ts/function';
import { findFirst, map as arrayMap } from 'fp-ts/lib/Array';
import { alt, chain, fromNullable, map, Option, toUndefined } from 'fp-ts/Option';
import { fromArray, NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { GraphQLFieldResolver } from 'graphql/type/definition';
import { Dataset } from '../../server-config';
import { selectHandler } from '../handlers/handler-utils';
import { DatasetArguments, FilterArg } from '../graphql/types';
import { getOrElse } from 'fp-ts/Option';
import { applyN, castFunction } from '../utils';
import { ComputedField } from '../handlers/handler-types';

function findRecordFieldType(recordSchema: schema.RecordType, key: string): Option<schema.DefinedType> {
  return pipe(
    recordSchema.fields,
    findFirst(field => field.name === key),
    map(field => field.type as schema.DefinedType),
  );
}

const getHandlerElasticsearchFilter = (
  path: string[],
  parameters: any,
) => <T extends schema.DefinedType>(
  type: T,
): Option<QueryContainer[]> => pipe(
  selectHandler(type, path),
  chain(handler => fromNullable(handler.toElasticsearchFilter)),
  chain(flow(castFunction, applyN(type, path, parameters), fromNullable)),
);

const getComputedFieldElasticsearchFilter = (
  path: string[],
  parameters: any,
) => (
  computedField: ComputedField,
): Option<QueryContainer[]> => pipe(
  fromNullable(computedField.toElasticsearchFilter),
  chain(flow(castFunction, applyN(path, parameters), fromNullable)),
);

const makeConditions = (
  dataset: Dataset,
  path: string[],
): ((conditions: { [k: string]: any }) => Option<QueryContainer[]>) => flow(
  Object.entries,
  arrayMap(([key, args]) => pipe(
    fromNullable(dataset.computedFields[key]),
    chain(getComputedFieldElasticsearchFilter([...path, key], args)),
    alt(() => pipe(
      findRecordFieldType(dataset.baseAvroSchema, key),
      chain(getHandlerElasticsearchFilter([...path, key], args)),
    )),
  )),
  compact,
  flatten,
  fromArray,
);

const makeAndConditions = (
  dataset: Dataset,
): ((filterArgs: FilterArg[]) => Option<QueryContainer[]>) => flow(
  arrayMap(makeFilter(dataset)),
  compact,
  fromArray,
);

const makeOrConditions = (
  dataset: Dataset
): ((filterArgs: FilterArg[]) => Option<QueryContainer[]>) => flow(
  arrayMap(makeFilter(dataset)),
  compact,
  fromArray,
  // Nest the queries in another level of filter so that they don't contribute to the score
  map(queries => [{ bool: { should: queries } }]),
);

const makeFilter = (dataset: Dataset) => (filterArgs: FilterArg): Option<QueryContainer> => {
  const conditions = pipe(fromNullable(filterArgs.cond), chain(makeConditions(dataset, [])));
  const andConditions = pipe(fromNullable(filterArgs.and), chain(makeAndConditions(dataset)));
  const orConditions = pipe(fromNullable(filterArgs.or), chain(makeOrConditions(dataset)));
  return pipe(
    [conditions, andConditions, orConditions],
    compact,
    flatten,
    fromArray,
    map(queries => ({ bool: { filter: queries } })),
  );
}

const getHandlerElasticsearchSort = (
  path: string[],
  parameters: any,
) => <T extends schema.DefinedType>(
  type: T,
): Option<SortCombinations[]> => pipe(
  selectHandler(type, path),
  chain(handler => fromNullable(handler.toElasticsearchSort)),
  chain(flow(castFunction, applyN(type, path, parameters), fromNullable))
);

const getComputedFieldElasticsearchSort = (
  path: string[],
  parameters: any,
) => (
  computedField: ComputedField,
): Option<SortCombinations[]> => pipe(
  fromNullable(computedField.toElasticsearchSort),
  chain(flow(castFunction, applyN(path, parameters), fromNullable)),
);

const makeIndividualSort = (
  dataset: Dataset,
  path: string[],
): ((order: { [k: string]: any }) => Option<SortCombinations[]>) => flow(
  Object.entries,
  head,
  chain(([key, parameters]) => pipe(
    fromNullable(dataset.computedFields[key]),
    chain(getComputedFieldElasticsearchSort([...path, key], parameters)),
    alt(() => pipe(
      findRecordFieldType(dataset.baseAvroSchema, key),
      chain(getHandlerElasticsearchSort([...path, key], parameters))
    )),
  )),
);

const makeSort = (
  dataset: Dataset,
): ((order: { [k: string]: any }[]) => Option<NonEmptyArray<SortCombinations>>) => flow(
  arrayMap(makeIndividualSort(dataset, [])),
  compact,
  flatten,
  fromArray,
);

function makeQueryBody(dataset: Dataset, args: DatasetArguments): NonNullable<SearchRequest['body']> {
  return {
    query: pipe(
      fromNullable(args.filter),
      chain(makeFilter(dataset)),
      getOrElse((): QueryContainer => ({ match_all: {} })),
    ),
    sort: pipe(
      fromNullable(args.order),
      chain(makeSort(dataset)),
      toUndefined,
    ),
  };
}

export const makeElasticsearchResolver = (
  performSearch: (dataset: Dataset, search: SearchRequest) => Promise<SearchResponse>,
) => (
  dataset: Dataset,
): GraphQLFieldResolver<unknown, unknown, DatasetArguments> => (
  async (source, args, context, info): Promise<any[]> => {
    const body = makeQueryBody(dataset, args);
    const response = await performSearch(dataset, { body });
    return response.hits.hits.map(hit => hit._source);
  }
);
