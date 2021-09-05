import { QueryDslQueryContainer, SearchSortCombinations } from '@elastic/elasticsearch/api/types';
import { pipe } from 'fp-ts/function';
import { compact } from 'fp-ts/array';
import { fromNullable, map } from 'fp-ts/Option';
import { GraphQLEnumType, GraphQLInt } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import {
  convertDirectionToElasticsearchSortOrder, OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler } from './handler-types';
import { range, term } from '../elasticsearch/query-dsl';

export interface IntFilterParameters {
  equals: number;
  greaterThan: number;
  greaterEqualTo: number;
  lessThan: number;
  lessEqualTo: number;
}

export type IntOrderParameters = OrderDirection;

export const intHandler: Handler<'int', IntFilterParameters, IntOrderParameters> = {
  select: (type): type is 'int' => type === 'int',
  toGraphQLField: { type: GraphQLInt },
  toGraphQLFieldFilterArg: {
    type: new GraphQLInputObjectType({
      name: 'IntFilter',
      fields: {
        equals: { type: GraphQLInt },
        greaterThan: { type: GraphQLInt },
        greaterEqualTo: { type: GraphQLInt },
        lessThan: { type: GraphQLInt },
        lessEqualTo: { type: GraphQLInt },
      },
    })
  },
  toGraphQLFieldOrderArg: {
    type: new GraphQLEnumType({
      name: 'IntOrder',
      values: orderDirectionGraphQLEnumValues,
    }),
  },
  toElasticsearchMapping: {
    type: 'integer',
    fields: {
      keyword: { type: 'keyword' },
    },
  },
  toElasticsearchFilter(_, path, parameters): QueryDslQueryContainer[] {
    const field = path.join('.');
    const keywordField = `${field}.keyword`;
    return compact([
      pipe(parameters.equals, fromNullable, map(term(keywordField))),
      pipe(parameters.greaterThan, fromNullable, map(gt => range(field)({ gt }))),
      pipe(parameters.greaterEqualTo, fromNullable, map(gte => range(field)({ gte }))),
      pipe(parameters.lessThan, fromNullable, map(lt => range(field)({ lt }))),
      pipe(parameters.lessEqualTo, fromNullable, map(lte => range(field)({ lte }))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SearchSortCombinations[] {
    const field = path.join('.');
    const keywordField = `${field}.keyword`;
    return [{ [keywordField]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
};
