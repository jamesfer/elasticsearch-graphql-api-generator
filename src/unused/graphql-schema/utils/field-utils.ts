import { schema } from 'avsc';
import { FieldDefinitionNode } from 'graphql';
import { Option, map } from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { fieldDefinition } from '../../../graphql-ast-helpers';
import { mapWithIncludes } from '../../../with-includes';
import { WithDefinitions } from '../../handlers/handler-types';
import { selectHandler } from '../../handlers/handler-utils';

export function generateField<T extends schema.DefinedType>(
  name: string,
  type: T,
): Option<WithDefinitions<FieldDefinitionNode>> {
  return pipe(
    selectHandler(type),
    map(handler => handler.toGraphQLType(type)),
    map(fieldType => mapWithIncludes(fieldType, type => fieldDefinition(name, type)))
  );
}
