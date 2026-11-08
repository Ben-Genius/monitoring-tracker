import type { Role } from './permissions';

/** How a role is named to people, not how it's stored. */
export const ROLE_LABEL: Record<Role, string> = {
    admin: 'Admin',
    executive: 'Executive',
    pa: 'Executive PA',
    lead: 'Project lead',
    employee: 'Staff',
};
export const roleLabel = (r?: string | null) => (r && r in ROLE_LABEL ? ROLE_LABEL[r as Role] : 'Member');
