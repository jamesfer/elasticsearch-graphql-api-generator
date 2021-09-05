export function castFunction<A extends any[], R>(f: R | ((...args: A) => R)): (...args: A) => R {
  return typeof f === 'function' ? f as ((...args: A) => R) : () => f;
}

export function applyN<A1, R>(a1: A1): (f: (a1: A1) => R) => R;
export function applyN<A1, A2, R>(a1: A1, a2: A2): (f: (a1: A1, a2: A2) => R) => R;
export function applyN<A1, A2, A3, R>(a1: A1, a2: A2, a3: A3): (f: (a1: A1, a2: A2, a3: A3) => R) => R;
export function applyN<A1, A2, A3, A4, R>(a1: A1, a2: A2, a3: A3, a4: A4): (f: (a1: A1, a2: A2, a3: A3, a4: A4) => R) => R;
export function applyN<A extends any[], R>(...args: A): (f: (...args: A) => R) => R {
  return f => f(...args);
}
