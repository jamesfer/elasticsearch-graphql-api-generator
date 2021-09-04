import { createServer } from '../src/server';
import { serverConfig } from './server-config-4';

createServer(serverConfig).listen(3000, () => {
  console.log('Server started');
});
