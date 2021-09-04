import {
  FieldDefinitionNode,
  ListTypeNode,
  NamedTypeNode,
  NameNode, NonNullTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import { InputValueDefinitionNode, ValueNode } from 'graphql/language/ast';


export function nameNode(value: string): NameNode {
  return {
    value,
    kind: 'Name',
  };
}

export function namedType(name: string): NamedTypeNode {
  return {
    kind: 'NamedType',
    name: nameNode(name),
  };
}

export function castNamedType<T extends TypeNode>(type: T | string): T | NamedTypeNode {
  return typeof type === 'string' ? namedType(type) : type;
}

export function listType(type: TypeNode | string): ListTypeNode {
  return {
    kind: 'ListType',
    type: castNamedType(type),
  };
}

export function nonNullType(type: NamedTypeNode | ListTypeNode | string): NonNullTypeNode {
  return {
    kind: 'NonNullType',
    type: castNamedType(type),
  };
}

export function fieldDefinition(name: string, type: TypeNode | string, args: InputValueDefinitionNode[] = []): FieldDefinitionNode {
  return {
    kind: 'FieldDefinition',
    name: nameNode(name),
    type: castNamedType(type),
    arguments: args,
  };
}

export function inputFieldDefinition(name: string, type: TypeNode | string, defaultValue?: ValueNode): InputValueDefinitionNode {
  return {
    defaultValue,
    kind: 'InputValueDefinition',
    name: nameNode(name),
    type: castNamedType(type),
  };
}
