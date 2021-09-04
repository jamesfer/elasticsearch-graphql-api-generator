import { TypeMapping } from '@elastic/elasticsearch/api/types';
import { mapValues } from 'lodash';
import { ServerConfig } from '../../server-config';
import { generateRecordMappings } from './mapping-utils';

export function makeElasticsearchMappings(serverConfig: ServerConfig): { [k: string]: TypeMapping } {
  return mapValues(serverConfig.datasets, dataset => ({
    properties: generateRecordMappings(dataset.baseAvroSchema, [])
  }));
}
