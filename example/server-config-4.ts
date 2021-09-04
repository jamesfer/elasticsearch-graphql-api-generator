import { ServerConfig } from '../src/server-config';
import { Property } from './data';
import data from './data.json';

export const serverConfig: ServerConfig = {
  datasets: {
    properties: {
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
      computedFields: {
        fullAddress: {
          type: 'string',
          arguments: {},
          source: (object: Property): string => (
            `${object.streetNumber} ${object.streetName} ${object.streetType}, ${object.suburb} ${object.postcode}`
          ),
        },
        similarity: {
          type: 'float',
          arguments: {
            bedroomCount: 'int',
            bathroomCount: 'int',
            carSpacesCount: 'int',
          },
          source: (object: Property, args: { bedroomCount: number, bathroomCount: number, carSpacesCount: number }) => {
            return 3 * Math.abs(object.bedrooms - args.bedroomCount)
              + 2 * Math.abs(object.bathrooms - args.bathroomCount)
              + 1.5 * Math.abs(object.carSpaces - args.carSpacesCount);
          },
        },
      },
      source: { data },
    },
  },
}
