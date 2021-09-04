import { Property, QueryContainer, SortCombinations } from '@elastic/elasticsearch/api/types';
import { compact } from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { fromNullable, map } from 'fp-ts/Option';
import { GraphQLEnumType, GraphQLFloat, InputObjectTypeDefinitionNode, TypeNode } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import { constant } from 'lodash';
import { inputFieldDefinition, namedType, nameNode } from '../../graphql-ast-helpers';
import { withIncludes, withNoIncludes } from '../../with-includes';
import { range } from '../elasticsearch/query-dsl';
import {
  convertDirectionToElasticsearchSortOrder, OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler, WithDefinitions } from './handler-types';

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
  toElasticsearchFilter(_, path, parameters): QueryContainer[] {
    const field = path.join('.');
    return compact([
      pipe(parameters.greaterThan, fromNullable, map(gt => range(field)({ gt }))),
      pipe(parameters.greaterEqualTo, fromNullable, map(gte => range(field)({ gte }))),
      pipe(parameters.lessThan, fromNullable, map(lt => range(field)({ lt }))),
      pipe(parameters.lessEqualTo, fromNullable, map(lte => range(field)({ lte }))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SortCombinations[] {
    const field = path.join('.');
    return [{ [field]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
}
