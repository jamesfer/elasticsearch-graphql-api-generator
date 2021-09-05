import { MappingProperty } from '@elastic/elasticsearch/api/types';
import { schema } from 'avsc';
import { compact } from 'fp-ts/Array';
import { flow, pipe } from 'fp-ts/function';
import { chain, fromNullable, map, Option } from 'fp-ts/Option';
import { selectHandler } from '../handlers/handler-utils';
import { applyN, castFunction } from '../utils';

export function generateMapping<T extends schema.DefinedType>(
  name: string,
  type: T,
  path: string[],
): Option<MappingProperty> {
  return pipe(
    selectHandler(type, path),
    chain(handler => fromNullable(handler.toElasticsearchMapping)),
    chain(flow(castFunction, applyN(type, path), fromNullable)),
  );
}

export function generateRecordMappings(record: schema.RecordType, path: string[]): { [k: string]: MappingProperty } {
  const properties = record.fields.map(field => pipe(
    generateMapping(field.name, field.type as schema.DefinedType, [...path, field.name]),
    map(property => [field.name, property])
  ));
  return Object.fromEntries(compact(properties));
}
