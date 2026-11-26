import type { VercelRequest, VercelResponse } from '@vercel/node';
import health from '../_lib/baserowSync/health.js';
import syncEngineers from '../_lib/baserowSync/sync-engineers.js';
import syncPhases from '../_lib/baserowSync/sync-phases.js';
import syncProjects from '../_lib/baserowSync/sync-projects.js';
import syncSubtasks from '../_lib/baserowSync/sync-subtasks.js';
import syncTasks from '../_lib/baserowSync/sync-tasks.js';

/**
 * Every /api/baserow/* endpoint in one serverless function, so the project
 * stays within Vercel Hobby's 12-function limit. The addresses are unchanged
 * (/api/baserow/health, /api/baserow/sync-tasks, …); each handler lives in
 * api/_lib/baserowSync/ and keeps its own checks and authorisation.
 */
const HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
    'health': health,
    'sync-engineers': syncEngineers,
    'sync-phases': syncPhases,
    'sync-projects': syncProjects,
    'sync-subtasks': syncSubtasks,
    'sync-tasks': syncTasks,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = String(req.query.action ?? '');
    const run = Object.prototype.hasOwnProperty.call(HANDLERS, action) ? HANDLERS[action] : undefined;
    if (!run) return res.status(404).json({ error: `Unknown Baserow endpoint: ${action || '(none)'}` });
    // The route parameter isn't one of the handler's own query options.
    delete req.query.action;
    return run(req, res);
}
