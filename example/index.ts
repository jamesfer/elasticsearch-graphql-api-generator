import { createServer } from '../src/server';
import { serverConfig } from './server-config-4';

const port = 3000;

createServer(serverConfig).listen(port, () => {
  console.log(`Server started on port ${port}`);
});
