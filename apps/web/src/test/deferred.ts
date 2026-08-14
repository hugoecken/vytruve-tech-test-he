/** Creates a promise whose completion remains under the test's control. */
export function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
}
