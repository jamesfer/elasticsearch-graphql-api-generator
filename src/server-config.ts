import { schema } from 'avsc';
import { ComputedField } from './version2/handlers/handler-types';

export interface InlineDataSource {
  data: any[];
}

export interface ElasticsearchDataSource {
  index: string;
}

export interface Dataset {
  baseAvroSchema: schema.RecordType;
  computedFields: { [k: string]: ComputedField<any, any, any, any> };
  source: ElasticsearchDataSource;
}

export interface DatabaseConfig {
  url: string;
}

export interface ServerConfig {
  datasets: { [k: string]: Dataset };
  database: DatabaseConfig;
}
