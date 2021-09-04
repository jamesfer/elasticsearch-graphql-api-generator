import { schema } from 'avsc';
import { pipe } from 'fp-ts/function';
import { chain, fromNullable, map, Option } from 'fp-ts/Option';
import { EnumTypeDefinitionNode, InputObjectTypeDefinitionNode, TypeNode } from 'graphql';
import { InputValueDefinitionNode } from 'graphql/language/ast';
import { inputFieldDefinition, nameNode } from '../../../graphql-ast-helpers';
import { includeSelf, mapWithIncludes, toNamedType, withIncludes } from '../../../with-includes';
import { WithDefinitions } from '../../handlers/handler-types';
import { selectHandler } from '../../handlers/handler-utils';

export function generateBasicOrderDirectionType(): WithDefinitions<TypeNode> {
  const name = 'OrderDirectionValue';
  const directionEnum: EnumTypeDefinitionNode = {
    kind: 'EnumTypeDefinition',
    name: nameNode(name),
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

  const dirField = withIncludes(
    { [name]: directionEnum },
    inputFieldDefinition('dir', directionEnum.name.value, {
      kind: 'EnumValue',
      value: 'DESC',
    }),
  );

  const orderType: WithDefinitions<InputObjectTypeDefinitionNode> = mapWithIncludes(dirField, dirField => ({
    kind: 'InputObjectTypeDefinition',
    name: nameNode('OrderDirection'),
    fields: [dirField],
  }));

  return mapWithIncludes(includeSelf(orderType), toNamedType);
}

export function generateOrderArgumentField<T extends schema.DefinedType>(
  key: string,
  type: T,
): Option<WithDefinitions<InputValueDefinitionNode>> {
  return pipe(
    selectHandler(type),
    chain(handler => fromNullable(handler.toGraphQLOrder)),
    map(toGraphQLOrder => toGraphQLOrder(type)),
    map(filterType => mapWithIncludes(filterType, filter => inputFieldDefinition(key, filter))),
  );
}
