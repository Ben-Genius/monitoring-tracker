import { useMemo } from 'react';
import { useProject } from './useProjects';
import { useMilestones } from './useMilestones';

const STAGE_WEIGHTS: Record<string, number> = {
    completed: 1.0,
    in_progress: 0.5,
    blockers: 0.3,
    talking_stage: 0.1,
    yet_to_start: 0,
};

const MILESTONE_WEIGHTS: Record<string, number> = {
    completed: 1.0,
    in_progress: 0.5,
    pending: 0,
    overdue: 0,
    cancelled: 0,
};

export function useProjectProgress(projectId: string) {
    const { data: project, isLoading: projectLoading } = useProject(projectId);
    const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(projectId);

    return useMemo(() => {
        if (!project) return { progress: 0, taskProgress: 0, milestoneProgress: 0, taskBreakdown: [], isLoading: projectLoading || milestonesLoading };

        const tasks = project.tasks || [];

        const taskBreakdown = tasks.map(t => ({
            title: t.title,
            stage: t.stage,
            weight: STAGE_WEIGHTS[t.stage] ?? 0,
        }));

        const taskProgress = tasks.length > 0
            ? Math.round((taskBreakdown.reduce((s, t) => s + t.weight, 0) / tasks.length) * 100)
            : 0;

        const milestoneProgress = milestones.length > 0
            ? Math.round((milestones.reduce((s, m) => s + (MILESTONE_WEIGHTS[m.status] ?? 0), 0) / milestones.length) * 100)
            : 0;

        const milestoneCount = milestones.length;

        let progress: number;
        if (tasks.length > 0 && milestones.length > 0) {
            progress = Math.round(taskProgress * 0.6 + milestoneProgress * 0.4);
        } else if (tasks.length > 0) {
            progress = taskProgress;
        } else if (milestones.length > 0) {
            progress = milestoneProgress;
        } else {
            progress = 0;
        }

        return {
            progress,
            taskProgress,
            milestoneProgress,
            taskBreakdown,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.stage === 'completed').length,
            milestoneCount,
            completedMilestones: milestones.filter(m => m.status === 'completed').length,
            isLoading: false,
        };
    }, [project, milestones, projectLoading, milestonesLoading]);
}
