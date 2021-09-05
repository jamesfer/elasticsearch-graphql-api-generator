import { Handler } from './handlers/handler-types';
import { booleanHandler } from './handlers/boolean-handler';
import { bytesHandler } from './handlers/bytes-handler';
import { floatHandler } from './handlers/float-handler';
import { intHandler } from './handlers/int-handler';
import { recordHandler } from './handlers/record-handler';
import { stringHandler } from './handlers/string-handler';

export const handlers: Handler<any, any, any, any>[] = [
  booleanHandler,
  bytesHandler,
  floatHandler,
  intHandler,
  recordHandler,
  stringHandler,
];
