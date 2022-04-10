import { encode } from 'querystring';

export function encodeQueryString<T extends {}>(object: T): string {
  return encode(object);
}
