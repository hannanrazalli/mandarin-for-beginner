// Purgers must drop in-memory/private local data synchronously before optional asynchronous cleanup.
const purgers = new Set<() => void | Promise<void>>();
export function registerAccountPurger(purge: () => void | Promise<void>) {
  purgers.add(purge);
  return () => {
    purgers.delete(purge);
  };
}
export function purgeAccountData() {
  const work = [...purgers].map((purge) => {
    try {
      return Promise.resolve(purge());
    } catch {
      return Promise.reject(new Error("Account purge failed"));
    }
  });
  return Promise.allSettled(work).then((results) => {
    if (results.some((result) => result.status === "rejected"))
      throw new Error("Account purge failed");
  });
}
