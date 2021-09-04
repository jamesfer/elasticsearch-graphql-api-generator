import { Schema, schema } from 'avsc';
import {
  DefinitionNode,
  DocumentNode, EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  ListTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import { compact, isEmpty, map, upperFirst } from 'lodash';
import {
  fieldDefinition,
  inputFieldDefinition,
  listType,
  namedType,
  nameNode, nonNullType,
} from './graphql-ast-helpers';
import { ComputedField, Dataset, ServerConfig } from './server-config';
import {
  flatMapWithIncludes,
  includeSelf,
  mapWithIncludes,
  sequenceWithIncludes,
  WithIncludes,
  withNoIncludes,
} from './with-includes';

type WithDefinitions<T> = WithIncludes<T, DefinitionNode>

function generateFieldType(type: Schema): WithDefinitions<TypeNode> | null {
  if (typeof type === 'string') {
    switch (type) {
      case 'null':
        return null;
      case 'boolean':
        return withNoIncludes(namedType('Boolean'));
      case 'int':
        return withNoIncludes(namedType('Int'))
      case 'long':
        return null;
      case 'float':
        return withNoIncludes(namedType('Float'))
      case 'double':
        return null;
      case 'bytes':
      case 'string':
        return withNoIncludes(namedType('String'))
    }
  }

  // if (typeof type === 'object') {
  //   if (type.type === 'record' || type.type === 'error') {
  //     const fields = type.fields.map(field => generateField(field.name, ))
  //   }
  // }

  // Nothing else is implemented
  return null;
}

function generateField(name: string, type: Schema): WithDefinitions<FieldDefinitionNode> | null {
  const fieldType = generateFieldType(type);
  if (!fieldType) {
    return null;
  }

  return mapWithIncludes(fieldType, type => fieldDefinition(name, type));
}

function generateComputedField(name: string, field: ComputedField): WithDefinitions<FieldDefinitionNode> | null {
  const baseField = generateField(name, field.type);
  if (!baseField || isEmpty(field.arguments)) {
    return baseField;
  }

  return flatMapWithIncludes(baseField, baseField =>
    mapWithIncludes(generateInputFields(field), fieldArguments => ({
    ...baseField,
    arguments: fieldArguments,
  })));
}

function generateObjectType(dataset: Dataset): WithDefinitions<ObjectTypeDefinitionNode> {
  const baseFields = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => generateField(field.name, field.type))));
  const customFields = sequenceWithIncludes(compact(map(dataset.computedFields, (field, name) => generateComputedField(name, field))));
  return flatMapWithIncludes(baseFields, fields =>
    mapWithIncludes(customFields, customFields => ({
      kind: 'ObjectTypeDefinition',
      name: nameNode(dataset.baseAvroSchema.name),
      fields: [
        ...fields,
        ...customFields,
      ],
    }))
  );
}

function generateQueryFieldType(dataset: Dataset): WithDefinitions<ListTypeNode> {
  return mapWithIncludes(includeSelf(generateObjectType(dataset)), objectType => listType(objectType.name.value));
}

function generateBooleanFilterType(): WithDefinitions<InputObjectTypeDefinitionNode> {
  return withNoIncludes({
    kind: 'InputObjectTypeDefinition',
    name: nameNode('BooleanFilter'),
    fields: [inputFieldDefinition('equals', 'Boolean')],
  });
}

function generateIntFilterType(): WithDefinitions<InputObjectTypeDefinitionNode> {
  return withNoIncludes({
    kind: 'InputObjectTypeDefinition',
    name: nameNode('IntFilter'),
    fields: [
      inputFieldDefinition('equals', 'Int'),
      inputFieldDefinition('greaterThan', 'Int'),
      inputFieldDefinition('greaterEqualTo', 'Int'),
      inputFieldDefinition('lessThan', 'Int'),
      inputFieldDefinition('lessEqualTo', 'Int'),
    ],
  });
}

function generateFloatFilterType(): WithDefinitions<InputObjectTypeDefinitionNode> {
  return withNoIncludes({
    kind: 'InputObjectTypeDefinition',
    name: nameNode('FloatFilter'),
    fields: [
      inputFieldDefinition('greaterThan', 'Float'),
      inputFieldDefinition('greaterEqualTo', 'Float'),
      inputFieldDefinition('lessThan', 'Float'),
      inputFieldDefinition('lessEqualTo', 'Float'),
    ],
  });
}

function generateStringFilterType(): WithDefinitions<InputObjectTypeDefinitionNode> {
  return withNoIncludes({
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
  });
}

function generateQueryFieldFilterFieldType(type: Schema): WithDefinitions<InputObjectTypeDefinitionNode> | null {
  if (typeof type === 'string') {
    switch (type) {
      case 'null':
        return null;
      case 'boolean':
        return generateBooleanFilterType();
      case 'int':
        return generateIntFilterType();
      case 'long':
        return null;
      case 'float':
        return generateFloatFilterType();
      case 'double':
        return null;
      case 'bytes':
        return null;
      case 'string':
        return generateStringFilterType();
    }
  }

  // Nothing else implemented
  return null;
}

function generateQueryFieldFilterField(name: string, type: Schema): WithDefinitions<InputValueDefinitionNode> | null {
  const filterType = generateQueryFieldFilterFieldType(type);
  if (filterType === null) {
    return null;
  }

  return mapWithIncludes(includeSelf(filterType), filter => inputFieldDefinition(name, filter.name.value));
}

function generateInputField(name: string, type: schema.AvroSchema): WithDefinitions<InputValueDefinitionNode> | null {
  if (typeof type === 'string') {
    switch (type) {
      case 'null':
        return null;
      case 'boolean':
        return withNoIncludes(inputFieldDefinition(name, nonNullType('Boolean')));
      case 'int':
        return withNoIncludes(inputFieldDefinition(name, nonNullType('Int')));
      case 'long':
        return null;
      case 'float':
        return withNoIncludes(inputFieldDefinition(name, nonNullType('Float')));
      case 'double':
        return null;
      case 'bytes':
        return null;
      case 'string':
        return withNoIncludes(inputFieldDefinition(name, nonNullType('String')));
    }
  }

  // Nothing else implemented
  return null;
}

function generateInputFields(computedField: ComputedField): WithDefinitions<InputValueDefinitionNode[]> {
  return sequenceWithIncludes(compact(map(computedField.arguments, (type, argumentName) => generateInputField(argumentName, type))));
}

function generateQueryFieldFilterCustomField(datasetName: string, fieldName: string, computedField: ComputedField): WithDefinitions<InputValueDefinitionNode> | null {
  const baseFilter = generateQueryFieldFilterFieldType(computedField.type);
  if (!baseFilter) {
    return null;
  }

  if (isEmpty(computedField.arguments)) {
    return mapWithIncludes(includeSelf(baseFilter), filter => inputFieldDefinition(fieldName, filter.name.value));
  }

  const fields = generateInputFields(computedField);
  const argumentsObject: WithDefinitions<InputObjectTypeDefinitionNode> = mapWithIncludes(fields, fields => ({
    fields,
    kind: 'InputObjectTypeDefinition',
    name: nameNode(`${datasetName}${upperFirst(fieldName)}Arguments`),
  }));
  const computedFilterObject: WithDefinitions<InputObjectTypeDefinitionNode> = flatMapWithIncludes(includeSelf(argumentsObject), argumentsObject =>
    mapWithIncludes(includeSelf(baseFilter), baseFilter => ({
    kind: 'InputObjectTypeDefinition',
    name: nameNode(`${datasetName}Value${upperFirst(fieldName)}Filter`),
    fields: [
      inputFieldDefinition('arguments', namedType(argumentsObject.name.value)),
      inputFieldDefinition('filter', namedType(baseFilter.name.value)),
    ],
  })));
  return mapWithIncludes(includeSelf(computedFilterObject), computedFilterObject => (
    inputFieldDefinition(fieldName, computedFilterObject.name.value)
  ));
}

function generateQueryFieldValueFilterType(dataset: Dataset): WithDefinitions<InputObjectTypeDefinitionNode> {
  const fieldFilters = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => generateQueryFieldFilterField(field.name, field.type))));
  const customFieldFilters = sequenceWithIncludes(compact(map(dataset.computedFields, (field, name) => generateQueryFieldFilterCustomField(dataset.baseAvroSchema.name, name, field))));
  return flatMapWithIncludes(fieldFilters, fields => (
    mapWithIncludes(customFieldFilters, customFields => ({
      kind: 'InputObjectTypeDefinition',
      name: nameNode(`${dataset.baseAvroSchema.name}ValueFilter`),
      fields: [...fields, ...customFields],
    }))
  ));
}

function generateQueryFieldCombinationFilterType(dataset: Dataset): WithDefinitions<InputObjectTypeDefinitionNode> {
  return mapWithIncludes(includeSelf(generateQueryFieldValueFilterType(dataset)), (valueFilter) => {
    const valueFilterName = valueFilter.name.value;
    const filterName = `${dataset.baseAvroSchema.name}Filter`;
    return {
      kind: 'InputObjectTypeDefinition',
      name: nameNode(filterName),
      fields: [
        inputFieldDefinition('cond', valueFilterName),
        inputFieldDefinition('and', listType(filterName)),
        inputFieldDefinition('or', listType(filterName)),
      ],
    };
  });
}

function generateQueryFieldFilterArgument(dataset: Dataset): WithDefinitions<InputValueDefinitionNode> {
  return mapWithIncludes(includeSelf(generateQueryFieldCombinationFilterType(dataset)), recordFilterType => ({
    kind: 'InputValueDefinition',
    name: nameNode('filter'),
    type: namedType(recordFilterType.name.value),
  }));
}

function generateBasicOrderDirectionType(): WithDefinitions<InputObjectTypeDefinitionNode> {
  const directionEnum: EnumTypeDefinitionNode = {
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

  return mapWithIncludes(includeSelf(withNoIncludes(directionEnum)), directionEnum => ({
    kind: 'InputObjectTypeDefinition',
    name: nameNode('OrderDirection'),
    fields: [
      inputFieldDefinition('dir', directionEnum.name.value, {
        kind: 'EnumValue',
        value: 'DESC',
      }),
    ]
  }));
}

function generateQueryFieldOrderArgumentFieldType(schema: Schema): WithDefinitions<TypeNode> | null {
  if (typeof schema === 'string') {
    switch (schema) {
      case 'boolean':
      case 'int':
      case 'long':
      case 'float':
      case 'double':
      case 'string':
        return mapWithIncludes(includeSelf(generateBasicOrderDirectionType()), type => namedType(type.name.value));

      case 'bytes':
      case 'null':
        return null;
    }
  }

  // Nothing else is implemented
  return null;
}

function generateQueryFieldOrderArgumentField(key: string, schema: Schema): WithDefinitions<InputValueDefinitionNode> | null {
  const fieldType = generateQueryFieldOrderArgumentFieldType(schema);
  if (!fieldType) {
    return null;
  }

  return mapWithIncludes(fieldType, type => inputFieldDefinition(key, type));
}

function generateQueryFieldOrderArgumentComputedField(datasetName: string, fieldName: string, computedField: ComputedField): WithDefinitions<InputValueDefinitionNode> | null {
  const baseOrder = generateQueryFieldOrderArgumentFieldType(computedField.type);
  if (!baseOrder) {
    return null;
  }

  if (isEmpty(computedField.arguments)) {
    return mapWithIncludes(baseOrder, type => inputFieldDefinition(fieldName, type));
  }

  const fields = generateInputFields(computedField);
  const argumentsObject: WithDefinitions<InputObjectTypeDefinitionNode> = mapWithIncludes(fields, fields => ({
    fields,
    kind: 'InputObjectTypeDefinition',
    name: nameNode(`${datasetName}${upperFirst(fieldName)}Arguments`),
  }));
  const computedOrderObject: WithDefinitions<InputObjectTypeDefinitionNode> = flatMapWithIncludes(includeSelf(argumentsObject), argumentsObject =>
    mapWithIncludes(baseOrder, baseOrder => ({
      kind: 'InputObjectTypeDefinition',
      name: nameNode(`${datasetName}${upperFirst(fieldName)}Order`),
      fields: [
        inputFieldDefinition('arguments', namedType(argumentsObject.name.value)),
        inputFieldDefinition('order', baseOrder),
      ],
    })));
  return mapWithIncludes(includeSelf(computedOrderObject), computedOrderObject => (
    inputFieldDefinition(fieldName, computedOrderObject.name.value)
  ));
}

function generateQueryFieldOrderArgumentType(dataset: Dataset): WithDefinitions<InputObjectTypeDefinitionNode> {
  const fields = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => generateQueryFieldOrderArgumentField(field.name, field.type))));
  const computedFields = sequenceWithIncludes(compact(map(dataset.computedFields, (field, name) => generateQueryFieldOrderArgumentComputedField(dataset.baseAvroSchema.name, name, field))))
  return flatMapWithIncludes(fields, fields => (
    mapWithIncludes(computedFields, computedFields => ({
      kind: 'InputObjectTypeDefinition',
      name: nameNode(`${dataset.baseAvroSchema.name}Order`),
      fields: [...fields, ...computedFields],
    }))
  ));
}

function generateQueryFieldOrderArgument(dataset: Dataset): WithDefinitions<InputValueDefinitionNode> {
  return mapWithIncludes(includeSelf(generateQueryFieldOrderArgumentType(dataset)), orderArgumentType => (
    inputFieldDefinition('order', orderArgumentType.name.value)
  ));
}

function generateQueryField(key: string, dataset: Dataset): WithDefinitions<FieldDefinitionNode> {
  return flatMapWithIncludes(generateQueryFieldType(dataset), fieldType => (
    flatMapWithIncludes(generateQueryFieldFilterArgument(dataset), filterArgument => (
      mapWithIncludes(generateQueryFieldOrderArgument(dataset), orderArgument => (
        fieldDefinition(key, fieldType, [filterArgument, orderArgument])
      ))
    ))
  ));
}

function generateGraphQLQuery(datasets: { [k: string]: Dataset }): WithDefinitions<ObjectTypeDefinitionNode> {
  const fieldDefinitions = sequenceWithIncludes(map(datasets, (dataset, key) => (
    generateQueryField(key, dataset)
  )));
  return mapWithIncludes(fieldDefinitions, fields => ({
    fields,
    kind: 'ObjectTypeDefinition',
    name: nameNode('Query'),
  }));
}

function generateGraphQLDefinitions(datasets: { [k: string]: Dataset }): ReadonlyArray<DefinitionNode> {
  const wrappedEntrypoint = generateGraphQLQuery(datasets);
  return [
    ...Object.values(wrappedEntrypoint.includes),
    wrappedEntrypoint.value,
  ];
}

export function generateGraphQLSchema(serverConfig: ServerConfig): DocumentNode {
  return {
    kind: 'Document',
    definitions: generateGraphQLDefinitions(serverConfig.datasets),
  };
}
