import { schema } from 'avsc';
import { compact } from 'fp-ts/Array';
import { InputObjectTypeDefinitionNode } from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import { inputFieldDefinition, nameNode } from '../../graphql-ast-helpers';
import { Dataset } from '../../server-config';
import { includeSelf, mapWithIncludes, sequenceWithIncludes } from '../../with-includes';
import { WithDefinitions } from '../handlers/handler-types';
import { generateOrderArgumentField } from './utils/order-utils';

function generateQueryFieldOrderArgumentType(dataset: Dataset): WithDefinitions<InputObjectTypeDefinitionNode> {
  const fields = sequenceWithIncludes(compact(dataset.baseAvroSchema.fields.map(field => (
    generateOrderArgumentField(field.name, field.type as schema.DefinedType)
  ))));
  // const computedFields = sequenceWithIncludes(compact(map(dataset.customFields, (field, name) => generateQueryFieldOrderArgumentComputedField(dataset.baseAvroSchema.name, name, field))))
  // return flatMapWithIncludes(fields, fields => (
  //   mapWithIncludes(computedFields, computedFields => ({
  //     kind: 'InputObjectTypeDefinition',
  //     name: nameNode(`${dataset.baseAvroSchema.name}Order`),
  //     fields: [...fields, ...computedFields],
  //   }))
  // ));
  return mapWithIncludes(fields, fields => ({
    kind: 'InputObjectTypeDefinition',
    name: nameNode(`${dataset.baseAvroSchema.name}Order`),
    fields,
  }));
}

export function generateQueryFieldOrder(dataset: Dataset): WithDefinitions<InputValueDefinitionNode> {
  return mapWithIncludes(includeSelf(generateQueryFieldOrderArgumentType(dataset)), orderArgumentType => (
    inputFieldDefinition('order', orderArgumentType.name.value)
  ));
}
