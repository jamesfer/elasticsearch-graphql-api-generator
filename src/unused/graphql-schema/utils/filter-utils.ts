import { schema } from 'avsc';
import { pipe } from 'fp-ts/function';
import { map, chain, fromNullable, Option } from 'fp-ts/Option';
import { InputObjectTypeDefinitionNode } from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import {
  inputFieldDefinition,
  listType,
  nameNode,
} from '../../../graphql-ast-helpers';
import { mapWithIncludes } from '../../../with-includes';
import { WithDefinitions } from '../../handlers/handler-types';
import { selectHandler } from '../../handlers/handler-utils';

// export function generateCombinationFilterType(valueFilterName: string): InputObjectTypeDefinitionNode {
//   const filterName = `${valueFilterName}Combinations`;
//   return {
//     kind: 'InputObjectTypeDefinition',
//     name: nameNode(filterName),
//     fields: [
//       inputFieldDefinition('cond', valueFilterName),
//       inputFieldDefinition('and', listType(filterName)),
//       inputFieldDefinition('or', listType(filterName)),
//     ],
//   };
// }

export function generateQueryFieldFilterField<T extends schema.DefinedType>(name: string, type: T): Option<WithDefinitions<InputValueDefinitionNode>> {
  return pipe(
    selectHandler(type),
    chain(handler => fromNullable(handler.toGraphQLFilter)),
    map(toGraphQLFilter => toGraphQLFilter(type)),
    map(filterType => mapWithIncludes(filterType, filter => inputFieldDefinition(name, filter))),
  );
}
