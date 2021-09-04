import {
  GraphQLArgument, GraphQLEnumType, GraphQLFloat,
  GraphQLInputField,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLList,
} from 'graphql/type/definition';
import { Dataset, ServerConfig } from '../../server-config';
import { generateGraphQLRoot } from './generate-graphql-root';

describe('generateGraphQLRoot', () => {
  const emptyResolver: GraphQLFieldResolver<unknown, unknown> = () => null;
  let dataset: Dataset = {
    source: { index: 'index' },
    computedFields: {},
    baseAvroSchema: {
      type: 'record',
      name: 'record',
      fields: [
        {
          name: 'name',
          type: 'string',
        },
      ],
    },
  };

  let makeResolver: jest.Mock<GraphQLFieldResolver<unknown, unknown>>;

  function generateRoot(datasets: { [k: string]: Dataset }) {
    return generateGraphQLRoot(datasets, makeResolver);
  }

  beforeEach(() => {
    makeResolver = jest.fn().mockReturnValue(emptyResolver);
  });

  describe('without custom fields', () => {
    let schema: GraphQLSchema;

    beforeEach(() => {
      schema = generateRoot({ a: dataset });
    });

    describe('the dataset field', () => {
      let datasetField: GraphQLField<any, any> | undefined;

      beforeEach(() => {
        datasetField = schema.getQueryType()?.getFields()?.a;
      });

      it('exists', () => {
        expect(datasetField).toBeDefined();
      });

      it('creates a field entry for each dataset field', () => {
        const type = datasetField?.type as GraphQLObjectType;
        expect(type).toBeInstanceOf(GraphQLObjectType);
        expect(type.getFields()).toEqual({
          name: expect.objectContaining({
            name: 'name',
            type: GraphQLString,
            args: [],
          }),
        });
      });

      describe('dataset filter argument', () => {
        let filterArg: GraphQLArgument | undefined;
        let filterType: GraphQLInputObjectType | undefined;

        beforeEach(() => {
          filterArg = datasetField?.args.find(arg => arg.name === 'filter');
          filterType = filterArg?.type as GraphQLInputObjectType | undefined;
        });

        it('exists', () => {
          expect(filterArg).toBeDefined();
        });

        it('is an object type', () => {
          expect(filterArg?.type).toBeInstanceOf(GraphQLInputObjectType);
        });

        it('contains the filter combinators', () => {
          expect(filterType?.getFields()).toEqual({
            cond: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'cond' }),
            and: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'and' }),
            or: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'or' }),
          });
        });

        describe('the cond filter property', () => {
          let cond: GraphQLInputField | undefined;
          let condType: GraphQLInputObjectType | undefined;

          beforeEach(() => {
            cond = filterType?.getFields()?.cond;
            condType = cond?.type as GraphQLInputObjectType | undefined;
          });

          it('is an object type', () => {
            expect(condType).toBeInstanceOf(GraphQLInputObjectType);
          });

          it('contains a field for each input field', () => {
            expect(condType?.getFields()).toEqual({
              name: expect.objectContaining<Partial<GraphQLInputField>>({
                name: 'name',
                type: expect.any(GraphQLInputObjectType),
              }),
            });
          });
        });

        describe.each(['and', 'or'])('the %s filter property', (fieldName) => {
          let field: GraphQLInputField | undefined;
          let fieldType: GraphQLList<GraphQLInputObjectType> | undefined;

          beforeEach(() => {
            field = filterType?.getFields()?.[fieldName];
            fieldType = field?.type as GraphQLList<GraphQLInputObjectType> | undefined;
          });

          it('is a list of an object type', () => {
            expect(fieldType).toBeInstanceOf(GraphQLList);
            expect(fieldType?.ofType).toBeInstanceOf(GraphQLInputObjectType);
          });

          it('contains a each of the combined filter fields', () => {
            expect(filterType?.getFields()).toEqual({
              cond: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'cond' }),
              and: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'and' }),
              or: expect.objectContaining<Partial<GraphQLInputField>>({ name: 'or' }),
            });
          });
        });
      });

      describe('dataset order argument', () => {
        let orderArg: GraphQLArgument | undefined;
        let orderType: GraphQLList<GraphQLInputObjectType> | undefined;
        let orderElementType: GraphQLInputObjectType | undefined;

        beforeEach(() => {
          orderArg = datasetField?.args.find(arg => arg.name === 'order');
          orderType = orderArg?.type as GraphQLList<GraphQLInputObjectType> | undefined;
          orderElementType = orderType?.ofType;
        });

        it('exists', () => {
          expect(orderArg).toBeDefined();
        });

        it('is a list of an object type', () => {
          expect(orderType).toBeInstanceOf(GraphQLList);
          expect(orderElementType).toBeInstanceOf(GraphQLInputObjectType);
        });

        it('contains an entry for each field', () => {
          expect(orderElementType?.getFields()).toEqual({
            name: expect.objectContaining({ type: expect.any(GraphQLEnumType) }),
          });
        });
      });

      describe('the resolver', () => {
        it('uses the resolver in the dataset field', () => {
          expect(datasetField?.resolve).toEqual(emptyResolver);
        });

        it('the resolver factory is called with the dataset', () => {
          expect(makeResolver).toHaveBeenCalledTimes(1);
          expect(makeResolver).toHaveBeenCalledWith(dataset, 'a');
        });
      });
    });
  });

  describe('with custom fields', () => {
    let schema: GraphQLSchema;
    let datasetField: GraphQLField<any, any> | undefined;

    describe('when the field can be selected', () => {
      const datasetWithCustomFields: Dataset = {
        ...dataset,
        computedFields: {
          x: {
            toGraphQLField: {
              type: GraphQLString,
            },
          },
        },
      };

      beforeEach(() => {
        schema = generateRoot({ a: datasetWithCustomFields });
        datasetField = schema.getQueryType()?.getFields()?.a;
      });

      it('includes the field in the GraphQL interface', () => {
        const datasetType: GraphQLObjectType | undefined = datasetField?.type as GraphQLObjectType | undefined;
        const computedField = datasetType?.getFields()?.x;
        expect(computedField?.type).toEqual(GraphQLString);
      });

      it('does not include the field in the filter arg', () => {
        const filterArg = datasetField?.args.find(arg => arg.name === 'filter');
        const filterType = filterArg?.type as GraphQLInputObjectType | undefined;
        const condType = filterType?.getFields()?.cond?.type as GraphQLInputObjectType | undefined;
        expect(Object.keys(condType?.getFields() || {})).toEqual(['name']);
      });

      it('does not include the field in the order arg', () => {
        const orderArg = datasetField?.args.find(arg => arg.name === 'order');
        const orderType = orderArg?.type as GraphQLList<GraphQLInputObjectType> | undefined;
        expect(Object.keys(orderType?.ofType?.getFields() || {})).toEqual(['name']);
      });
    });

    describe('when the field can be filtered', () => {
      const datasetWithCustomFields: Dataset = {
        ...dataset,
        computedFields: {
          x: {
            toGraphQLFieldFilterArg: {
              type: GraphQLFloat,
            },
          },
        },
      };

      beforeEach(() => {
        schema = generateRoot({ a: datasetWithCustomFields });
        datasetField = schema.getQueryType()?.getFields()?.a;
      });

      it('does not include the field in the GraphQL interface', () => {
        const datasetType: GraphQLObjectType | undefined = datasetField?.type as GraphQLObjectType | undefined;
        expect(Object.keys(datasetType?.getFields() || {})).toEqual(['name']);
      });

      it('includes the field in the filter arg', () => {
        const filterArg = datasetField?.args.find(arg => arg.name === 'filter');
        const filterType = filterArg?.type as GraphQLInputObjectType | undefined;
        const condType = filterType?.getFields()?.cond?.type as GraphQLInputObjectType | undefined;
        expect(condType?.getFields()?.x?.type).toEqual(GraphQLFloat);
      });

      it('does not include the field in the order arg', () => {
        const orderArg = datasetField?.args.find(arg => arg.name === 'order');
        const orderType = orderArg?.type as GraphQLList<GraphQLInputObjectType> | undefined;
        expect(Object.keys(orderType?.ofType?.getFields() || {})).toEqual(['name']);
      });
    });

    describe('when the field can be sorted', () => {
      const datasetWithCustomFields: Dataset = {
        ...dataset,
        computedFields: {
          x: {
            toGraphQLFieldOrderArg: {
              type: GraphQLFloat,
            },
          },
        },
      };

      beforeEach(() => {
        schema = generateRoot({ a: datasetWithCustomFields });
        datasetField = schema.getQueryType()?.getFields()?.a;
      });

      it('does not include the field in the GraphQL interface', () => {
        const datasetType: GraphQLObjectType | undefined = datasetField?.type as GraphQLObjectType | undefined;
        expect(Object.keys(datasetType?.getFields() || {})).toEqual(['name']);
      });

      it('does not include the field in the filter arg', () => {
        const filterArg = datasetField?.args.find(arg => arg.name === 'filter');
        const filterType = filterArg?.type as GraphQLInputObjectType | undefined;
        const condType = filterType?.getFields()?.cond?.type as GraphQLInputObjectType | undefined;
        expect(Object.keys(condType?.getFields() || {})).toEqual(['name']);
      });

      it('includes the field in the order arg', () => {
        const orderArg = datasetField?.args.find(arg => arg.name === 'order');
        const orderType = orderArg?.type as GraphQLList<GraphQLInputObjectType> | undefined;
        expect(orderType?.ofType?.getFields()?.x?.type).toEqual(GraphQLFloat);
      });
    });
  });
});
