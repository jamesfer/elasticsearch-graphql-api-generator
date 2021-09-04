import { createServer } from '../src/version2/server';
import { serverConfig } from './server-config-1';

const port = 3000;

createServer(serverConfig).listen(port, () => {
  console.log(`Server started on port ${port}`);
});
