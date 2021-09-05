import { GraphQLString } from 'graphql';
import { Handler } from './handler-types';

export const bytesHandler: Handler<'bytes'> = {
  select: (type): type is 'bytes' => type === 'bytes',
  toGraphQLField: { type: GraphQLString },
};
