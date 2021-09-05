import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLString } from 'graphql';
import { GraphQLInputObjectType } from 'graphql/type/definition';
import { ComputedField } from '../src/handlers/handler-types';
import { ServerConfig } from '../src/server-config';
import { Property } from './generate-data';

const fullAddress: ComputedField<Property> = {
  toGraphQLField: {
    type: GraphQLString,
    resolve: (data: Property): string => (
      `${data.streetNumber} ${data.streetName} ${data.streetType}, ${data.suburb} ${data.postcode}`
    ),
  },
};

interface SimilarityFieldArgs {
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
}

const similarity: ComputedField<Property, SimilarityFieldArgs, SimilarityFieldArgs, SimilarityFieldArgs> = {
  // toGraphQLField: {
  //   type: GraphQLFloat,
  //   args: {
  //     bedrooms: { type: new GraphQLNonNull(GraphQLInt) },
  //     bathrooms: { type: new GraphQLNonNull(GraphQLInt) },
  //     carSpaces: { type: new GraphQLNonNull(GraphQLInt) },
  //   },
  //   resolve: (data, args) => (
  //     3 * Math.abs(data.bedrooms - args.bedrooms)
  //       + 2 * Math.abs(data.bathrooms - args.bathrooms)
  //       + 1.5 * Math.abs(data.carSpaces - args.carSpaces)
  //   ),
  // },
  toGraphQLFieldOrderArg: {
    type: new GraphQLInputObjectType({
      name: 'SimilarityOrder',
      fields: {
        bedrooms: { type: new GraphQLNonNull(GraphQLInt) },
        bathrooms: { type: new GraphQLNonNull(GraphQLInt) },
        carSpaces: { type: new GraphQLNonNull(GraphQLInt) },
      },
    }),
  },
  toElasticsearchSort: (path, params) => [{
    _script: {
      order: 'asc',
      type: 'number',
      script: {
        params,
        source: `
          return 3 * Math.abs(doc['bedrooms'].value - params.bedrooms)
            + 2 * Math.abs(doc['bathrooms'].value - params.bathrooms)
            + 1.5 * Math.abs(doc['carSpaces'].value - params.carSpaces)
        `,
      },
    }
  }]
};

export const serverConfig: ServerConfig = {
  database: {
    url: 'http://localhost:9200',
  },
  datasets: {
    properties: {
      source: { index: 'properties' },
      computedFields: { fullAddress, similarity },
      baseAvroSchema: {
        name: 'Property',
        type: 'record',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'streetNumber', type: 'string' },
          { name: 'streetName', type: 'string' },
          { name: 'streetType', type: 'string' },
          { name: 'suburb', type: 'string' },
          { name: 'postcode', type: 'string' },
          { name: 'yearBuilt', type: 'int' },
          { name: 'bedrooms', type: 'int' },
          { name: 'bathrooms', type: 'int' },
          { name: 'carSpaces', type: 'int' },
          { name: 'avmPrice', type: 'int' },
        ],
      },
    },
  },
};
