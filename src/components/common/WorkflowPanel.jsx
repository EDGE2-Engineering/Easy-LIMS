import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '@/hooks/useWorkflow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { APP_CONFIG } from '@/data/config';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from 'lucide-react';

const WorkflowPanel = ({ jobId, currentStatus, onTransition, onActionClick }) => {
    const navigate = useNavigate();
    const { getAvailableActions, performAction, revertState, loading } = useWorkflow(jobId, currentStatus);
    const availableActions = getAvailableActions();
    const currentStateConfig = APP_CONFIG.workflow.states[currentStatus];
    
    const stateKeys = Object.keys(APP_CONFIG.workflow.states);
    const currentIndex = stateKeys.indexOf(currentStatus);
    const canGoBack = currentIndex > 0;
    const previousStateLabel = canGoBack ? APP_CONFIG.workflow.states[stateKeys[currentIndex - 1]]?.label : '';

    const handleRevert = async () => {
        const success = await revertState();
        if (success && onTransition) {
            onTransition();
        }
    };

    const handleAction = async (actionId, action) => {
        if (onActionClick) {
            const result = onActionClick(actionId, action);
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
        <Card className="mb-6 border-l-4 border-l-primary shadow-sm bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Current Status: <span className="text-primary font-bold">{currentStateConfig?.label || currentStatus}</span>
                </CardTitle>
                <div className="flex gap-2">
                    {canGoBack && (
                        <Button 
                            onClick={handleRevert}
                            disabled={loading}
                            size="sm"
                            variant="outline"
                            className="transition-all hover:scale-105 border-primary/20 hover:bg-primary/5 text-primary"
                            title={`Revert to ${previousStateLabel}`}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                           Revert to {previousStateLabel}
                        </Button>
                    )}
                    {availableActions.map(action => (
                        <Button 
                            key={action.id} 
                            onClick={() => handleAction(action.id, action)}
                            disabled={loading}
                            size="sm"
                            className="transition-all hover:scale-105"
                        >
                            {action.label}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-2 no-scrollbar h-20">
                    {Object.keys(APP_CONFIG.workflow.states).map((stateKey, idx) => {
                        const isPast = Object.keys(APP_CONFIG.workflow.states).indexOf(currentStatus) > idx;
                        const isCurrent = currentStatus === stateKey;
                        const state = APP_CONFIG.workflow.states[stateKey];
                        
                        return (
                            <div key={stateKey} className="flex items-center flex-shrink-0">
                                <div className={`flex flex-col items-center ${isCurrent ? 'opacity-100 scale-110' : 'opacity-40'} transition-all`}>
                                    <div className={`p-1.5 rounded-full ${isPast ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-white shadow-lg' : 'bg-muted text-muted-foreground'}`}>
                                        {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? 'text-primary' : ''}`}>{state.label}</span>
                                </div>
                                {idx < Object.keys(APP_CONFIG.workflow.states).length - 1 && (
                                    <div className={`h-[2px] w-6 mx-1 ${isPast ? 'bg-green-300' : 'bg-muted'}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default WorkflowPanel;
