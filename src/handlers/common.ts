import { SearchSortOrder } from '@elastic/elasticsearch/api/types';
import {
  GraphQLEnumValueConfig,
  GraphQLEnumValueConfigMap,
} from 'graphql/type/definition';
import { mapValues } from "lodash";

export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const orderDirectionGraphQLEnumValues: GraphQLEnumValueConfigMap =
  mapValues(OrderDirection, (value): GraphQLEnumValueConfig => ({ value }));

export function convertDirectionToElasticsearchSortOrder(direction: OrderDirection): SearchSortOrder {
  return direction === OrderDirection.ASC ? 'asc' : 'desc';
}
