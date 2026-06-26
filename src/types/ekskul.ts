/** Shape returned by GET /api/ekskul — used to populate selects and filters. */
export interface EkskulOption {
    id: string;
    name: string;
    slug: string;
    color: string;
    defaultFee: number;
    defaultLocation: string;
    maxPlayers: number;
    isActive: boolean;
    _count?: { memberships: number };
}
