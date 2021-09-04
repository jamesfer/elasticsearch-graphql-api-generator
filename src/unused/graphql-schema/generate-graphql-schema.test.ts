import { schema } from 'avsc';
import {
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import { find } from 'lodash';
import { generateGraphQLSchema } from './generate-graphql-schema';
import {
  fieldDefinition,
  inputFieldDefinition,
  listType,
  namedType,
  nameNode, nonNullType,
} from '../../graphql-ast-helpers';
import { ServerConfig } from '../../server-config';

describe('generateGraphQLSchema', () => {
  const personSchema: schema.RecordType = {
    type: 'record',
    name: 'Person',
    fields: [
      {
        name: 'name',
        type: 'string',
      },
    ],
  };
  const petSchema: schema.RecordType = {
    type: 'record',
    name: 'Pet',
    fields: [
      {
        name: 'age',
        type: 'int',
      },
      // {
      //   name: 'sex',
      //   type: {
      //     type: 'enum',
      //     name: 'Sex',
      //     symbols: ['M', 'F'],
      //   },
      // },
    ],
  };

  describe('without any custom fields', () => {
    const serverConfig: ServerConfig = {
      datasets: {
        people: {
          baseAvroSchema: personSchema,
          computedFields: {},
          source: { data: [] },
        },
        pets: {
          baseAvroSchema: petSchema,
          computedFields: {},
          source: { data: [] },
        },
      },
    };

    it('generates an entrypoint for each record', () => {
      const schema = generateGraphQLSchema(serverConfig);
      const expectedEntrypoint: ObjectTypeDefinitionNode = {
        kind: 'ObjectTypeDefinition',
        name: {
          kind: 'Name',
          value: 'Query',
        },
        fields: [
          {
            kind: 'FieldDefinition',
            name: nameNode('people'),
            type: listType(namedType('Person')),
            arguments: expect.any(Array),
          },
          {
            kind: 'FieldDefinition',
            name: nameNode('pets'),
            type: listType(namedType('Pet')),
            arguments: expect.any(Array),
          },
        ],
      };
      const actualQueryDefinition = schema.definitions.find(def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Query');
      expect(actualQueryDefinition).toEqual(expect.objectContaining(expectedEntrypoint))
    });

    it('generates a person interface type', () => {
      const expectedPersonType: ObjectTypeDefinitionNode = {
        kind: 'ObjectTypeDefinition',
        name: nameNode('Person'),
        fields: [
          fieldDefinition('name', 'String'),
        ],
      };

      const schema = generateGraphQLSchema(serverConfig);
      const actualPersonSchema = schema.definitions.find(def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Person');
      expect(actualPersonSchema).toEqual(expectedPersonType);
    });

    it('generates a pet object type', () => {
      const expectedPetType: ObjectTypeDefinitionNode = {
        kind: 'ObjectTypeDefinition',
        name: nameNode('Pet'),
        fields: [
          fieldDefinition('age', 'Int'),
        ],
      };

      const schema = generateGraphQLSchema(serverConfig);
      const actualPetSchema = schema.definitions.find(def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Pet');
      expect(actualPetSchema).toEqual(expectedPetType);
    });

    it('generates a person filter argument', () => {
      const expectedFilterArgument: InputValueDefinitionNode = {
        kind: 'InputValueDefinition',
        name: nameNode('filter'),
        type: namedType('PersonFilter'),
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualQueryDefinition = find(schema.definitions, { name: { value: 'Query' } }) as ObjectTypeDefinitionNode;
      const actualPersonField = find(actualQueryDefinition?.fields, { name: { value: 'people' } });
      expect(actualPersonField?.arguments?.[0]).toEqual(expectedFilterArgument);
    });

    it('generates a person filter type', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonFilter'),
        fields: [
          inputFieldDefinition('cond', 'PersonValueFilter'),
          inputFieldDefinition('and', listType('PersonFilter')),
          inputFieldDefinition('or', listType('PersonFilter')),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualFilter = find(schema.definitions, { name: { value: 'PersonFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
    });

    it('generates a person value filter type', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonValueFilter'),
        fields: [
          inputFieldDefinition('name', 'StringFilter'),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualFilter = find(schema.definitions, { name: { value: 'PersonValueFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
    });

    it('generates a string filter', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('StringFilter'),
        fields: [
          inputFieldDefinition('equals', 'String'),
          inputFieldDefinition('greaterThan', 'String'),
          inputFieldDefinition('greaterEqualTo', 'String'),
          inputFieldDefinition('lessThan', 'String'),
          inputFieldDefinition('lessEqualTo', 'String'),
          inputFieldDefinition('contains', 'String'),
          inputFieldDefinition('startsWith', 'String'),
          inputFieldDefinition('endsWith', 'String'),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualFilter = find(schema.definitions, { name: { value: 'StringFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
    });

    it('generates an integer filter', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('IntFilter'),
        fields: [
          inputFieldDefinition('equals', 'Int'),
          inputFieldDefinition('greaterThan', 'Int'),
          inputFieldDefinition('greaterEqualTo', 'Int'),
          inputFieldDefinition('lessThan', 'Int'),
          inputFieldDefinition('lessEqualTo', 'Int'),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualFilter = find(schema.definitions, { name: { value: 'IntFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
    });

    it('generates a person order argument', () => {
      const expectedOrderArgument: InputValueDefinitionNode = {
        kind: 'InputValueDefinition',
        name: nameNode('order'),
        type: namedType('PersonOrder'),
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualQueryDefinition = find(schema.definitions, { name: { value: 'Query' } }) as ObjectTypeDefinitionNode;
      const actualPersonField = find(actualQueryDefinition?.fields, { name: { value: 'people' } });
      expect(actualPersonField?.arguments?.[1]).toEqual(expectedOrderArgument);
    });

    it('generates a PersonOrder type', () => {
      const expectedOrderType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonOrder'),
        fields: [
          inputFieldDefinition('name', 'OrderDirection'),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualOrderType = find(schema.definitions, { name: { value: 'PersonOrder' } });
      expect(actualOrderType).toEqual(expectedOrderType);
    });

    it('generates an OrderDirection type', () => {
      const expectedOrderDirectionType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('OrderDirection'),
        fields: [
          inputFieldDefinition('dir', 'OrderDirectionValue', {
            kind: 'EnumValue',
            value: 'DESC',
          }),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualOrderDirectionType = find(schema.definitions, { name: { value: 'OrderDirection' } });
      expect(actualOrderDirectionType).toEqual(expectedOrderDirectionType);
    });

    it('generates an OrderDirectionValue type', () => {
      const expectedOrderDirectionValueType: EnumTypeDefinitionNode = {
        kind: 'EnumTypeDefinition',
        name: nameNode('OrderDirectionValue'),
        values: [
          {
            kind: 'EnumValueDefinition',
            name: nameNode('DESC'),
          },
          {
            kind: 'EnumValueDefinition',
            name: nameNode('ASC'),
          },
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualOrderDirectionType = find(schema.definitions, { name: { value: 'OrderDirectionValue' } });
      expect(actualOrderDirectionType).toEqual(expectedOrderDirectionValueType);
    });
  });

  describe('with custom fields without arguments', () => {
    const serverConfig: ServerConfig = {
      datasets: {
        people: {
          baseAvroSchema: personSchema,
          source: { data: [] },
          computedFields: {
            nameLength: {
              type: 'int',
              arguments: {},
              source: () => undefined,
            },
          },
        },
      },
    };
    const schema = generateGraphQLSchema(serverConfig);

    it('generates custom field schema', () => {
      const expectedPersonType: ObjectTypeDefinitionNode = {
        kind: 'ObjectTypeDefinition',
        name: nameNode('Person'),
        fields: [
          fieldDefinition('name', 'String'),
          fieldDefinition('nameLength', 'Int'),
        ],
      };

      const actualPersonSchema = schema.definitions.find(def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Person');
      expect(actualPersonSchema).toEqual(expectedPersonType);
    });

    it('generates a custom field filter', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonValueFilter'),
        fields: [
          inputFieldDefinition('name', 'StringFilter'),
          inputFieldDefinition('nameLength', 'IntFilter'),
        ],
      };
      const actualFilter = find(schema.definitions, { name: { value: 'PersonValueFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
    });

    it('generates a custom field order', () => {
      const expectedOrderType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonOrder'),
        fields: [
          inputFieldDefinition('name', 'OrderDirection'),
          inputFieldDefinition('nameLength', 'OrderDirection'),
        ],
      };
      const schema = generateGraphQLSchema(serverConfig);
      const actualOrderType = find(schema.definitions, { name: { value: 'PersonOrder' } });
      expect(actualOrderType).toEqual(expectedOrderType);
    });
  });

  describe('with custom fields with arguments', () => {
    const serverConfig: ServerConfig = {
      datasets: {
        people: {
          baseAvroSchema: personSchema,
          source: { data: [] },
          computedFields: {
            nameLength: {
              type: 'int',
              arguments: {
                handleUnicode: 'boolean',
              },
              source: () => undefined,
            },
          },
        },
      },
    };
    const schema = generateGraphQLSchema(serverConfig);

    it('generates custom field schema with arguments', () => {
      const expectedPersonType: ObjectTypeDefinitionNode = {
        kind: 'ObjectTypeDefinition',
        name: nameNode('Person'),
        fields: [
          fieldDefinition('name', 'String'),
          fieldDefinition('nameLength', 'Int', [
            inputFieldDefinition('handleUnicode', nonNullType('Boolean')),
          ]),
        ],
      };

      const actualPersonSchema = schema.definitions.find(def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Person');
      expect(actualPersonSchema).toEqual(expectedPersonType);
    });

    it('generates a custom field with arguments filter', () => {
      const expectedFilterType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonValueFilter'),
        fields: [
          inputFieldDefinition('name', 'StringFilter'),
          inputFieldDefinition('nameLength', 'PersonValueNameLengthFilter', ),
        ],
      };
      const expectedFilterFieldType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonValueNameLengthFilter'),
        fields: [
          inputFieldDefinition('arguments', 'PersonNameLengthArguments'),
          inputFieldDefinition('filter', 'IntFilter'),
        ],
      };
      const expectedFilterFieldArgumentsType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonNameLengthArguments'),
        fields: [
          inputFieldDefinition('handleUnicode', nonNullType('Boolean')),
        ],
      };

      const actualFilter = find(schema.definitions, { name: { value: 'PersonValueFilter' } });
      expect(actualFilter).toEqual(expectedFilterType);
      const actualFieldFilter = find(schema.definitions, { name: { value: 'PersonValueNameLengthFilter' } });
      expect(actualFieldFilter).toEqual(expectedFilterFieldType);
      const actualFieldArguments = find(schema.definitions, { name: { value: 'PersonNameLengthArguments' } });
      expect(actualFieldArguments).toEqual(expectedFilterFieldArgumentsType);
    });

    it('generates a custom field with arguments order', () => {
      const expectedOrderType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonOrder'),
        fields: [
          inputFieldDefinition('name', 'OrderDirection'),
          inputFieldDefinition('nameLength', 'PersonNameLengthOrder', ),
        ],
      };
      const expectedFilterFieldType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonNameLengthOrder'),
        fields: [
          inputFieldDefinition('arguments', 'PersonNameLengthArguments'),
          inputFieldDefinition('order', 'OrderDirection'),
        ],
      };
      const expectedFilterFieldArgumentsType: InputObjectTypeDefinitionNode = {
        kind: 'InputObjectTypeDefinition',
        name: nameNode('PersonNameLengthArguments'),
        fields: [
          inputFieldDefinition('handleUnicode', nonNullType('Boolean')),
        ],
      };

      const actualFilter = find(schema.definitions, { name: { value: 'PersonOrder' } });
      expect(actualFilter).toEqual(expectedOrderType);
      const actualFieldFilter = find(schema.definitions, { name: { value: 'PersonNameLengthOrder' } });
      expect(actualFieldFilter).toEqual(expectedFilterFieldType);
      const actualFieldArguments = find(schema.definitions, { name: { value: 'PersonNameLengthArguments' } });
      expect(actualFieldArguments).toEqual(expectedFilterFieldArgumentsType);
    });
  });
});
