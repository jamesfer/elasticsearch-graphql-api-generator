import { Property, QueryContainer, SortCombinations } from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { pipe } from 'fp-ts/function';
import { chain, fromNullable, getOrElse } from 'fp-ts/Option';
import {
  GraphQLFieldConfig,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLObjectType,
} from 'graphql/type/definition';
import { generateRecordMappings } from '../elasticsearch/mapping-utils';
import {
  createMapFromFields,
  getHandlerField,
  getHandlerFilter,
  getHandlerFilterArg,
  getHandlerOrderArg, getHandlerSort,
} from '../graphql/graphql-handler-utils';
import { Handler } from './handler-types';

interface RecordFilterParameters {
  [k: string]: any | undefined | null;
}

interface RecordOrderParameters {
  [k: string]: any | undefined | null;
}

export const recordHandler: Handler<schema.RecordType, RecordFilterParameters, RecordOrderParameters> = {
  select: (type: schema.DefinedType): type is schema.RecordType => (
    typeof type !== 'string' && type.type === 'record'
  ),
  toGraphQLField(record, path): GraphQLFieldConfig<unknown, unknown> {
    return {
      type: new GraphQLObjectType({
        name: `${record.name}Field`,
        fields: createMapFromFields(record.fields, path, getHandlerField),
      }),
    };
  },
  toGraphQLFieldFilterArg(record, path): GraphQLInputFieldConfig {
    return {
      type: new GraphQLInputObjectType({
        name: `${record.name}Filter`,
        fields: createMapFromFields(record.fields, path, getHandlerFilterArg),
      }),
    };
  },
  toGraphQLFieldOrderArg(record, path): GraphQLInputFieldConfig {
    return {
      type: new GraphQLInputObjectType({
        name: `${record.name}Order`,
        fields: createMapFromFields(record.fields, path, getHandlerOrderArg),
      }),
    };
  },
  toElasticsearchMapping(record, path): Property {
    return {
      type: 'object',
      properties: generateRecordMappings(record, path),
    };
  },
  toElasticsearchFilter(record, path, parameters): QueryContainer[] {
    return record.fields.flatMap(field => pipe(
      fromNullable(parameters[field.name]),
      chain(getHandlerFilter(field.type as schema.DefinedType, [...path, field.name])),
      getOrElse<QueryContainer[]>(() => []),
    ));
  },
  toElasticsearchSort(record, path, parameters): SortCombinations[] {
    return record.fields.flatMap(field => pipe(
      fromNullable(parameters[field.name]),
      chain(getHandlerSort(field.type as schema.DefinedType, [...path, field.name])),
      getOrElse<SortCombinations[]>(() => []),
    ));
  },
};
