import { QueryDslQueryContainer, SearchSortCombinations } from '@elastic/elasticsearch/api/types';
import { pipe } from 'fp-ts/function';
import { compact } from 'fp-ts/Array';
import { fromNullable, map } from 'fp-ts/Option';
import { GraphQLEnumType, GraphQLString } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import {
  convertDirectionToElasticsearchSortOrder,
  OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler } from './handler-types';
import { match, range, term, wildcard } from '../elasticsearch/query-dsl';

export interface StringFilterParameters {
  equals?: string;
  greaterThan?: string;
  greaterEqualTo?: string;
  lessThan?: string;
  lessEqualTo?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

export type StringOrderParameters = OrderDirection;

export const stringHandler: Handler<'string', StringFilterParameters, StringOrderParameters> = {
  select: (type): type is 'string' => type === 'string',
  toGraphQLField: { type: GraphQLString },
  toGraphQLFieldFilterArg: {
    type: new GraphQLInputObjectType({
      name: 'StringFieldFilters',
      fields: {
        equals: { type: GraphQLString },
        greaterThan: { type: GraphQLString },
        greaterEqualTo: { type: GraphQLString },
        lessThan: { type: GraphQLString },
        lessEqualTo: { type: GraphQLString },
        contains: { type: GraphQLString },
        startsWith: { type: GraphQLString },
        endsWith: { type: GraphQLString },
      },
    }),
  },
  toGraphQLFieldOrderArg: {
    type: new GraphQLEnumType({
      name: 'StringOrder',
      values: orderDirectionGraphQLEnumValues,
    }),
  },
  toElasticsearchMapping: {
    type: 'text',
    fields: {
      keyword: { type: 'keyword' },
    },
  },
  toElasticsearchFilter(_, path, parameters): QueryDslQueryContainer[] {
    const field = path.join('.');
    const keywordField = `${field}.keyword`;
    return compact([
      pipe(fromNullable(parameters.equals), map(term(keywordField))),
      pipe(fromNullable(parameters.greaterThan), map(gt => range(keywordField)({ gt }))),
      pipe(fromNullable(parameters.greaterEqualTo), map(gte => range(keywordField)({ gte }))),
      pipe(fromNullable(parameters.lessThan), map(lt => range(keywordField)({ lt }))),
      pipe(fromNullable(parameters.lessEqualTo), map(lte => range(keywordField)({ lte }))),
      pipe(fromNullable(parameters.contains), map(query => match(field)({ query }))),
      pipe(fromNullable(parameters.startsWith), map(value => wildcard(field)({ value: `${value}*` }))),
      pipe(fromNullable(parameters.endsWith), map(value => wildcard(field)({ value: `*${value}` }))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SearchSortCombinations[] {
    const field = path.join('.');
    const keywordField = `${field}.keyword`;
    return [{ [keywordField]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
};
