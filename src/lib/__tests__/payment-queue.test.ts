import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { queuePageIdsSql, type QueueFilters } from '../payment-queue';

/**
 * The queue's order is the whole point of the surface, and it is one SQL
 * statement — so the statement is what can be wrong without anybody noticing.
 * Three properties are worth testing without a database: the order the page is
 * read in, that every value an Admin typed arrives as a bound parameter rather
 * than as text inside the statement, and that the raw path guards the Owner's
 * email exactly as the Prisma path beside it does.
 */

const NO_FILTERS: QueueFilters = {
    month: undefined,
    year: undefined,
    status: undefined,
    activityId: undefined,
    search: '',
};

const PAGE_SIZE = 10;
const SECOND_PAGE_SKIP = 20;

/** One statement's text with its runs of whitespace flattened, for matching. */
function flat(query: { text: string }): string {
    return query.text.replace(/\s+/g, ' ').trim();
}

/** The page an Admin sees, which is every case here but the Owner's own. */
function adminPage(filters: QueueFilters, skip?: number, take?: number) {
    return queuePageIdsSql(filters, Role.ADMIN, skip, take);
}

/** Each scalar filter, the SQL it becomes, and the value it binds. */
const SCALAR_FILTERS: ReadonlyArray<
    [string, Partial<QueueFilters>, string, string | number]
> = [
    ['month', { month: 8 }, 'p."month" = $1', 8],
    ['year', { year: 2026 }, 'p."year" = $1', 2026],
    ['status', { status: 'CONFIRMED' }, 'p."status" = $1', 'CONFIRMED'],
    ['activityId', { activityId: 'act_1' }, 'p."activityId" = $1', 'act_1'],
];

describe('queuePageIdsSql', () => {
    it('reads awaiting Payments first, then by recency, then by id', () => {
        const query = adminPage(NO_FILTERS, 0, PAGE_SIZE);
        expect(flat(query)).toContain(
            'ORDER BY CASE WHEN p."status" = $1::"PaymentStatus" ' +
                'THEN 0 ELSE 1 END ASC, p."createdAt" DESC, p."id" DESC',
        );
        expect(query.values[0]).toBe('PENDING');
    });

    it('never sorts on the status column, whose enum order it must not read', () => {
        const query = adminPage(NO_FILTERS, 0, PAGE_SIZE);
        expect(flat(query)).not.toMatch(/ORDER BY[^,]*p\."status"\s+(ASC|DESC)/);
    });

    it('asks for no clause at all when nothing is filtered', () => {
        expect(flat(adminPage(NO_FILTERS, 0, PAGE_SIZE))).not.toContain('WHERE');
    });

    it.each(SCALAR_FILTERS)(
        'binds the %s filter as a parameter',
        (_name, part, sql, value) => {
            const query = adminPage({ ...NO_FILTERS, ...part }, 0, PAGE_SIZE);
            expect(flat(query)).toContain(`WHERE ${sql}`);
            expect(query.values[0]).toBe(value);
        },
    );

    it('ands every filter it was given, in one clause', () => {
        const query = adminPage(
            {
                month: 8,
                year: 2026,
                status: 'PENDING',
                activityId: 'act_1',
                search: 'adi',
            },
            0,
            PAGE_SIZE,
        );
        expect(flat(query)).toContain(
            'WHERE p."month" = $1 AND p."year" = $2 ' +
                'AND p."status" = $3::"PaymentStatus" AND p."activityId" = $4',
        );
        expect(flat(query)).toContain('AND EXISTS');
    });

    it('searches the member by name or by email, as the counts do', () => {
        const query = adminPage({ ...NO_FILTERS, search: 'adi' }, 0, PAGE_SIZE);
        expect(flat(query)).toContain(
            'EXISTS ( SELECT 1 FROM "User" u WHERE u."id" = p."userId" ' +
                'AND (u."name" ILIKE $1 OR ',
        );
        expect(query.values.slice(0, 2)).toEqual(['%adi%', '%adi%']);
    });

    it('withholds the Owner from the email arm for an Admin', () => {
        const query = adminPage({ ...NO_FILTERS, search: 'adi' }, 0, PAGE_SIZE);
        expect(flat(query)).toContain(
            '(u."email" ILIKE $2 AND u."role" <> $3::"Role")',
        );
        expect(query.values[2]).toBe('OWNER');
    });

    it('leaves the email arm unguarded for an Owner, who may search it', () => {
        const query = queuePageIdsSql(
            { ...NO_FILTERS, search: 'adi' },
            Role.OWNER,
            0,
            PAGE_SIZE,
        );
        expect(flat(query)).toContain(
            'AND (u."name" ILIKE $1 OR u."email" ILIKE $2) )',
        );
        expect(query.values).not.toContain('OWNER');
    });

    it('guards the name arm for nobody, since the name is what cells print', () => {
        const query = adminPage({ ...NO_FILTERS, search: 'adi' }, 0, PAGE_SIZE);
        expect(flat(query)).toContain('(u."name" ILIKE $1 OR');
        expect(flat(query)).not.toMatch(/u\."name" ILIKE \$1 AND/);
    });

    it('never puts a typed value into the statement, wildcards included', () => {
        const typed = "%_' OR 1=1 --";
        const query = adminPage({ ...NO_FILTERS, search: typed }, 0, PAGE_SIZE);
        expect(query.text).not.toContain(typed);
        expect(query.text).not.toContain('OR 1=1');
        expect(query.values).toContain(`%${typed}%`);
    });

    it('windows the page, binding the size and the offset', () => {
        const query = adminPage(NO_FILTERS, SECOND_PAGE_SKIP, PAGE_SIZE);
        expect(flat(query)).toContain('LIMIT $2 OFFSET $3');
        expect(query.values).toEqual(['PENDING', PAGE_SIZE, SECOND_PAGE_SKIP]);
    });

    it('takes no window at all when the page size is "show all"', () => {
        const text = flat(adminPage(NO_FILTERS, undefined, undefined));
        expect(text).not.toContain('LIMIT');
        expect(text).not.toContain('OFFSET');
    });
});
