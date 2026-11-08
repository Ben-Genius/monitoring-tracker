/**
 * Role capabilities.
 *
 * The app asked `user.role === 'admin'` in a dozen places, which conflated two
 * different questions: "can this person see every company?" and "can this
 * person administer the system?". Mr Blay and his PA need the first and must
 * not have the second, so the questions are now asked separately.
 */

export type Role = 'admin' | 'executive' | 'pa' | 'lead' | 'employee';

type Actor = { role: Role } | null | undefined;

const GLOBAL_VIEW: Role[] = ['admin', 'executive', 'pa'];

/** Sees all three companies rather than only their own. */
export function canViewAllCompanies(user: Actor): boolean {
    return !!user && GLOBAL_VIEW.includes(user.role);
}

/** Creates and chases commitments on someone else's behalf. */
export function canCoordinate(user: Actor): boolean {
    return user?.role === 'admin' || user?.role === 'pa';
}

/** Manages users, companies and system settings. */
export function canAdminister(user: Actor): boolean {
    return user?.role === 'admin';
}

/** Accepts completed work and approves stage transitions. */
export function canApprove(user: Actor): boolean {
    return user?.role === 'admin' || user?.role === 'lead';
}

/** Reads the morning brief. */
export function canReadBrief(user: Actor): boolean {
    return !!user && GLOBAL_VIEW.includes(user.role);
}

/** Where a user lands after signing in: the executive and PA start on the brief. */
export function homePath(user: Actor): string {
    return user?.role === 'executive' || user?.role === 'pa' ? '/brief' : '/dashboard';
}
