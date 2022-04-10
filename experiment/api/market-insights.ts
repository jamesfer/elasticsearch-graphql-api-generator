import { GraphQLInt } from 'graphql';
import { GraphQLFieldResolver, GraphQLObjectType } from 'graphql/type/definition';
import fetch from 'node-fetch';
import { DataSource } from '../core-types';
import { encodeQueryString } from '../utils/encode-query-string';

export interface MarketInsightsInputs {
  suburb: string;
  postcode: string;
  state: string;
}

export interface MarketInsights {
  medianSuburbPrice: number;
}

const type = new GraphQLObjectType<MarketInsights, {}>({
  name: 'MarketInsights',
  description: 'Market insights are powered by MIAPI. Custodian #pt-market-insights-support',
  fields: {
    medianSuburbPrice: {
      type: GraphQLInt,
      description: 'Median sale price of all known property sales in this suburb in past month. Updated monthly',
    },
  },
});

const resolve: GraphQLFieldResolver<{}, MarketInsightsInputs> = async (
  source,
  args,
  context,
) => {
  // Fetch something from the source database or api using any library
  const query = encodeQueryString(context);
  const response = await fetch(`https://market-insights.realestate.com.au/v1/suburbMedian?${query}`);
  return response.json();
}

export const marketInsightsDataSource: DataSource<MarketInsightsInputs> = { type, resolve };
