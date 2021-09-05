import { schema } from 'avsc';
import { Handler } from './handler-types';
import { handlers } from '../handlers';
import { some, none, Option } from 'fp-ts/Option';

export function selectHandler<T extends schema.DefinedType>(type: T, path: string[]): Option<Handler<T, any>> {
  for (const handler of handlers) {
    if (handler.select(type, path)) {
      return some(handler);
    }
  }

  return none;
}
