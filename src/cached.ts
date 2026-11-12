// A failed refresh serves the last good value, so an upstream outage doesn't take the endpoint down.
export function cached<T>(ttl: number, load: () => Promise<T>): () => Promise<T> {
  let last: { value: T; expiresAt: number } | undefined;
  let pending: Promise<T> | undefined;

  return async () => {
    if (last && last.expiresAt > Date.now()) return last.value;

    pending ??= load()
      .then((value) => {
        last = { value, expiresAt: Date.now() + ttl * 1000 };
        return value;
      })
      .finally(() => {
        pending = undefined;
      });

    try {
      return await pending;
    } catch (err) {
      if (last) return last.value;
      throw err;
    }
  };
}
