type FlushFunction = () => Promise<void>;

let privateFlushPromise: Promise<void> | null = null;
let communityFlushPromise: Promise<void> | null = null;

export function runPrivateFlush(
  flush: FlushFunction
): Promise<void> {
  if (privateFlushPromise) {
    return privateFlushPromise;
  }

  const promise = Promise.resolve().then(flush);

  privateFlushPromise = promise.finally(() => {
    if (privateFlushPromise === promise) {
      privateFlushPromise = null;
    }
  });

  return privateFlushPromise;
}

export function runCommunityFlush(
  flush: FlushFunction
): Promise<void> {
  if (communityFlushPromise) {
    return communityFlushPromise;
  }

  const promise = Promise.resolve().then(flush);

  communityFlushPromise = promise.finally(() => {
    if (communityFlushPromise === promise) {
      communityFlushPromise = null;
    }
  });

  return communityFlushPromise;
}

export async function waitForPrivateFlush(): Promise<void> {
  const promise = privateFlushPromise;

  if (promise) {
    await promise;
  }
}

export async function waitForCommunityFlush(): Promise<void> {
  const promise = communityFlushPromise;

  if (promise) {
    await promise;
  }
}

export async function waitForAllFlushes(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (privateFlushPromise) {
    promises.push(privateFlushPromise);
  }

  if (communityFlushPromise) {
    promises.push(communityFlushPromise);
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}