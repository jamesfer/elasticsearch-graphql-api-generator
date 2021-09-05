import {
  QueryDslMatchQuery,
  QueryDslQueryContainer, QueryDslRangeQuery, QueryDslWildcardQuery,
} from '@elastic/elasticsearch/api/types';

export const term = (field: string) => (value: string | number | boolean): QueryDslQueryContainer => ({
  term: { [field]: value },
});

export const range = (field: string) => (query: QueryDslRangeQuery): QueryDslQueryContainer => ({
  range: { [field]: query },
});

export const match = (field: string) => (query: QueryDslMatchQuery): QueryDslQueryContainer => ({
  match: { [field]: query },
});

export const wildcard = (field: string) => (query: QueryDslWildcardQuery): QueryDslQueryContainer => ({
  wildcard: { [field]: query },
});
