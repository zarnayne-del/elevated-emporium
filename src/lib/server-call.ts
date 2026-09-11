/**
 * Server functions protected by auth middleware reject with a raw `Response`
 * (e.g. 401). If that object reaches React Query / an error boundary it renders
 * as `Error: [object Response]` and blanks the screen. Normalise it here.
 */
export async function safeCall<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (typeof Response !== "undefined" && e instanceof Response) {
      const text = await e.text().catch(() => "");
      if (e.status === 401 || e.status === 403) {
        throw new Error("Your staff session has expired. Please sign in again.");
      }
      throw new Error(text || `Request failed (${e.status})`);
    }
    throw e;
  }
}
