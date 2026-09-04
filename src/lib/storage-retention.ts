/**
 * Which stored objects a replace supersedes.
 *
 * The rule, its per-bucket reasons and the failure split are
 * `docs/adr/0017-storage-object-retention.md` (#303). This module is only the
 * decision: no I/O, nothing imported from the storage client, so the one piece
 * of logic whose failure deletes the wrong file is assertable in the Node test
 * environment rather than only against a live bucket.
 *
 * It owns the join from a listing's name to a full object key, because that
 * mismatch is where a tidy-up becomes data loss: a `list(ownerPrefix)` answers
 * with names relative to the prefix, so a bare `receipt.png` compared against a
 * written `u1/receipt.png` differs as a string and would select for removal the
 * file that was just written.
 */

const KEY_SEPARATOR = '/';

/**
 * A key in the form the removal call expects: separator-joined, with empty
 * segments dropped so a prefix given with a trailing slash, a leading one, or
 * a doubled separator cannot make an owner's own file look like a stranger's.
 */
function normaliseKey(key: string): string {
    return key
        .split(KEY_SEPARATOR)
        .filter((segment) => segment.trim().length > 0)
        .join(KEY_SEPARATOR);
}

function joinOwnerKey(ownerPrefix: string, name: string): string {
    return normaliseKey(`${ownerPrefix}${KEY_SEPARATOR}${name}`);
}

/**
 * The keys to remove from one owner's area after writing `writtenKey`.
 *
 * `ownerPrefix` is the prefix the listing was taken under — a member id for
 * `avatars`, empty for a singleton bucket whose listing is already full keys.
 * `existingNames` are the names that listing returned, relative to that prefix.
 *
 * `writtenKey` is a full key and is never returned. A blank one is a caller
 * shape violation rather than an owner with no files: it would leave every
 * listed object unmatched and select all of them, including the file that was
 * just written, so it throws instead of answering.
 */
export function selectSupersededObjectKeys(
    ownerPrefix: string,
    existingNames: readonly string[],
    writtenKey: string,
): string[] {
    const written = normaliseKey(writtenKey);
    if (written.length === 0) {
        throw new TypeError(
            'selectSupersededObjectKeys: writtenKey must be a non-empty object key',
        );
    }

    const superseded = existingNames
        .filter((name) => normaliseKey(name).length > 0)
        .map((name) => joinOwnerKey(ownerPrefix, name))
        .filter((key) => key !== written);

    return [...new Set(superseded)];
}
