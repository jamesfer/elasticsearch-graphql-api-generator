import fs from 'fs';
import readline from 'readline';
import zlib from 'zlib';
import { BulkOperationContainer } from '@elastic/elasticsearch/api/types';
import { random, sample } from 'lodash';
import { AsyncIterableX, from, last, range } from 'ix/asynciterable';
import { buffer, flatMap, map } from 'ix/asynciterable/operators'
import fetch from 'node-fetch';

export interface Property {
  id: string;
  streetNumber: string;
  streetName: string;
  streetType: string;
  suburb: string;
  postcode: string;
  yearBuilt: number;
  avmPrice: number;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
}

type IndexRequest<T> = [BulkOperationContainer, T];

const performBulkIndex = (
  url: string,
) => async <T>(
  data: IndexRequest<T>[],
): Promise<void> => {
  console.log('Indexing', data.length, 'records');

  const stringBody = data.flat(1).map(x => JSON.stringify(x)).join('\n') + '\n';
  const compressedBody = await new Promise<Buffer>((res, rej) => zlib.gzip(stringBody, (err, val) => err ? rej(err) : res(val)));
  const response = await fetch(`${url}/_bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
    body: compressedBody,
  });

  if (!response.ok) {
    throw new Error(`Failed request: ${(await response.buffer()).toString()}`);
  }
}

const createBulkRequest = (
  index: string,
) => <T extends { id: string }>(
  document: T,
): IndexRequest<T> => {
  return [
    { index: { _index: index, _id: document.id } as any },
    document,
  ];
}

function makeProperty(): Property {
  return {
    id: `${random(1000000, 9999999)}`,
    streetNumber: `${random(1, 99)}`,
    streetName: sample(['Gilbert', 'High', 'River', 'Snow', 'Alpine', 'Briggan', 'Newline', 'Neu', 'Haste', 'Marshal', 'Lookout', 'Disk', 'Reaven', 'Young', 'Treant'])!,
    streetType: sample(['Street', 'Avenue', 'Road', 'Crescent', 'Way', 'Highway'])!,
    suburb: sample(['Kew', 'Hawthorn', 'Richmond', 'East Richmond', 'Melbourne', 'Footscray', 'Abbotsford', 'Cremone', 'Toorak', 'Malvern'])!,
    postcode: `${random(3000, 3500)}`,
    yearBuilt: random(1950, 2020),
    avmPrice: random(300000, 2000000),
    bedrooms: random(1, 5),
    bathrooms: random(1, 3),
    carSpaces: random(0, 3),
  };
}

async function main() {
  // Index documents
  await last(range(0, 10000).pipe(
    map(makeProperty),
    map(createBulkRequest('properties')),
    buffer(5000),
    map(performBulkIndex('http://localhost:9200')),
  ));

  console.log('Done');
}

main();
