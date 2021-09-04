import {
  DocumentNode,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { map } from 'lodash';
import {
  fieldDefinition,
  nameNode,
} from '../../graphql-ast-helpers';
import { Dataset, ServerConfig } from '../../server-config';
import {
  flatMapWithIncludes,
  inlineIncludes,
  mapWithIncludes,
  sequenceWithIncludes,
} from '../../with-includes';
import { WithDefinitions } from '../handlers/handler-types';
import { generateQueryFieldFilter } from './generate-query-field-filter';
import { generateQueryFieldOrder } from './generate-query-field-order';
import { generateQueryFieldType } from './generate-query-field-type';

function generateQueryFieldDefinition(dataset: Dataset, key: string): WithDefinitions<FieldDefinitionNode> {
  return flatMapWithIncludes(generateQueryFieldType(dataset), fieldType => (
    flatMapWithIncludes(generateQueryFieldFilter(dataset), filterArgument => (
      mapWithIncludes(generateQueryFieldOrder(dataset), orderArgument => (
        fieldDefinition(key, fieldType, [filterArgument, orderArgument])
      ))
    ))
  ));
}

function generateRootQueryDefinition(datasets: { [k: string]: Dataset }): WithDefinitions<ObjectTypeDefinitionNode> {
  const fieldDefinitions = sequenceWithIncludes(map(datasets, generateQueryFieldDefinition));
  return mapWithIncludes(fieldDefinitions, fields => ({
    fields,
    kind: 'ObjectTypeDefinition',
    name: nameNode('Query'),
  }));
}

export function generateGraphQLSchema(serverConfig: ServerConfig): DocumentNode {
  const definitions = inlineIncludes(generateRootQueryDefinition(serverConfig.datasets));
  return { kind: 'Document', definitions };
}
