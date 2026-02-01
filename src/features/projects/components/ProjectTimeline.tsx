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
    theme?: { primary: string; accent: string };
    onRequestTransition?: () => void;
}

export default function ProjectTimeline({ currentStage, className, theme: customTheme, onRequestTransition }: ProjectTimelineProps) {
    const defaultTheme = { primary: '#6366f1', accent: '#8b5cf6' }; // Default indigo/violet
    const theme = customTheme || defaultTheme;

    const stages = [
        { id: 'planning', label: 'Planning', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'active', label: 'Active Execution', icon: Play, color: theme.primary, bg: `${theme.primary}10` },
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
        <div className={cn("relative p-6 bg-white rounded-2xl border border-slate-200", className)}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Project Lifecycle Timeline</h3>
                <Badge variant="outline" className="font-bold border-slate-200 text-slate-400">End-to-End Tracking</Badge>
            </div>

            <div className="relative flex justify-between items-start max-w-4xl mx-auto px-4">
                {/* Connector Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 -z-0" />

                {stages.map((stage) => {
                    const status = getStageStatus(stage.id);
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center w-1/3 text-center">
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                                status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                                    status === 'current' ? "bg-white text-slate-900 shadow-none" :
                                        "bg-white border-slate-100 text-slate-300"
                            )}
                                style={status === 'current' ? { borderColor: theme.primary, color: theme.primary } : {}}
                            >
                                {status === 'completed' ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                            </div>

                            <div className="mt-4">
                                <span className={cn(
                                    "text-xs font-bold block",
                                    status === 'upcoming' ? "text-slate-400" : "text-slate-900"
                                )}>
                                    {stage.label}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5 block">
                                    {status === 'completed' ? 'Finished' : status === 'current' ? 'In Progress' : 'Planned'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lifecycle Status Message */}
            <div className="mt-12 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                    {currentStage === 'planning' ? <Clock className="h-4 w-4 text-blue-500" /> :
                        currentStage === 'active' ? <Play className="h-4 w-4" style={{ color: theme.primary }} /> :
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Phase Insights</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {currentStage === 'planning' ? "Focusing on project definition, resource allocation and lead assignment." :
                            currentStage === 'active' ? "Executing tasks and monitoring daily performance vs budget." :
                                "Project completed. Final review and handover documents are being finalized."}
                    </p>
                </div>
                {currentStage !== 'completed' && (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="font-bold h-9 px-5 rounded-lg text-xs"
                        onClick={onRequestTransition}
                    >
                        Request Transition
                        <ArrowRight className="h-3 w-3 ml-2" />
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
