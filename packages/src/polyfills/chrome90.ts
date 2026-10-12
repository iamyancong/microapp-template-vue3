type ArrayMethod = (this: unknown[], ...args: any[]) => unknown;

/**
 * 仅在浏览器缺失时补齐数组方法，避免给 Chrome 90 下发完整 legacy bundle。
 * @param name 方法名
 * @param implementation 兼容实现
 */
const defineArrayMethod = (name: string, implementation: ArrayMethod): void => {
  if (name in Array.prototype) return;
  Object.defineProperty(Array.prototype, name, {
    configurable: true,
    writable: true,
    value: implementation,
  });
};

defineArrayMethod('at', function (index: number) {
  const normalizedIndex = Math.trunc(index) || 0;
  const targetIndex = normalizedIndex < 0 ? this.length + normalizedIndex : normalizedIndex;
  return targetIndex >= 0 && targetIndex < this.length ? this[targetIndex] : undefined;
});

defineArrayMethod(
  'findLast',
  function (predicate: (value: unknown, index: number, array: unknown[]) => boolean, thisArg?: unknown) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) return this[index];
    }
    return undefined;
  }
);

defineArrayMethod(
  'findLastIndex',
  function (predicate: (value: unknown, index: number, array: unknown[]) => boolean, thisArg?: unknown) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) return index;
    }
    return -1;
  }
);

defineArrayMethod('toSorted', function (compareFn?: (left: unknown, right: unknown) => number) {
  return Array.from(this).sort(compareFn);
});

defineArrayMethod('toReversed', function () {
  return Array.from(this).reverse();
});

defineArrayMethod('toSpliced', function (start: number, deleteCount?: number, ...items: unknown[]) {
  const copy = Array.from(this);
  if (arguments.length === 1) {
    copy.splice(start);
  } else {
    copy.splice(start, deleteCount ?? 0, ...items);
  }
  return copy;
});

defineArrayMethod('with', function (index: number, value: unknown) {
  const copy = Array.from(this);
  const normalizedIndex = Math.trunc(index) || 0;
  const targetIndex = normalizedIndex < 0 ? copy.length + normalizedIndex : normalizedIndex;
  if (targetIndex < 0 || targetIndex >= copy.length) {
    throw new RangeError('Array index out of range');
  }
  copy[targetIndex] = value;
  return copy;
});

/** Chrome 90 缺少 Object.hasOwn，使用原型方法提供等价判断。 */
const objectConstructor = Object as ObjectConstructor & {
  hasOwn?: (object: object, property: PropertyKey) => boolean;
};

if (!objectConstructor.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: (object: object, property: PropertyKey) => Object.prototype.hasOwnProperty.call(object, property),
  });
}

export {};
