import { NamedTypeNode } from 'graphql';
import { namedType } from './graphql-ast-helpers';

export interface WithIncludes<T, I> {
  value: T;
  includes: { [k: string]: I };
}

export function inlineIncludes<T>(withIncludes: WithIncludes<T, T>): T[] {
  return [...Object.values(withIncludes.includes), withIncludes.value];
}

export function withNoIncludes<T>(value: T): WithIncludes<T, any> {
  return withIncludes({}, value);
}

export function withIncludes<T, I>(includes: { [k: string]: I }, value: T): WithIncludes<T, I> {
  return { value, includes };
}

export function includeSelf<I, T extends I & { name: { value: string } }>(wrapped: WithIncludes<T, I>): WithIncludes<T, I> {
  return flatMapWithIncludes(wrapped, value => withIncludes({ [value.name.value]: value }, value));
}

export function toNamedType(type: { name: { value: string } }): NamedTypeNode {
  return namedType(type.name.value);
}

export function mapWithIncludes<A, B, I>(wrapped: WithIncludes<A, I>, f: (value: A) => B): WithIncludes<B, I> {
  return {
    value: f(wrapped.value),
    includes: wrapped.includes,
  };
}

export function flatMapWithIncludes<A, B, I>(wrapped: WithIncludes<A, I>, f: (value: A) => WithIncludes<B, I>): WithIncludes<B, I> {
  const newWrapped = f(wrapped.value);
  return {
    value: newWrapped.value,
    includes: {
      ...wrapped.includes,
      ...newWrapped.includes,
    },
  };
}

function sequenceWithIncludesInternal<T, I>(current: WithIncludes<T[], I>, rest: WithIncludes<T, I>[]): WithIncludes<T[], I> {
  if (rest.length === 0) {
    return current;
  }

  const [next, ...newRest] = rest;
  const newCurrent = flatMapWithIncludes(current, currentValue => (
    mapWithIncludes(next, nextValue => [...currentValue, nextValue])
  ));
  return sequenceWithIncludesInternal(newCurrent, newRest);
}

export function sequenceWithIncludes<T, I>(wrappedArray: WithIncludes<T, I>[]): WithIncludes<T[], I> {
  if (wrappedArray.length === 0) {
    return withNoIncludes([]);
  }

  const [first, ...rest] = wrappedArray;
  const firstAsArray = mapWithIncludes(first, firstValue => [firstValue]);
  return sequenceWithIncludesInternal(firstAsArray, rest);
}
