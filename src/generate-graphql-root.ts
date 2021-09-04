import { Schema } from 'avsc';
import { every, find, isEmpty, map, mapValues, orderBy } from 'lodash';
import { Dataset, ServerConfig } from './server-config';

interface BooleanFilter {
  equals?: boolean;
}

interface NumberFilter {
  equals?: number;
  greaterThan?: number;
  greaterEqualTo?: number;
  lessThan?: number;
  lessEqualTo?: number;
}

interface StringFilter {
  equals?: string;
  greaterThan?: string;
  greaterEqualTo?: string;
  lessThan?: string;
  lessEqualTo?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
}

type TermFilter = BooleanFilter | NumberFilter | StringFilter;

interface ComputedTermFilter {
  arguments: { [k: string]: any };
  filter: TermFilter;
}

interface ValueFilter {
  [k: string]: TermFilter | ComputedTermFilter;
}

interface FilterArg {
  cond?: ValueFilter;
  and?: FilterArg[];
  or?: FilterArg[];
}

interface OrderSettings {
  dir: 'DESC' | 'ASC';
}

interface ComputedOrderSettings {
  arguments: { [k: string]: any };
  order: OrderSettings;
}

interface OrderArg {
  [k: string]: OrderSettings | ComputedOrderSettings;
}

interface Args {
  filter?: FilterArg;
  order?: OrderArg;
}

// function categoriseFilter(filter: BooleanFilter | NumberFilter | StringFilter): x

function isBooleanFilter(filter: BooleanFilter | NumberFilter | StringFilter): filter is BooleanFilter {
  const firstKey = Object.keys(filter)[0];
  return firstKey === undefined || typeof (filter as any)[firstKey] === 'boolean';
}

function isNumberFilter(filter: BooleanFilter | NumberFilter | StringFilter): filter is NumberFilter {
  const firstKey = Object.keys(filter)[0];
  return firstKey === undefined || typeof (filter as any)[firstKey] === 'number';
}

function isStringFilter(filter: BooleanFilter | NumberFilter | StringFilter): filter is StringFilter {
  const firstKey = Object.keys(filter)[0];
  return firstKey === undefined || typeof (filter as any)[firstKey] === 'string';
}

function applyBooleanFilter(filter: BooleanFilter, value: any): boolean {
  if (isEmpty(filter)) {
    return true;
  }

  if (typeof value !== 'boolean') {
    return false;
  }

  return filter.equals ? value === filter.equals : false;
}

function applyNumberFilter(filter: NumberFilter, value: any): boolean {
  if (isEmpty(filter)) {
    return true;
  }

  if (typeof value !== 'number') {
    return false;
  }

  return every([
    filter.equals ? value === filter.equals : true,
    filter.greaterThan ? value > filter.greaterThan : true,
    filter.greaterEqualTo ? value >= filter.greaterEqualTo : true,
    filter.lessThan ? value < filter.lessThan : true,
    filter.lessEqualTo ? value <= filter.lessEqualTo : true,
  ]);
}

function applyStringFilter(filter: StringFilter, value: any): boolean {
  if (isEmpty(filter)) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return every([
    filter.equals ? value === filter.equals : true,
    filter.greaterThan ? value > filter.greaterThan : true,
    filter.greaterEqualTo ? value >= filter.greaterEqualTo : true,
    filter.lessThan ? value < filter.lessThan : true,
    filter.lessEqualTo ? value <= filter.lessEqualTo : true,
    filter.startsWith ? value.startsWith(filter.startsWith) : true,
    filter.endsWith ? value.endsWith(filter.endsWith) : true,
    filter.contains ? value.includes(filter.contains) : true,
  ]);
}

function applyTermFilter(fieldSchema: Schema, filter: BooleanFilter | NumberFilter | StringFilter, object: any): boolean {
  if (typeof fieldSchema === 'string') {
    switch (fieldSchema) {
      // Cannot filter these fields
      case 'null':
      case 'long':
      case 'double':
      case 'bytes':
        return false;

      case 'boolean':
        return isBooleanFilter(filter) && applyBooleanFilter(filter, object);
      case 'int':
      case 'float':
        return isNumberFilter(filter) && applyNumberFilter(filter, object);
      case 'string':
        return isStringFilter(filter) && applyStringFilter(filter, object);
    }
  }

  // Nothing else is implemented
  return false;
}

function applyValueFilter(dataset: Dataset, filter: ValueFilter, object: any): boolean {
  if (isEmpty(filter)) {
    return true;
  }

  // Return false if the value is not an object as we can't apply the filter to it
  if (typeof object !== 'object' || !object) {
    return false;
  }

  return every(dataset.baseAvroSchema.fields, (field) => {
    const valueFilter = filter[field.name];

    // Return true if we are not filtering on this field
    if (!valueFilter) {
      return true;
    }

    return applyTermFilter(field.type, valueFilter as TermFilter, object[field.name]);
  }) && every(Object.entries(dataset.computedFields), ([name, computedField]) => {
    const valueFilter = filter[name];

    // Return true if we are not filtering on this field
    if (!valueFilter) {
      return true;
    }

    const [args, termFilter] = 'arguments' in valueFilter
      ? [valueFilter.arguments, valueFilter.filter]
      : [{}, valueFilter];
    return applyTermFilter(computedField.type, termFilter, object[name](args));
  });
}

function applyFilterToObject(dataset: Dataset, filter: FilterArg, object: any): boolean {
  if (filter.cond && !applyValueFilter(dataset, filter.cond, object)) {
    return false;
  }

  if (filter.and && filter.and.length > 0) {
    if (!filter.and.every(andFilter => applyFilterToObject(dataset, andFilter, object))) {
      return false;
    }
  }

  if (filter.or && filter.or.length > 0) {
    if (!filter.or.some(orFilter => applyFilterToObject(dataset, orFilter, object))) {
      return false;
    }
  }

  return true;
}

function applyFilter(dataset: Dataset, filter: FilterArg | undefined, data: any[]): any[] {
  return filter ? data.filter(object => applyFilterToObject(dataset, filter, object)) : data;
}

function applyKeyOrdering(dataset: Dataset, key: string, settings: OrderSettings | ComputedOrderSettings, collection: any): any[] {
  const schemaField = find(dataset.baseAvroSchema.fields, { name: key });
  if (schemaField) {
    return orderBy(collection, key, (settings as OrderSettings).dir === 'DESC' ? 'desc' : 'asc');
  }

  const computedField = dataset.computedFields[key];
  if (computedField) {
    const [args, orderSettings] = 'arguments' in settings ? [settings.arguments, settings.order] : [{}, settings];
    return orderBy(collection, element => element[key](args), orderSettings.dir === 'DESC' ? 'desc' : 'asc')
  }

  return collection;
}

function applyOrder(dataset: Dataset, order: OrderArg | undefined, collection: any[]): any[] {
  if (!order) {
    return collection;
  }

  return Object.keys(order || {}).reduce(
    (collection, key) => applyKeyOrdering(dataset, key, order[key], collection),
    collection,
  );
}

function makeClass(dataset: Dataset): { new (data: { [k: string]: any }): any } {
  class DatasetClass {
    constructor(public _data: { [k: string]: any }) {
      Object.assign(this, _data);
    }
  }

  map(dataset.computedFields, (field, name) => {
    (DatasetClass.prototype as any)[name] = function (this: DatasetClass, args: any) {
      return field.source(this._data, args);
    };
  });

  return DatasetClass as unknown as { new (data: { [k: string]: any }): any };
}

export function generateGraphQLRoot(serverConfig: ServerConfig): any {
  return mapValues(serverConfig.datasets, dataset => (args: Args, context: unknown, info: unknown) => {
    const DatasetClass = makeClass(dataset);
    const classedData = dataset.source.data.map(element => new DatasetClass(element));
    return applyOrder(dataset, args.order, applyFilter(dataset, args.filter, classedData));
  });
}
