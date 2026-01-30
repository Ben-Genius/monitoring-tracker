import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Clock,
    ArrowRight,
    Play,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TimelineEvent {
    id: string;
    stage: 'planning' | 'active' | 'completed' | 'on_hold' | 'cancelled';
    label: string;
    description: string;
    date?: string;
    status: 'completed' | 'current' | 'upcoming';
}

interface ProjectTimelineProps {
    currentStage: string;
    className?: string;
}

export default function ProjectTimeline({ currentStage, className }: ProjectTimelineProps) {
    const stages = [
        { id: 'planning', label: 'Planning', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'active', label: 'Active Execution', icon: Play, color: 'text-primary', bg: 'bg-primary/10' },
        { id: 'completed', label: 'Handover & Completion', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' }
    ];

    // Determine status for each stage based on currentStage
    const getStageStatus = (stageId: string) => {
        const order = ['planning', 'active', 'completed'];
        const currentIndex = order.indexOf(currentStage);
        const stageIndex = order.indexOf(stageId);

        if (stageIndex < currentIndex) return 'completed';
        if (stageIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className={cn("relative p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm", className)}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-900">Project Lifecycle Timeline</h3>
                <Badge variant="outline" className="font-bold">End-to-End Tracking</Badge>
            </div>

            <div className="relative flex justify-between items-start max-w-4xl mx-auto">
                {/* Connector Line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-100 -z-0" />

                {stages.map((stage) => {
                    const status = getStageStatus(stage.id);
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center group w-1/3 text-center">
                            <div className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                                status === 'completed' ? "bg-success border-success text-white shadow-lg shadow-success/20" :
                                    status === 'current' ? "bg-white border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                                        "bg-white border-slate-100 text-slate-300"
                            )}>
                                {status === 'completed' ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                            </div>

                            <div className="mt-4">
                                <span className={cn(
                                    "text-sm font-bold block transition-colors",
                                    status === 'upcoming' ? "text-slate-400" : "text-slate-900"
                                )}>
                                    {stage.label}
                                </span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1 block">
                                    {status === 'completed' ? 'Finished' : status === 'current' ? 'In Progress' : 'Planned'}
                                </span>
                            </div>

                            {/* Tooltip-like Description (visible on hover) */}
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                                {status === 'completed' ? `Successfully transitioned from ${stage.label}.` :
                                    status === 'current' ? `Currently focused on ${stage.label} objectives.` :
                                        `Future stage: ${stage.label}. Requires approval to activate.`}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lifecycle Status Message */}
            <div className="mt-20 p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    {currentStage === 'planning' ? <Clock className="text-blue-500" /> :
                        currentStage === 'active' ? <Play className="text-primary" /> :
                            <CheckCircle2 className="text-success" />}
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Current Phase Insights</p>
                    <p className="text-sm text-slate-700 font-medium">
                        {currentStage === 'planning' ? "Focusing on project definition, resource allocation and lead assignment." :
                            currentStage === 'active' ? "Executing tasks and monitoring daily performance vs budget." :
                                "Project completed. Final review and handover documents are being finalized."}
                    </p>
                </div>
                {currentStage !== 'completed' && (
                    <Button size="sm" variant="outline" className="font-bold h-9">
                        Request Transition
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: 'outline' | 'default', className?: string }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors uppercase tracking-wider",
            variant === 'outline' ? "border border-slate-200 text-slate-500 bg-white" : "bg-primary text-white",
            className
        )}>
            {children}
        </span>
    );
}
