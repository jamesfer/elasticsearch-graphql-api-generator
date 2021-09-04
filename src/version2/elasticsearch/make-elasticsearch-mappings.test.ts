import { Property, TypeMapping } from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { makeElasticsearchMappings } from './make-elasticsearch-mappings';

describe('makeElasticsearchMappings', () => {
  it.each<[schema.DefinedType, Property]>([
    ['string', { type: 'text', fields: { keyword: { type: 'keyword' } } }],
    ['float', { type: 'float' }],
    ['int', { type: 'integer' }],
    ['boolean', { type: 'boolean' }],
  ])('generates mappings for %s', (avroType, expectedMapping) => {
    const generatedMappings = makeElasticsearchMappings({
      datasets: {
        test: {
          baseAvroSchema: {
            type: 'record',
            name: 'test',
            fields: [{
              name: 'test',
              type: avroType,
            }],
          },
          computedFields: {},
          source: { index: 'index' },
        },
      },
    });
    expect(generatedMappings).toEqual({
      test: {
        properties: {
          test: expectedMapping,
        },
      },
    });
  });

  it('ignores unindexable fields', () => {
    const generatedMappings = makeElasticsearchMappings({
      datasets: {
        test: {
          baseAvroSchema: {
            type: 'record',
            name: 'test',
            fields: [{
              name: 'test',
              type: 'bytes',
            }],
          },
          computedFields: {},
          source: { index: 'index' },
        },
      },
    });
    expect(generatedMappings).toEqual({ test: { properties: {} } });
  });

  it('generates complex nested mappings', () => {
    const generatedMappings = makeElasticsearchMappings({
      datasets: {
        test: {
          baseAvroSchema: {
            type: 'record',
            name: 'test',
            fields: [{
              name: 'person',
              type: {
                type: 'record',
                name: 'Person',
                fields: [
                  { name: 'name', type: 'string' },
                  { name: 'age', type: 'int' },
                  {
                    name: 'address',
                    type: {
                      type: 'record',
                      name: 'Address',
                      fields: [
                        { name: 'street', type: 'string' },
                        { name: 'suburb', type: 'string' },
                      ],
                    },
                  },
                ],
              },
            }],
          },
          computedFields: {},
          source: { index: 'index' },
        },
      },
    });
    expect(generatedMappings).toEqual<{ [k: string]: TypeMapping }>({
      test: {
        properties: {
          person: {
            type: 'object',
            properties: {
              name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              age: { type: 'integer' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                  suburb: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                },
              },
            },
          },
        },
      },
    });
  });
});
