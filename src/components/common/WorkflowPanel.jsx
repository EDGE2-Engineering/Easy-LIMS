import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '@/hooks/useWorkflow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { APP_CONFIG } from '@/data/config';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';

const WorkflowPanel = ({ jobId, currentStatus, onTransition, onActionClick }) => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { workflow } = useWorkflowConfig();
    const { getAvailableActions, performAction, revertState, loading } = useWorkflow(jobId, currentStatus);
    const availableActions = getAvailableActions();
    const currentStateConfig = workflow.states[currentStatus];
    
    const stateKeys = Object.keys(workflow.states);
    const currentIndex = stateKeys.indexOf(currentStatus);
    const canGoBack = currentIndex > 0;
    const previousStateLabel = canGoBack ? workflow.states[stateKeys[currentIndex - 1]]?.label : '';

    const handleRevert = async () => {
        const success = await revertState();
        if (success && onTransition) {
            onTransition();
        }
    };

    const handleAction = async (actionId, action) => {
        if (onActionClick) {
            const result = await onActionClick(actionId, action, performAction);
            if (result === false) return; // intercept automatic transition
        }

        if (action.navigate) {
            const url = action.navigate.replace('{jobId}', jobId);
            navigate(url);
            return;
        }
        
        const success = await performAction(actionId);
        if (success && onTransition) {
            onTransition();
        }
    };

    return (
        <TooltipProvider delayDuration={200}>
            <Card className="mb-2 border-l-4 border-l-primary shadow-sm bg-background/50 backdrop-blur-sm">
            <CardHeader className="space-y-0 p-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wider">
                    Current Job Status: <span className="text-primary font-bold">{currentStateConfig?.label || currentStatus}</span>
                </CardTitle>
                <div className="flex gap-2">
                    {canGoBack && isAdmin() && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={handleRevert}
                                    disabled={loading}
                                    size="sm"
                                    variant="outline"
                                    className="transition-all hover:scale-105 border-primary/20 hover:bg-primary/5 text-primary bg-red-700 hover:bg-red-600 text-xs px-2"
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4 text-white" />
                                    <p className="text-white"> Revert to {previousStateLabel}</p>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Roll back the job to the previous workflow state: {previousStateLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {availableActions.map(action => (
                        <Tooltip key={action.id}>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={() => handleAction(action.id, action)}
                                    disabled={loading}
                                    size="sm"
                                    className="transition-all hover:scale-105 text-xs px-2 dark:text-white"
                                >
                                    {action.label}
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>{action.description || action.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pl-4 pr-4 pt-0 pb-0">
                <div className="flex items-center space-x-2 mt-1 overflow-x-auto pb-2 no-scrollbar h-16">
                    {Object.keys(workflow.states).map((stateKey, idx) => {
                        const isPast = Object.keys(workflow.states).indexOf(currentStatus) > idx;
                        const isCurrent = currentStatus === stateKey;
                        const state = workflow.states[stateKey];
                        
                        return (
                            <div key={stateKey} className="flex items-center flex-shrink-0">
                                <div className={`flex flex-col items-center ${isCurrent ? 'opacity-100 scale-110' : 'opacity-40'} transition-all`}>
                                    <div className={`p-0 rounded-full ${isPast ? 'workflow-state-done' : isCurrent ? 'workflow-state-active' : 'workflow-state-inactive'}`}>
                                        {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? 'text-primary' : ''}`}>{state.label}</span>
                                </div>
                                {idx < Object.keys(workflow.states).length - 1 && (
                                    <ChevronRight className={`h-4 w-4 mx-1 -mt-4 ${isPast ? 'text-green-600' : 'text-muted-foreground'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default WorkflowPanel;
