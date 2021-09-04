import { GraphQLString } from 'graphql';
import { constant } from 'lodash';
import { namedType } from '../../graphql-ast-helpers';
import { withNoIncludes } from '../../with-includes';
import { Handler } from './handler-types';

export const bytesHandler: Handler<'bytes'> = {
  select: (type): type is 'bytes' => type === 'bytes',
  toGraphQLField: { type: GraphQLString },
};
