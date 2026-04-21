
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DynamicForm = ({ schema, values, onChange }) => {
    if (!schema) return <p className="text-muted-foreground italic text-sm">No specific fields defined for this test.</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.map(field => (
                <div key={field.id} className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Label htmlFor={field.id} className="text-xs font-semibold text-gray-700">{field.label}</Label>
                    <Input 
                        id={field.id}
                        type={field.type || "text"}
                        step={field.step}
                        placeholder={`Enter ${field.label}...`}
                        className="h-10 border-gray-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                        value={values?.[field.id] || ''}
                        onChange={(e) => onChange(field.id, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
};

export default DynamicForm;
