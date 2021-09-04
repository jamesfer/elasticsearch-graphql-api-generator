import { schema } from 'avsc';
import { compact } from 'fp-ts/Array';
import { InputObjectTypeDefinitionNode } from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import { inputFieldDefinition, listType, namedType, nameNode } from '../../graphql-ast-helpers';
import { Dataset } from '../../server-config';
import { includeSelf, mapWithIncludes, sequenceWithIncludes } from '../../with-includes';
import { WithDefinitions } from '../handlers/handler-types';
import { generateQueryFieldFilterField } from './utils/filter-utils';

function generateQueryFieldValueFilterType(dataset: Dataset): WithDefinitions<InputObjectTypeDefinitionNode> {
  const fieldFilters = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => (
    generateQueryFieldFilterField(field.name, field.type as schema.DefinedType)
  ))));
  // const customFieldFilters = sequenceWithIncludes(compact(map(dataset.customFields, (field, name) => generateQueryFieldFilterCustomField(dataset.baseAvroSchema.name, name, field))));
  return mapWithIncludes(fieldFilters, fields => ({
    kind: 'InputObjectTypeDefinition',
    name: nameNode(`${dataset.baseAvroSchema.name}ValueFilter`),
    fields,
  }));
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

export function generateQueryFieldFilter(dataset: Dataset): WithDefinitions<InputValueDefinitionNode> {
  return mapWithIncludes(includeSelf(generateQueryFieldCombinationFilterType(dataset)), recordFilterType => ({
    kind: 'InputValueDefinition',
    name: nameNode('filter'),
    type: namedType(recordFilterType.name.value),
  }));
}
