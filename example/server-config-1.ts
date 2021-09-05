import { ServerConfig } from '../src/server-config';

export const serverConfig: ServerConfig = {
  database: {
    url: 'http://localhost:9200',
  },
  datasets: {
    properties: {
      source: { index: 'properties' },
      computedFields: {},
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
        ],
      },
    },
  },
}
