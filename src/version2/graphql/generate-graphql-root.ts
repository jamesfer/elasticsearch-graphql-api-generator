import { pipe } from 'fp-ts/function';
import { compact as recordCompact } from 'fp-ts/Record';
import { fromPredicate, map, Option } from 'fp-ts/Option';
import { not } from 'fp-ts/Predicate';
import {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {
  GraphQLArgumentConfig,
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLList,
} from 'graphql/type/definition';
import { isEmpty, mapValues } from 'lodash';
import { Dataset } from '../../server-config';
import {
  createMapFromComputedFields,
  createMapFromFields, getComputedField, getComputedFilterArg, getComputedOrderArg,
  getHandlerField,
  getHandlerFilterArg,
  getHandlerOrderArg,
} from './graphql-handler-utils';
import { DatasetArguments } from './types';

function makeDatasetType(dataset: Dataset, name: string) {
  const builtInFields = createMapFromFields(dataset.baseAvroSchema.fields, [], getHandlerField);
  const computedFields = createMapFromComputedFields(dataset.computedFields, [], getComputedField);
  return new GraphQLObjectType({
    name,
    fields: {
      ...builtInFields,
      ...computedFields,
    },
  });
}

function makeDatasetCombinedFilterType(name: string, fieldsFilterType: GraphQLInputObjectType): GraphQLInputObjectType {
  const filterType: GraphQLInputObjectType = new GraphQLInputObjectType({
    name: `${name}CombinationsFilter`,
    fields: () => ({
      cond: { type: fieldsFilterType },
      and: { type: new GraphQLList(filterType) },
      or: { type: new GraphQLList(filterType) },
    }),
  });
  return filterType;
}

function makeDatasetFilterArg(dataset: Dataset, name: string): Option<GraphQLArgumentConfig> {
  return pipe(
    {
      ...createMapFromFields(dataset.baseAvroSchema.fields, [], getHandlerFilterArg),
      ...createMapFromComputedFields(dataset.computedFields, [], getComputedFilterArg),
    },
    fromPredicate(not(isEmpty)),
    map(fields => new GraphQLInputObjectType({ fields, name: `${name}Filter` })),
    map(baseType => ({
      name: 'filter',
      type: makeDatasetCombinedFilterType(name, baseType),
    })),
  );
}

function makeDatasetOrderArg(dataset: Dataset, name: string): Option<GraphQLArgumentConfig> {
  return pipe(
    {
      ...createMapFromFields(dataset.baseAvroSchema.fields, [], getHandlerOrderArg),
      ...createMapFromComputedFields(dataset.computedFields, [], getComputedOrderArg)
    },
    fromPredicate(not(isEmpty)),
    map(fields => new GraphQLInputObjectType({ fields, name: `${name}Order` })),
    map(baseType => ({
      name: 'order',
      type: new GraphQLList(baseType),
    })),
  );
}

function makeDatasetArgs(dataset: Dataset, name: string): GraphQLFieldConfigArgumentMap {
  return recordCompact({
    filter: makeDatasetFilterArg(dataset, name),
    order: makeDatasetOrderArg(dataset, name),
  });
}

const makeDatasetField = (
  makeResolver: (dataset: Dataset, name: string) => GraphQLFieldResolver<unknown, unknown, DatasetArguments>
) => (
  dataset: Dataset,
  name: string,
): GraphQLFieldConfig<unknown, unknown, {}> => {
  return {
    type: makeDatasetType(dataset, name),
    args: makeDatasetArgs(dataset, name),
    resolve: makeResolver(dataset, name),
  };
};

function makeQueryObjectType(
  datasets: { [k: string]: Dataset },
  makeResolver: (dataset: Dataset, name: string) => GraphQLFieldResolver<unknown, unknown, DatasetArguments>
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: 'Query',
    fields: mapValues(datasets, makeDatasetField(makeResolver)),
  });
}

export function generateGraphQLRoot(
  datasets: { [k: string]: Dataset },
  makeResolver: (dataset: Dataset, name: string) => GraphQLFieldResolver<unknown, unknown, DatasetArguments>
): GraphQLSchema {
  return new GraphQLSchema({ query: makeQueryObjectType(datasets, makeResolver) });
}
