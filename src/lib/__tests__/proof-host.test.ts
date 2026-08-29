import { describe, it, expect } from 'vitest';
import {
    isOptimisableProofUrl,
    PUBLIC_STORAGE_PREFIX,
} from '../proof-host';

/**
 * The predicate standing between one odd Proof URL and a blank Payments queue
 * (#88). A false negative costs a thumbnail its optimisation; a false positive
 * hands the optimiser a URL it throws on, which is the crash itself — so the
 * cases that matter are the ones that *look* like the storage host.
 */

const STORAGE_BASE = 'https://abcdefghijklm.supabase.co';

const STORAGE_PROOF = `${STORAGE_BASE}${PUBLIC_STORAGE_PREFIX}payment-proofs/u1/receipt.png`;

describe('isOptimisableProofUrl', () => {
    it('accepts a Proof on the storage host under the public storage path', () => {
        expect(isOptimisableProofUrl(STORAGE_PROOF, STORAGE_BASE)).toBe(true);
    });

    it('accepts it when the configured base URL carries a trailing slash', () => {
        expect(isOptimisableProofUrl(STORAGE_PROOF, `${STORAGE_BASE}/`)).toBe(
            true,
        );
    });

    it('refuses the seeded placeholder host that took the queue down', () => {
        expect(
            isOptimisableProofUrl(
                'https://placehold.co/600x800/png?text=Transfer+Receipt',
                STORAGE_BASE,
            ),
        ).toBe(false);
    });

    it('refuses a host that merely ends with the storage host', () => {
        expect(
            isOptimisableProofUrl(
                `https://evil-abcdefghijklm.supabase.co${PUBLIC_STORAGE_PREFIX}x.png`,
                STORAGE_BASE,
            ),
        ).toBe(false);
    });

    it('refuses plain http to the same host: origin carries the scheme', () => {
        expect(
            isOptimisableProofUrl(
                STORAGE_PROOF.replace('https://', 'http://'),
                STORAGE_BASE,
            ),
        ).toBe(false);
    });

    it('refuses the right host outside the public storage path', () => {
        expect(
            isOptimisableProofUrl(
                `${STORAGE_BASE}/storage/v1/object/sign/payment-proofs/x.png`,
                STORAGE_BASE,
            ),
        ).toBe(false);
    });

    it('refuses a Proof URL that will not parse', () => {
        expect(isOptimisableProofUrl('not a url', STORAGE_BASE)).toBe(false);
        expect(isOptimisableProofUrl('', STORAGE_BASE)).toBe(false);
        expect(
            isOptimisableProofUrl('/storage/v1/object/public/x.png', STORAGE_BASE),
        ).toBe(false);
    });

    it('refuses everything when the storage base URL is missing or unusable', () => {
        expect(isOptimisableProofUrl(STORAGE_PROOF, undefined)).toBe(false);
        expect(isOptimisableProofUrl(STORAGE_PROOF, '')).toBe(false);
        expect(isOptimisableProofUrl(STORAGE_PROOF, 'abcdef.supabase.co')).toBe(
            false,
        );
    });
});
