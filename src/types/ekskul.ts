/** Shape returned by GET /api/ekskul — used to populate selects and filters. */
export interface EkskulOption {
    id: string;
    name: string;
    slug: string;
    color: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    defaultLocation: string;
    maxPlayers: number;
    isActive: boolean;
    _count?: { memberships: number };
}
