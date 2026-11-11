import { errorStatus, stream, type RequestOptions } from "./request";

/** Streams a local-model surface; a 400 means no local model is configured. */
export async function* streamWithModel<T>(
  url: string,
  body: object,
  init?: RequestOptions,
): AsyncGenerator<T> {
  try {
    yield* stream<T>(url, { body: { stream: true, ...body }, signal: init?.signal });
  } catch (err) {
    init?.signal?.throwIfAborted();
    if (errorStatus(err) === 400) throw new Error("NO_LOCAL_MODEL", { cause: err });
    throw err;
  }
}
