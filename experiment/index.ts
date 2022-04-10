import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './api';

const port = 3000;

express()
  .post('/', graphqlHTTP({ schema, graphiql: false }))
  .get('/', graphqlHTTP({ schema, graphiql: true }))
  .listen(port);
