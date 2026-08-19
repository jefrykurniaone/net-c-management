/**
 * Shape returned by GET /api/activities — used to populate selects and filters.
 *
 * The Activity's colour is absent: livery is the initial on a magnet tile with
 * no colour fill, so no surface that reads this shape has any use for a hex.
 * The column behind it has been dropped, so there is no hex left to read.
 */
export interface ActivityOption {
    id: string;
    name: string;
    slug: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    defaultLocation: string;
    maxPlayers: number;
    isActive: boolean;
    _count?: { memberships: number };
}
