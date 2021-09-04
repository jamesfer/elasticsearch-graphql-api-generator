import {
  MatchQuery,
  QueryContainer,
  RangeQuery,
  WildcardQuery,
} from '@elastic/elasticsearch/api/types';

export const term = (field: string) => (value: string | number | boolean): QueryContainer => ({
  term: { [field]: value },
});

export const range = (field: string) => (query: RangeQuery): QueryContainer => ({
  range: { [field]: query },
});

export const match = (field: string) => (query: MatchQuery): QueryContainer => ({
  match: { [field]: query },
});

export const wildcard = (field: string) => (query: WildcardQuery): QueryContainer => ({
  wildcard: { [field]: query },
});
