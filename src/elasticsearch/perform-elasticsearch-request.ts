import { SearchRequest, SearchResponse } from '@elastic/elasticsearch/api/types';
import fetch from 'node-fetch';
import { DatabaseConfig, Dataset } from '../server-config';

export const performElasticsearchRequest = (
  serverConfig: DatabaseConfig,
) => async (
  dataset: Dataset,
  search: SearchRequest['body'],
): Promise<SearchResponse> => {
  console.log('Performing search', JSON.stringify(search, undefined, 2));
  const response = await fetch(`${serverConfig.url}/${dataset.source.index}/_search`, {
    method: 'POST',
    body: JSON.stringify(search),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = (await response.buffer()).toString();
    throw new Error(`Elasticsearch request failed (status ${response.status}): ${body}`);
  }

  const body = await response.json();
  // console.log('Received response', JSON.stringify(body, undefined, 2));
  return body;
}
