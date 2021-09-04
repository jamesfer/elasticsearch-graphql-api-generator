import { GraphQLString } from 'graphql';
import { ServerConfig } from '../src/server-config';
import { ComputedField } from '../src/version2/handlers/handler-types';
import { Property } from './data';

const fullAddress: ComputedField<Property> = {
  toGraphQLField: {
    type: GraphQLString,
    resolve: (data: Property): string => (
      `${data.streetNumber} ${data.streetName} ${data.streetType}, ${data.suburb} ${data.postcode}`
    ),
  },
};

export const serverConfig: ServerConfig = {
  database: {
    url: 'http://localhost:9200',
  },
  datasets: {
    properties: {
      source: { index: 'properties' },
      computedFields: { fullAddress },
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
}
