import { Property, QueryContainer, SortCombinations } from '@elastic/elasticsearch/api/types';
import { compact } from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { fromNullable, map } from 'fp-ts/Option';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  InputObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import { inputFieldDefinition, namedType, nameNode } from '../../graphql-ast-helpers';
import { withIncludes, withNoIncludes } from '../../with-includes';
import { range, term } from '../elasticsearch/query-dsl';
import {
  convertDirectionToElasticsearchSortOrder,
  OrderDirection,
  orderDirectionGraphQLEnumValues,
} from './common';
import { Handler, WithDefinitions } from './handler-types';

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
  toElasticsearchFilter(_, path, parameters): QueryContainer[] {
    const field = path.join('.');
    return compact([
      pipe(parameters.equals, fromNullable, map(term(field))),
    ]);
  },
  toElasticsearchSort(_, path, direction): SortCombinations[] {
    const field = path.join('.');
    return [{ [field]: convertDirectionToElasticsearchSortOrder(direction) }];
  },
};
