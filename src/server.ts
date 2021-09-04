import express, { Express } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildASTSchema } from 'graphql';
import { generateGraphQLRoot } from './generate-graphql-root';
import { generateGraphQLSchema } from './generate-graphql-schema';
import { ServerConfig } from './server-config';

export function createServer(serverConfig: ServerConfig): Express {
  const app = express();
  app.use('/', graphqlHTTP({
    schema: buildASTSchema(generateGraphQLSchema(serverConfig)),
    rootValue: generateGraphQLRoot(serverConfig),
    graphiql: true,
  }));
  return app;
}
