# Elasticsearch API Generator

We end up writing a lot of APIs for Elasticsearch databases by hand. Each one takes a lot of
developer hours to develop and maintain. In addition, we usually only add the search features to
the API that are required for the current use-case, which means that everytime a new team wants to
use our data, they have to plan their new features with us and the team loses their independence.

Compare this to a dataset in a data warehouse. A team can publish a dataset to the data warehouse
and other teams can independently use the dataset for their own purposes without having to talk to
the originating team. In this scenario, the query interface is SQL which supports operations based
on the table schema.

The aim of this repo is to treat Elasticsearch datasets more like datasets in a data warehouse.
It automatically generates a GraphQL interface based on the index's mappings and adds many kinds of
filters and sort parameters. In this way, the consuming teams can independently use the API for new
use-cases that weren't previously known.

## Examples

There are a few examples of how to use the library in the `/examples` directory.

```typescript
import { createServer } from 'src/server';
import { ServerConfig } from 'src/server-config';

export const serverConfig: ServerConfig = {
  database: {
    url: 'http://localhost:9200',
  },
  datasets: {
    properties: {
      source: { index: 'properties' },
      computedFields: {},
      baseAvroSchema: {
        name: 'Property',
        type: 'record',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'streetNumber', type: 'string' },
          { name: 'streetName', type: 'string' },
          { name: 'streetType', type: 'string' },
          { name: 'suburb', type: 'string' },
          { name: 'postcode', type: 'string' },
          { name: 'yearBuilt', type: 'int' },
          { name: 'bedrooms', type: 'int' },
          { name: 'bathrooms', type: 'int' },
          { name: 'carSpaces', type: 'int' },
        ],
      },
    },
  },
};

const port = 3000;

createServer(serverConfig).listen(port, () => {
  console.log(`Server started on port ${port}`);
});
```

Using just the simple configuration above, we can create a GraphQL API that supports filters for
every field that we've listed in the config. Including combining filters with boolean operations
and sorting the results in any direction. Every field and condition has the correct type information
because from the mappings and adding new fields is a simple change to the configuration.

Example GraphQL query:
```graphql
query {
  properties(
    filter: {
      and: [
        {
        	cond: {
            bedrooms: { equals: 1 }
          }
        },
        {
          cond: {
            yearBuilt: { greaterThan: 1980 }
          }
        }
      ]
    },
    order: {
      avmPrice: ASC
    }
  ) {
    id
    streetNumber
    streetName
    streetType
    suburb
    postcode
    yearBuilt
    bedrooms
    bathrooms
    carSpaces
    avmPrice
  }
}
```

The library also supports computed fields and custom Elasticsearch query snippets in case the
default filters provided aren't enough.
