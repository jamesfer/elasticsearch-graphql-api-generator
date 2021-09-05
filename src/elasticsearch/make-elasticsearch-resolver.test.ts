import {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse, SearchSortCombinations,
} from '@elastic/elasticsearch/api/types';
import { Dataset } from '../server-config';
import { DatasetArguments } from '../graphql/types';
import { makeElasticsearchResolver } from './make-elasticsearch-resolver';

describe('makeElasticsearchResolver', () => {
  const document = {};

  const emptyResponse: SearchResponse<any> = {
    took: 0,
    timed_out: false,
    _shards: {
      failed: 1,
      successful: 1,
      total: 1,
    },
    hits: {
      total: 1,
      hits: [{
        _index: 'index',
        _id: '123',
        _source: document,
      }],
    },
  };

  const baseDataset: Dataset = {
    baseAvroSchema: {
      type: 'record',
      name: 'example',
      fields: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'age',
          type: 'int',
        }
      ],
    },
    computedFields: {},
    source: {
      index: 'example-index',
    },
  };


  describe('without custom fields', () => {
    let mockSearcher: jest.Mock<Promise<SearchResponse>, [Dataset, SearchRequest['body']]>;
    let runRequest: (request: DatasetArguments) => Promise<any>;

    beforeEach(() => {
      mockSearcher = jest.fn<Promise<SearchResponse>, [Dataset, SearchRequest['body']]>(async () => emptyResponse);
      runRequest = request => makeElasticsearchResolver(mockSearcher)(baseDataset)(null, request, null, null as any);
    });

    it('returns the source of the hits', async () => {
      const data = await runRequest({});
      expect(data).toEqual([document]);
    });

    it('constructs empty requests', async () => {
      await runRequest({});
      expect(mockSearcher).toHaveBeenCalledWith(baseDataset, {
        query: { match_all: {} },
      });
    });

    describe('with filters', () => {
      it('adds a filter from a handler', async () => {
        await runRequest({
          filter: { cond: { name: { equals: 'value' } } }
        });
        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(baseDataset, {
          query: {
            bool: {
              filter: [{
                term: {
                  'name.keyword': 'value',
                },
              }],
            },
          },
        });
      });

      it('combines filters with and', async () => {
        await runRequest({
          filter: {
            and: [
              { cond: { name: { equals: 'value' } } },
              { cond: { age: { greaterThan: 18 } } },
            ],
          }
        });
        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(baseDataset, {
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [{
                      term: {
                        'name.keyword': 'value',
                      },
                    }],
                  },
                },
                {
                  bool: {
                    filter: [{
                      range: {
                        age: { gt: 18 },
                      },
                    }],
                  },
                },
              ],
            },
          },
        });
      });

      it('combines filters with or', async () => {
        await runRequest({
          filter: {
            or: [
              { cond: { name: { equals: 'value' } } },
              { cond: { age: { greaterThan: 18 } } },
            ],
          }
        });
        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(baseDataset, {
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          filter: [{
                            term: {
                              'name.keyword': 'value',
                            },
                          }],
                        },
                      },
                      {
                        bool: {
                          filter: [{
                            range: {
                              age: { gt: 18 },
                            },
                          }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      });
    });

    describe('with order', () => {
      it('adds many sort directions', async () => {
        await runRequest({
          order: [{ name: 'ASC' }, { age: 'DESC' }],
        });

        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(baseDataset, {
          query: { match_all: {} },
          sort: [
            { ['name.keyword']: 'asc' },
            { ['age.keyword']: 'desc' },
          ],
        });
      });
    });
  });

  describe('with custom fields', () => {
    let mockSearcher: jest.Mock<Promise<SearchResponse>, [Dataset, SearchRequest['body']]>;
    let runRequest: (dataset: Dataset, request: DatasetArguments) => Promise<any>;

    beforeEach(() => {
      mockSearcher = jest.fn<Promise<SearchResponse>, [Dataset, SearchRequest['body']]>(async () => emptyResponse);
      runRequest = (dataset, request) =>
        makeElasticsearchResolver(mockSearcher)(dataset)(null, request, null, null as any);
    });

    describe('custom fields with filter support', () => {
      it('includes computed fields in elasticsearch filters', async () => {
        const dataset: Dataset = {
          ...baseDataset,
          computedFields: {
            x: {
              toElasticsearchFilter: [{
                term: {
                  x: 'hello',
                },
              }],
            },
          },
        };
        await runRequest(dataset, {
          filter: { cond: { x: 'anything' } }
        });
        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(dataset, {
          query: {
            bool: {
              filter: [{
                term: {
                  x: 'hello',
                },
              }],
            },
          },
        });
      });

      describe('when the computed field elasticsearch filter is a function', () => {
        let computedFilter: jest.Mock<QueryDslQueryContainer[], [string[], any]>;
        let dataset: Dataset;

        beforeEach(async () => {
          computedFilter = jest.fn<QueryDslQueryContainer[], [string[], any]>().mockReturnValue([{
            term: { x: 'hello' },
          }]);
          dataset = {
            ...baseDataset,
            computedFields: {
              x: {
                toElasticsearchFilter: computedFilter,
              },
            },
          };
          await runRequest(dataset, {
            filter: { cond: { x: { param: 'value' } } },
          });
        });

        it('calls the computed filter with the request params', async () => {
          expect(computedFilter).toHaveBeenCalledWith<[string[], any]>(['x'], { param: 'value' });
        });

        it('includes computed fields with in elasticsearch filters', async () => {
          expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(dataset, {
            query: {
              bool: {
                filter: [{
                  term: { x: 'hello' },
                }],
              },
            },
          });
        });
      });
    });

    describe('custom fields with order support', () => {
      it('includes computed fields in elasticsearch sort', async () => {
        const dataset: Dataset = {
          ...baseDataset,
          computedFields: {
            x: {
              toElasticsearchSort: [{ name: 'desc' }],
            },
          },
        };
        await runRequest(dataset, {
          order: [{ x: 'something' }]
        });
        expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(dataset, {
          query: {
            match_all: {}
          },
          sort: [{ name: 'desc' }],
        });
      });

      describe('when the computed field elasticsearch sort is a function', () => {
        let computedSort: jest.Mock<SearchSortCombinations[], [string[], any]>;
        let dataset: Dataset;

        beforeEach(async () => {
          computedSort = jest.fn<SearchSortCombinations[], [string[], any]>().mockReturnValue(
            [{ name: 'desc' }],
          );
          dataset = {
            ...baseDataset,
            computedFields: {
              x: {
                toElasticsearchSort: computedSort,
              },
            },
          };
          await runRequest(dataset, {
            order: [{ x: { param: 'value' } }],
          });
        });

        it('calls the computed filter with the request params', async () => {
          expect(computedSort).toHaveBeenCalledWith<[string[], any]>(['x'], { param: 'value' });
        });

        it('includes computed fields with in elasticsearch filters', async () => {
          expect(mockSearcher).toHaveBeenCalledWith<[Dataset, SearchRequest['body']]>(dataset, {
            query: {
              match_all: {}
            },
            sort: [{ name: 'desc' }],
          });
        });
      });
    });
  });
});
