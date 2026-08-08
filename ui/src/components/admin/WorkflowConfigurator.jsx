import React, { useState } from 'react';
import { useWorkflowConfig } from '@/contexts/WorkflowContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Share2,
  GitBranch,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { MermaidDiagram } from '@lightenna/react-mermaid-diagram';
import { Badge } from '@/components/ui/badge';

const WorkflowConfigurator = () => {
  const { workflow, updateWorkflow, loading, refreshWorkflow } = useWorkflowConfig();
  const [editingConfig, setEditingConfig] = useState(JSON.parse(JSON.stringify(workflow)));
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStates, setExpandedStates] = useState({});
  const { toast } = useToast();

  const toggleExpand = (stateId) => {
    setExpandedStates((prev) => ({ ...prev, [stateId]: !prev[stateId] }));
  };

  const handleStateLabelChange = (stateId, newLabel) => {
    setEditingConfig((prev) => ({
      ...prev,
      states: {
        ...prev.states,
        [stateId]: { ...prev.states[stateId], label: newLabel },
      },
    }));
  };

  const handleActionLabelChange = (stateId, actionIndex, newLabel) => {
    setEditingConfig((prev) => {
      const newActions = [...prev.states[stateId].actions];
      newActions[actionIndex] = { ...newActions[actionIndex], label: newLabel };
      return {
        ...prev,
        states: {
          ...prev.states,
          [stateId]: { ...prev.states[stateId], actions: newActions },
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateWorkflow(editingConfig);
    setIsSaving(false);
    if (result.success) {
      toast({ title: 'Success', description: 'Workflow configuration updated successfully.' });
    } else {
      toast({ title: 'Error', description: 'Failed to update workflow.', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setEditingConfig(JSON.parse(JSON.stringify(workflow)));
    toast({ title: 'Reset', description: 'Changes discarded.' });
  };

  const generateMermaid = () => {
    let code = 'graph TD\n';
    Object.entries(editingConfig.states).forEach(([id, config]) => {
      const nodeLabel = config.label || id;
      code += `    ${id}["${nodeLabel}"]\n`;
      (config.actions || []).forEach((action) => {
        code += `    ${id} -->|"${action.label}"| ${action.targetState}\n`;
      });
    });
    return code;
  };

  if (loading)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Standardized Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <GitBranch className="w-6 h-6 text-primary" />
            </div>
            Workflow Configurator
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest ml-1">
            Configure job states and transitions
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="rounded-xl border-gray-200 hover:bg-gray-50 h-10 px-4 text-xs font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-primary hover:bg-primary-dark text-white shadow-sm h-10 px-6 text-xs font-bold"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}{' '}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Side */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">
            States & Transitions
          </h3>
          <div className="h-[calc(100vh-350px)] pr-4 overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              {Object.entries(editingConfig.states).map(([id, config]) => (
                <Card
                  key={id}
                  className="border-gray-100 shadow-sm overflow-hidden group hover:border-primary/20 transition-all"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer bg-gray-50/50 group-hover:bg-primary/5 transition-colors"
                    onClick={() => toggleExpand(id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedStates[id] ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <span className="text-xs font-mono text-gray-400 block">{id}</span>
                        <span className="font-bold text-gray-800">{config.label}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white text-gray-500 border-gray-200">
                      {config.actions?.length || 0} Actions
                    </Badge>
                  </div>

                  {expandedStates[id] && (
                    <CardContent className="p-4 space-y-4 border-t border-gray-100 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500 uppercase">
                            State Title (Label)
                          </Label>
                          <Input
                            value={config.label}
                            onChange={(e) => handleStateLabelChange(id, e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500 uppercase">Description</Label>
                          <Input
                            value={config.description || ''}
                            onChange={(e) => {
                              const newDesc = e.target.value;
                              setEditingConfig((prev) => ({
                                ...prev,
                                states: {
                                  ...prev.states,
                                  [id]: { ...prev.states[id], description: newDesc },
                                },
                              }));
                            }}
                            placeholder="Optional description..."
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      {config.actions?.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <Label className="text-xs text-gray-500 uppercase flex items-center gap-2">
                            <Share2 className="w-3 h-3" /> Transition Actions (Edges)
                          </Label>
                          <div className="space-y-3">
                            {config.actions.map((action, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl border border-dashed border-gray-200 space-y-3 bg-gray-50/30"
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-gray-400">
                                      Action Label
                                    </Label>
                                    <Input
                                      value={action.label}
                                      onChange={(e) =>
                                        handleActionLabelChange(id, idx, e.target.value)
                                      }
                                      className="h-8 text-sm rounded-lg"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-gray-400">Description</Label>
                                    <Input
                                      value={action.description || ''}
                                      onChange={(e) => {
                                        const newDesc = e.target.value;
                                        setEditingConfig((prev) => {
                                          const newActions = [...prev.states[id].actions];
                                          newActions[idx] = {
                                            ...newActions[idx],
                                            description: newDesc,
                                          };
                                          return {
                                            ...prev,
                                            states: {
                                              ...prev.states,
                                              [id]: { ...prev.states[id], actions: newActions },
                                            },
                                          };
                                        });
                                      }}
                                      placeholder="Action desc..."
                                      className="h-8 text-sm rounded-lg"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-2">
                                    {action.roles.map((role) => (
                                      <Badge
                                        key={role}
                                        variant="outline"
                                        className="text-[10px] h-4"
                                      >
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                                    <ArrowRight className="w-2 h-2" /> {action.targetState}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Side */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">
            Job Workflow Preview
          </h3>
          <Card className="border-gray-100 shadow-sm h-[calc(100vh-350px)] overflow-hidden bg-white flex items-center justify-center">
            <div className="w-full h-full p-4 overflow-auto">
              <MermaidDiagram>{generateMermaid()}</MermaidDiagram>
            </div>
          </Card>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Renaming states or actions only changes their display labels.
              Internal IDs and logic paths remain intact to ensure system stability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowConfigurator;
