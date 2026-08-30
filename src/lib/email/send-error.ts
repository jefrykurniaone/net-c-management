/**
 * Wraps a failed `sendMail` rejection with how long it ran before failing, so a slow
 * stall (e.g. a stuck SMTP socket) is distinguishable from a fast rejection in logs.
 * Pure formatting only — no I/O.
 */
export function formatSendFailure(error: unknown, elapsedMs: number): Error {
    const reason = error instanceof Error ? error.message : String(error);
    return new Error(`send failed after ${elapsedMs} ms: ${reason}`, { cause: error });
}
