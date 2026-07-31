import { useLogActivity, LogInput } from './useAuditLog';

// Helper to log a change with old/new value comparison
export function useLogger() {
    const log = useLogActivity();

    const logUpdate = (
        entityType: LogInput['entity_type'],
        entityId: string,
        field: string,
        oldValue: string | number | null | undefined,
        newValue: string | number | null | undefined,
        summary: string,
    ) => {
        if (oldValue === newValue) return;
        log.mutate({
            entity_type: entityType,
            entity_id: entityId,
            action: 'updated',
            field,
            old_value: String(oldValue ?? ''),
            new_value: String(newValue ?? ''),
            summary,
        });
    };

    const logStageChange = (
        entityType: LogInput['entity_type'],
        entityId: string,
        oldStage: string,
        newStage: string,
        name: string,
    ) => {
        if (oldStage === newStage) return;
        log.mutate({
            entity_type: entityType,
            entity_id: entityId,
            action: 'stage_changed',
            field: 'stage',
            old_value: oldStage,
            new_value: newStage,
            summary: `"${name}" moved from ${oldStage.replace('_', ' ')} to ${newStage.replace('_', ' ')}`,
        });
    };

    const logStatusChange = (
        entityType: LogInput['entity_type'],
        entityId: string,
        oldStatus: string,
        newStatus: string,
        name: string,
    ) => {
        if (oldStatus === newStatus) return;
        log.mutate({
            entity_type: entityType,
            entity_id: entityId,
            action: 'status_changed',
            field: 'status',
            old_value: oldStatus,
            new_value: newStatus,
            summary: `"${name}" status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
        });
    };

    const logCreate = (entityType: LogInput['entity_type'], entityId: string, summary: string) => {
        log.mutate({
            entity_type: entityType,
            entity_id: entityId,
            action: 'created',
            summary,
        });
    };

    const logDelete = (entityType: LogInput['entity_type'], entityId: string, summary: string) => {
        log.mutate({
            entity_type: entityType,
            entity_id: entityId,
            action: 'deleted',
            summary,
        });
    };

    const logImport = (summary: string) => {
        log.mutate({
            entity_type: 'import',
            entity_id: '00000000-0000-0000-0000-000000000000',
            action: 'imported',
            summary,
        });
    };

    return { logUpdate, logStageChange, logStatusChange, logCreate, logDelete, logImport };
}
