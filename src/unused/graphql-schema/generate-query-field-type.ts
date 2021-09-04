import { schema } from 'avsc';
import { compact } from 'fp-ts/Array';
import { ListTypeNode, ObjectTypeDefinitionNode } from 'graphql';
import { listType, nameNode } from '../../graphql-ast-helpers';
import { Dataset } from '../../server-config';
import { includeSelf, mapWithIncludes, sequenceWithIncludes } from '../../with-includes';
import { WithDefinitions } from '../handlers/handler-types';
import { generateField } from './utils/field-utils';

function generateObjectType(dataset: Dataset): WithDefinitions<ObjectTypeDefinitionNode> {
  const baseFields = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => (
    generateField(field.name, field.type as schema.DefinedType)
  ))));
  // const customFields = sequenceWithIncludes(compact(map(dataset.customFields, (field, name) => generateComputedField(name, field))));
  // return flatMapWithIncludes(baseFields, fields =>
  //   mapWithIncludes(customFields, customFields => ({
  //     kind: 'ObjectTypeDefinition',
  //     name: nameNode(dataset.baseAvroSchema.name),
  //     fields: [
  //       ...fields,
  //       ...customFields,
  //     ],
  //   }))
  // );
  return mapWithIncludes(baseFields, fields => ({
    kind: 'ObjectTypeDefinition',
    name: nameNode(dataset.baseAvroSchema.name),
    fields,
  }));
}

export function generateQueryFieldType(dataset: Dataset): WithDefinitions<ListTypeNode> {
  return mapWithIncludes(includeSelf(generateObjectType(dataset)), objectType => listType(objectType.name.value));
}
