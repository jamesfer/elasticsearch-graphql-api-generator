import express, { Express } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { ServerConfig } from '../server-config';
import { makeElasticsearchResolver } from './elasticsearch/make-elasticsearch-resolver';
import { performElasticsearchRequest } from './elasticsearch/perform-elasticsearch-request';
import { generateGraphQLRoot } from './graphql/generate-graphql-root';

export function createServer(serverConfig: ServerConfig): Express {
  const schema = generateGraphQLRoot(
    serverConfig.datasets,
    makeElasticsearchResolver(performElasticsearchRequest(serverConfig.database))
  );

  return express()
    .post('/', graphqlHTTP({ schema, graphiql: false }))
    .get('/', graphqlHTTP({ schema, graphiql: true }));
}
