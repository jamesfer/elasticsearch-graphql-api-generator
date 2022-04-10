import { pipe } from 'fp-ts/function';
import { GraphQLInt, GraphQLString } from 'graphql';
import {
  GraphQLFieldResolver,
  GraphQLObjectType,
} from 'graphql/type/definition';
import { DataSource } from '../core-types';
import { pickFromSource } from '../utils/pick-from-source';
import { MarketInsights, marketInsightsDataSource } from './market-insights';

export interface Property {
  propertyId: string;
  bedrooms: number;
  bathrooms: number;
  suburb: string;
  state: string;
  postcode: string;
  localMarketInsights: MarketInsights;
}

interface PropertyInputs {
  propertyId: string;
}

const propertyType = new GraphQLObjectType<Property, {}>({
  name: 'Property',
  fields: {
    propertyId: { type: GraphQLString },
    bedrooms: { type: GraphQLInt },
    marketInsights: pipe(
      marketInsightsDataSource,
      pickFromSource<Property, 'suburb' | 'state' | 'postcode'>(['suburb', 'state', 'postcode'])
    ),
  },
});

const propertyResolver: GraphQLFieldResolver<{}, PropertyInputs> = (
  source,
  args,
  context,
  info,
) => {
  // Fetch something from the source database
  // getPropertyWithId(context.propertyId)
};

export const propertyDataSource: DataSource<PropertyInputs> = {
  type: propertyType,
  resolve: propertyResolver,
};
