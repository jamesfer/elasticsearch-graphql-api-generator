import { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { Dataset, ServerConfig } from '../server-config';
import { makeElasticsearchMappings } from './make-elasticsearch-mappings';

function makeConfig(testDataset: Dataset): ServerConfig {
  return {
    database: {
      url: 'http://localhost',
    },
    datasets: { test: testDataset },
  };
}

  describe('makeElasticsearchMappings', () => {
  it.each<[schema.DefinedType, MappingProperty]>([
    ['string', { type: 'text', fields: { keyword: { type: 'keyword' } } }],
    ['float', { type: 'float' }],
    ['int', { type: 'integer' }],
    ['boolean', { type: 'boolean' }],
  ])('generates mappings for %s', (avroType, expectedMapping) => {
    const generatedMappings = makeElasticsearchMappings(makeConfig({
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
    }));
    expect(generatedMappings).toEqual({
      test: {
        properties: {
          test: expectedMapping,
        },
      },
    });
  });

  it('ignores unindexable fields', () => {
    const generatedMappings = makeElasticsearchMappings(makeConfig({
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
    }));
    expect(generatedMappings).toEqual({ test: { properties: {} } });
  });

  it('generates complex nested mappings', () => {
    const generatedMappings = makeElasticsearchMappings(makeConfig({
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
    }));
    expect(generatedMappings).toEqual<{ [k: string]: MappingTypeMapping }>({
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
