import { QueryDslQueryContainer, SearchSortCombinations } from '@elastic/elasticsearch/api/types';
import { compact } from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { fromNullable, map } from 'fp-ts/Option';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
} from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import { term } from '../elasticsearch/query-dsl';
import {
  convertDirectionToElasticsearchSortOrder,
  OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler } from './handler-types';

export interface BooleanFilterParameters {
  equals?: boolean;
}

export type BooleanOrderParameters = OrderDirection;

export const booleanHandler: Handler<'boolean', BooleanFilterParameters, BooleanOrderParameters> = {
  select: (type): type is 'boolean' => type === 'boolean',
  toGraphQLField: { type: GraphQLBoolean },
  toGraphQLFieldFilterArg: {
    type: new GraphQLInputObjectType({
      name: 'BooleanFilter',
      fields: {
        equals: { type: GraphQLFloat },
      },
    }),
  },
  toGraphQLFieldOrderArg: {
    type: new GraphQLEnumType({
      name: 'BooleanOrder',
      values: orderDirectionGraphQLEnumValues,
    }),
  },
  toElasticsearchMapping: { type: 'boolean' },
  toElasticsearchFilter(_, path, parameters): QueryDslQueryContainer[] {
    const field = path.join('.');
    return compact([
      pipe(parameters.equals, fromNullable, map(term(field))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SearchSortCombinations[] {
    const field = path.join('.');
    return [{ [field]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
};
