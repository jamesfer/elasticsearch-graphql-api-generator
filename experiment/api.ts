import { pipe } from 'fp-ts/function';
import { GraphQLSchema, GraphQLString } from 'graphql';
import { GraphQLFieldConfig, GraphQLObjectType } from 'graphql/type/definition';
import { marketInsightsDataSource, MarketInsightsInputs } from './api/market-insights';
import { propertyDataSource } from './api/property';
import { addArguments } from './utils/add-arguments';

const rootPropertyField = pipe(
  propertyDataSource,
  addArguments<{ propertyId: string }>({
    propertyId: { type: GraphQLString }
  }),
);

const rootMarketInsightsField = pipe(
  marketInsightsDataSource,
  addArguments<MarketInsightsInputs>({
    suburb: { type: GraphQLString },
    postcode: { type: GraphQLString },
    state: { type: GraphQLString },
  }),
);

const fields: { [k: string]: GraphQLFieldConfig<{}, {}, any> } = {
  marketInsights: rootMarketInsightsField,
  property: rootPropertyField,
};

const query = new GraphQLObjectType<{}, {}>({ fields, name: 'Query' });
export const schema = new GraphQLSchema({ query });


/*
query {
  byPropertyDetailId(propertyDetailId: String) { // Call dynamodb mapping table to get another id
    propertyAttributes { // Call ES by propertyId to get bed, bath etc
      bedrooms
      bathrooms
      marketInsights { // Call MIAPI based on the suburb, state and postcode from Elasticsearch
        medianSalePrice
      }
    }
  }
}


Input (propertyDetailId) -> Call dynamodb (propertyId) -> call ES (bed, bath, suburb, state, postcode) -> call MIAPI (medianSalePrice)
*/

// Spike
// How much extra latency does the lambda and extra GraphQL resolvers add?
// Record overall lambda latency, latency of individual sources.
