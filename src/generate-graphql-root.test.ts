import { schema } from 'avsc';
import { buildASTSchema, execute, parse } from 'graphql';
import { mapValues } from 'lodash';
import { generateGraphQLRoot } from './generate-graphql-root';
import { generateGraphQLSchema } from './generate-graphql-schema';
import { ServerConfig } from './server-config';

describe('generateGraphQLRoot', () => {
  describe('without custom fields', () => {
    const schema: { [k: string]: schema.RecordType } = {
      people: {
        type: 'record',
        name: 'Person',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'age',
            type: 'int',
          },
          {
            name: 'active',
            type: 'boolean',
          },
        ],
      },
    };

    const data = [
      {
        name: 'Tim',
        age: 45,
        active: true,
      },
      {
        name: 'Juan',
        age: 12,
        active: false,
      },
      {
        name: 'Lin',
        age: 64,
        active: true,
      },
    ];

    const serverConfig: ServerConfig = {
      datasets: mapValues(schema, recordSchema => ({
        source: { data },
        baseAvroSchema: recordSchema,
        customFields: {},
      })),
    };

    const schemaAST = buildASTSchema(generateGraphQLSchema(serverConfig));

    it('returns all data', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people {
            name
            age
            active
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: data } });
    });

    it('should filter out results based on string equals condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { cond: { name: { equals: "Tim" } } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Tim' }] } });
    });

    it('should filter out results based on string greaterThan condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { cond: { name: { greaterThan: "Taa" } } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Tim' }] } });
    });

    it('should filter out results based on string greaterEqualTo condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { cond: { name: { greaterEqualTo: "Lin" } } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Tim' }, { name: 'Lin' }] } });
    });

    it('should filter out results based on string lessThan condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { cond: { name: { lessThan: "Jzz" } } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Juan' }] } });
    });

    it('should filter out results based on string lessEqualTo condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { cond: { name: { lessEqualTo: "Lin" } } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Juan' }, { name: 'Lin' }] } });
    });

    it('should filter out results based on an or condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { or: [{ cond: { name: { equals: "Lin" } } }, { cond: { name: { equals: "Juan" } } }] }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Juan' }, { name: 'Lin' }] } });
    });

    it('should filter out results based on an and condition', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(filter: { and: [{ cond: { age: { lessThan: 50 } } }, { cond: { active: { equals: true } } }] }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Tim' }] } });
    });

    it('should order results based on a string', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(order: { name: { dir: ASC } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Juan' }, { name: 'Lin' }, { name: 'Tim' }] } });
    });

    it('should order results based on a number', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
        query {
          people(order: { age: { dir: DESC } }) {
            name
          }
        }
      `),
      });
      expect(result).toEqual({ data: { people: [{ name: 'Lin' }, { name: 'Tim' }, { name: 'Juan' }] } });
    });
  });

  describe('with custom fields without arguments', () => {
    const schema: { [k: string]: schema.RecordType } = {
      people: {
        type: 'record',
        name: 'Person',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'age',
            type: 'int',
          },
          {
            name: 'active',
            type: 'boolean',
          },
        ],
      },
    };

    const data = [
      {
        name: 'Tim',
        age: 45,
        active: true,
      },
      {
        name: 'Juan',
        age: 12,
        active: false,
      },
      {
        name: 'Lin',
        age: 64,
        active: true,
      },
    ];

    const serverConfig: ServerConfig = {
      datasets: mapValues(schema, recordSchema => ({
        source: { data },
        baseAvroSchema: recordSchema,
        customFields: {
          ageSquared: {
            type: 'int',
            arguments: {},
            source: (object: { age: number }) => object.age ** 2,
          },
        },
      })),
    };

    const schemaAST = buildASTSchema(generateGraphQLSchema(serverConfig));

    it('selects custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people {
              ageSquared
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ ageSquared: 2025 }, { ageSquared: 144 }, { ageSquared: 4096 }] } });
    });

    it('filters by custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people(filter: { cond: { ageSquared: { lessThan: 2000 } } }) {
              ageSquared
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ ageSquared: 144 }] } });
    });

    it('orders by custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people(order: { ageSquared: { dir: ASC } }) {
              ageSquared
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ ageSquared: 144 }, { ageSquared: 2025 }, { ageSquared: 4096 }] } });
    });
  });

  describe('with custom fields with arguments', () => {
    const schema: { [k: string]: schema.RecordType } = {
      people: {
        type: 'record',
        name: 'Person',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'age',
            type: 'int',
          },
          {
            name: 'active',
            type: 'boolean',
          },
        ],
      },
    };

    const data = [
      {
        name: 'Tim',
        age: 45,
        active: true,
      },
      {
        name: 'Juan',
        age: 12,
        active: false,
      },
      {
        name: 'Lin',
        age: 64,
        active: true,
      },
    ];

    const serverConfig: ServerConfig = {
      datasets: mapValues(schema, recordSchema => ({
        source: { data },
        baseAvroSchema: recordSchema,
        customFields: {
          agePowered: {
            type: 'int',
            arguments: {
              power: 'int'
            },
            source: (object: { age: number }, { power }: { power: number }) => object.age ** power,
          },
        },
      })),
    };

    const schemaAST = buildASTSchema(generateGraphQLSchema(serverConfig));

    it('selects custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people {
              agePowered(power: 3)
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ agePowered: 91125 }, { agePowered: 1728 }, { agePowered: 262144 }] } });
    });

    it('filters by custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people(filter: { cond: { agePowered: { arguments: { power: 3 }, filter: { lessThan: 2000 } } } }) {
              agePowered(power: 3)
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ agePowered: 1728 }] } });
    });

    it('orders by custom fields', async () => {
      const rootValue = generateGraphQLRoot(serverConfig);
      const result = await execute({
        schema: schemaAST,
        rootValue: rootValue,
        document: parse(`
          query {
            people(order: { agePowered: { arguments: { power: 3 }, order: { dir: ASC } } }) {
              agePowered(power: 3)
            }
          }
        `),
      });
      expect(result).toEqual({ data: { people: [{ agePowered: 1728 }, { agePowered: 91125 }, { agePowered: 262144 }] } });
    });
  });
});
