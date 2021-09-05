import { QueryDslQueryContainer, SearchSortCombinations } from '@elastic/elasticsearch/api/types';
import { compact } from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { fromNullable, map } from 'fp-ts/Option';
import { GraphQLEnumType, GraphQLFloat } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import { range } from '../elasticsearch/query-dsl';
import {
  convertDirectionToElasticsearchSortOrder, OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler } from './handler-types';

export interface FloatFilterParameters {
  greaterThan: number;
  greaterEqualTo: number;
  lessThan: number;
  lessEqualTo: number;
}

export type FloatOrderParameters = OrderDirection;

export const floatHandler: Handler<'float', FloatFilterParameters, FloatOrderParameters> = {
  select: (type): type is 'float' => type === 'float',
  toGraphQLField: { type: GraphQLFloat },
  toGraphQLFieldFilterArg: {
    type: new GraphQLInputObjectType({
      name: 'FloatFilter',
      fields: {
        greaterThan: { type: GraphQLFloat },
        greaterEqualTo: { type: GraphQLFloat },
        lessThan: { type: GraphQLFloat },
        lessEqualTo: { type: GraphQLFloat },
      },
    })
  },
  toGraphQLFieldOrderArg: {
    type: new GraphQLEnumType({
      name: 'FloatOrder',
      values: orderDirectionGraphQLEnumValues,
    }),
  },
  toElasticsearchMapping: { type: 'float' },
  toElasticsearchFilter(_, path, parameters): QueryDslQueryContainer[] {
    const field = path.join('.');
    return compact([
      pipe(parameters.greaterThan, fromNullable, map(gt => range(field)({ gt }))),
      pipe(parameters.greaterEqualTo, fromNullable, map(gte => range(field)({ gte }))),
      pipe(parameters.lessThan, fromNullable, map(lt => range(field)({ lt }))),
      pipe(parameters.lessEqualTo, fromNullable, map(lte => range(field)({ lte }))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SearchSortCombinations[] {
    const field = path.join('.');
    return [{ [field]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
}
