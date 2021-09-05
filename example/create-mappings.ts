import { IndicesCreateRequest } from '@elastic/elasticsearch/api/types';
import { pipe } from 'fp-ts/function';
import { IO, of, sequenceArray } from 'fp-ts/IO';
import { getOrElse, map } from 'fp-ts/Option';
import { collect, lookup } from 'fp-ts/Record';
import { Ord } from 'fp-ts/string';
import fetch from 'node-fetch';
import zlib from 'zlib';
import { makeElasticsearchMappings } from '../src/elasticsearch/make-elasticsearch-mappings';
import { serverConfig } from './server-config-4';

function compress(data: string | ArrayBuffer): Promise<Buffer> {
  return new Promise<Buffer>((res, rej) => (
    zlib.gzip(data, (err, val) => { err ? rej(err) : res(val) })
  ));
}

const createIndex = (
  url: string,
  indexName: string,
) => async <T>(
  data: IndicesCreateRequest['body'],
): Promise<void> => {
  console.log('Creating mappings');

  const response = await fetch(`${url}/${indexName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
    body: await compress(JSON.stringify(data)),
  });

  if (!response.ok) {
    throw new Error(`Failed request: ${(await response.buffer()).toString()}`);
  }

  console.log(await response.json());
}

const main = pipe(
  makeElasticsearchMappings(serverConfig),
  collect(Ord)((name, mappings) => pipe(
    lookup(name)(serverConfig.datasets),
    map((dataset): IO<void> => () => (
      createIndex('http://localhost:9200', dataset.source.index)({ mappings })
    )),
    getOrElse(() => of<void>(void 0)),
  )),
  sequenceArray,
);

main();
