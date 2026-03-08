import React, { useState } from 'react';
import { Save, Beaker, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

// ─── Default Structures ──────────────────────────────────────────────────────

const defaultLabRow = () => ({
    depth: '',
    bulkDensity: '',
    moistureContent: '',
    grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' },
    atterbergLimits: { liquidLimit: '', plasticLimit: '', plasticityIndex: '' },
    specificGravity: '',
    freeSwellIndex: ''
});

const defaultChemicalLevel = () => ({
    phValue: '',
    sulphates: '',
    chlorides: '',
    additionalKeys: [{ key: '', value: '' }]
});

const defaultGrainSizeRow = () => ({
    depth: '',
    sieve1: '', sieve2: '', sieve3: '', sieve4: '',
    sieve5: '', sieve6: '', sieve7: '', sieve8: ''
});

const getInitialData = (existing) => {
    const base = {
        labTestResults: [[defaultLabRow()]],
        chemicalAnalysis: [defaultChemicalLevel()],
        grainSizeAnalysis: [[defaultGrainSizeRow()]]
    };
    if (!existing) return base;
    return {
        ...existing,
        labTestResults: Array.isArray(existing.labTestResults) && existing.labTestResults.length > 0
            ? existing.labTestResults
            : base.labTestResults,
        chemicalAnalysis: Array.isArray(existing.chemicalAnalysis) && existing.chemicalAnalysis.length > 0
            ? existing.chemicalAnalysis
            : base.chemicalAnalysis,
        grainSizeAnalysis: Array.isArray(existing.grainSizeAnalysis) && existing.grainSizeAnalysis.length > 0
            ? existing.grainSizeAnalysis
            : base.grainSizeAnalysis,
    };
};

// ─── Component ────────────────────────────────────────────────────────────────

const TestingDetailsForm = ({
    initialData,
    appUsers = [],
    onSave,
    onCancel,
    isSaving = false
}) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState(() => getInitialData(initialData));

    // ── Lab Test Results handlers ─────────────────────────────────────────────

    const handleLabTestResultChange = (levelIndex, logIndex, field, value) => {
        setFormData(prev => {
            const updated = prev.labTestResults.map((level, li) => {
                if (li !== levelIndex) return level;
                return level.map((row, ri) => {
                    if (ri !== logIndex) return row;
                    if (field.includes('.')) {
                        const [parent, child] = field.split('.');
                        return { ...row, [parent]: { ...row[parent], [child]: value } };
                    }
                    return { ...row, [field]: value };
                });
            });
            return { ...prev, labTestResults: updated };
        });
    };

    const addLabTestLog = (levelIndex) => {
        setFormData(prev => {
            const updated = prev.labTestResults.map((level, li) =>
                li === levelIndex ? [...level, defaultLabRow()] : level
            );
            return { ...prev, labTestResults: updated };
        });
    };

    const removeLabTestLog = (levelIndex, logIndex) => {
        setFormData(prev => {
            const updated = prev.labTestResults.map((level, li) =>
                li === levelIndex ? level.filter((_, ri) => ri !== logIndex) : level
            );
            return { ...prev, labTestResults: updated };
        });
    };

    const addLabTestLevel = () => {
        setFormData(prev => ({
            ...prev,
            labTestResults: [...prev.labTestResults, [defaultLabRow()]]
        }));
    };

    const removeLabTestLevel = (levelIndex) => {
        setFormData(prev => ({
            ...prev,
            labTestResults: prev.labTestResults.filter((_, li) => li !== levelIndex)
        }));
    };

    // ── Chemical Analysis handlers ────────────────────────────────────────────

    const handleChemicalAnalysisChange = (index, field, value) => {
        setFormData(prev => {
            const updated = prev.chemicalAnalysis.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            );
            return { ...prev, chemicalAnalysis: updated };
        });
    };

    const handleChemicalAnalysisKeyChange = (index, keyIndex, field, value) => {
        setFormData(prev => {
            const updated = prev.chemicalAnalysis.map((item, i) => {
                if (i !== index) return item;
                const updatedKeys = item.additionalKeys.map((k, ki) =>
                    ki === keyIndex ? { ...k, [field]: value } : k
                );
                return { ...item, additionalKeys: updatedKeys };
            });
            return { ...prev, chemicalAnalysis: updated };
        });
    };

    const addChemicalAnalysisKey = (index) => {
        setFormData(prev => {
            const updated = prev.chemicalAnalysis.map((item, i) =>
                i === index
                    ? { ...item, additionalKeys: [...item.additionalKeys, { key: '', value: '' }] }
                    : item
            );
            return { ...prev, chemicalAnalysis: updated };
        });
    };

    const removeChemicalAnalysisKey = (index, keyIndex) => {
        setFormData(prev => {
            const updated = prev.chemicalAnalysis.map((item, i) =>
                i === index
                    ? { ...item, additionalKeys: item.additionalKeys.filter((_, ki) => ki !== keyIndex) }
                    : item
            );
            return { ...prev, chemicalAnalysis: updated };
        });
    };

    const addChemicalAnalysisLevel = () => {
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: [...prev.chemicalAnalysis, defaultChemicalLevel()]
        }));
    };

    const removeChemicalAnalysisLevel = (index) => {
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: prev.chemicalAnalysis.filter((_, i) => i !== index)
        }));
    };

    // ── Grain Size Analysis handlers ──────────────────────────────────────────

    const handleGrainSizeAnalysisChange = (levelIndex, rowIndex, field, value) => {
        setFormData(prev => {
            const updated = prev.grainSizeAnalysis.map((level, li) => {
                if (li !== levelIndex) return level;
                return level.map((row, ri) =>
                    ri === rowIndex ? { ...row, [field]: value } : row
                );
            });
            return { ...prev, grainSizeAnalysis: updated };
        });
    };

    const addGrainSizeAnalysisRow = (levelIndex) => {
        setFormData(prev => {
            const updated = prev.grainSizeAnalysis.map((level, li) =>
                li === levelIndex ? [...level, defaultGrainSizeRow()] : level
            );
            return { ...prev, grainSizeAnalysis: updated };
        });
    };

    const removeGrainSizeAnalysisRow = (levelIndex, rowIndex) => {
        setFormData(prev => {
            const updated = prev.grainSizeAnalysis.map((level, li) =>
                li === levelIndex ? level.filter((_, ri) => ri !== rowIndex) : level
            );
            return { ...prev, grainSizeAnalysis: updated };
        });
    };

    const addGrainSizeAnalysisLevel = () => {
        setFormData(prev => ({
            ...prev,
            grainSizeAnalysis: [...prev.grainSizeAnalysis, [defaultGrainSizeRow()]]
        }));
    };

    const removeGrainSizeAnalysisLevel = (levelIndex) => {
        setFormData(prev => ({
            ...prev,
            grainSizeAnalysis: prev.grainSizeAnalysis.filter((_, li) => li !== levelIndex)
        }));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right-4 duration-300">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Beaker className="w-5 h-5 text-primary" /> Testing Details
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Enter lab test results, chemical analysis and grain size data</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving} className="rounded-lg border-gray-200 h-9">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSave(formData)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 flex items-center gap-2 h-9 transition-all shadow-sm"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Details'}
                    </Button>
                </div>
            </div>

            <div className="space-y-8">

                {/* ── Section 1: Laboratory Test Results ────────────────────────── */}
                <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Laboratory Test Results</h3>
                    <div className="space-y-8">
                        {formData.labTestResults.map((levelLogs, levelIndex) => (
                            <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-semibold text-gray-700">Lab Test Result - Level {levelIndex + 1}</h4>
                                    {formData.labTestResults.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeLabTestLevel(levelIndex)}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                            <tr>
                                                <th className="px-3 py-3 min-w-[100px]">Depth (m)</th>
                                                <th className="px-3 py-3 min-w-[150px]">Bulk Density</th>
                                                <th className="px-3 py-3 min-w-[150px]">Moisture Content %</th>
                                                <th className="px-3 py-3 min-w-[200px]">Grain Size Distribution</th>
                                                <th className="px-3 py-3 min-w-[200px]">Atterberg Limits</th>
                                                <th className="px-3 py-3 min-w-[150px]">Specific Gravity</th>
                                                <th className="px-3 py-3 min-w-[150px]">Free Swell Index %</th>
                                                <th className="px-3 py-3 w-[50px]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {levelLogs.map((result, logIndex) => (
                                                <tr key={logIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                    <td className="px-2 py-2"><Input value={result.depth} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'depth', e.target.value)} className="h-8" placeholder="Depth" /></td>
                                                    <td className="px-2 py-2"><Input value={result.bulkDensity} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'bulkDensity', e.target.value)} className="h-8" placeholder="Bulk Density" /></td>
                                                    <td className="px-2 py-2"><Input value={result.moistureContent} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'moistureContent', e.target.value)} className="h-8" placeholder="Moisture Content" /></td>
                                                    <td className="px-2 py-2">
                                                        <Input value={result.grainSizeDistribution.gravel} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.gravel', e.target.value)} className="h-8 mb-1" placeholder="Gravel (%)" />
                                                        <Input value={result.grainSizeDistribution.sand} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.sand', e.target.value)} className="h-8 mb-1" placeholder="Sand (%)" />
                                                        <Input value={result.grainSizeDistribution.siltAndClay} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.siltAndClay', e.target.value)} className="h-8" placeholder="Silt and Clay (%)" />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input value={result.atterbergLimits.liquidLimit} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.liquidLimit', e.target.value)} className="h-8 mb-1" placeholder="Liquid Limit (%)" />
                                                        <Input value={result.atterbergLimits.plasticLimit} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.plasticLimit', e.target.value)} className="h-8 mb-1" placeholder="Plastic Limit (%)" />
                                                        <Input value={result.atterbergLimits.plasticityIndex} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.plasticityIndex', e.target.value)} className="h-8" placeholder="Plasticity Index (%)" />
                                                    </td>
                                                    <td className="px-2 py-2"><Input value={result.specificGravity} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'specificGravity', e.target.value)} className="h-8" placeholder="Specific Gravity" /></td>
                                                    <td className="px-2 py-2"><Input value={result.freeSwellIndex} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'freeSwellIndex', e.target.value)} className="h-8" placeholder="FSI" /></td>
                                                    <td className="px-2 py-2 text-center">
                                                        {levelLogs.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeLabTestLog(levelIndex, logIndex)}
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addLabTestLog(levelIndex)}
                                    className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Lab Test Reading
                                </Button>
                            </div>
                        ))}
                        <div className="flex justify-center pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addLabTestLevel}
                                className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Lab Test Level
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Chemical Analysis ──────────────────────────────── */}
                <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Chemical Analysis</h3>
                    <div className="space-y-8">
                        {formData.chemicalAnalysis.map((item, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-semibold text-gray-700">Chemical Analysis - Level {index + 1}</h4>
                                    {formData.chemicalAnalysis.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeChemicalAnalysisLevel(index)}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                        </Button>
                                    )}
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="space-y-2">
                                            <Label>pH Value</Label>
                                            <Input
                                                value={item.phValue}
                                                onChange={(e) => handleChemicalAnalysisChange(index, 'phValue', e.target.value)}
                                                placeholder="pH Value"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sulphates (%)</Label>
                                            <Input
                                                value={item.sulphates}
                                                onChange={(e) => handleChemicalAnalysisChange(index, 'sulphates', e.target.value)}
                                                placeholder="Sulphates (%)"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Chlorides (%)</Label>
                                            <Input
                                                value={item.chlorides}
                                                onChange={(e) => handleChemicalAnalysisChange(index, 'chlorides', e.target.value)}
                                                placeholder="Chlorides (%)"
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 block mb-2">Additional Keys</Label>
                                        {item.additionalKeys.map((keyItem, keyIndex) => (
                                            <div key={keyIndex} className="grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-5">
                                                    <Input
                                                        placeholder="Key"
                                                        value={keyItem.key}
                                                        onChange={(e) => handleChemicalAnalysisKeyChange(index, keyIndex, 'key', e.target.value)}
                                                        className="bg-gray-50 h-9"
                                                    />
                                                </div>
                                                <div className="col-span-6">
                                                    <Input
                                                        placeholder="Value"
                                                        value={keyItem.value}
                                                        onChange={(e) => handleChemicalAnalysisKeyChange(index, keyIndex, 'value', e.target.value)}
                                                        className="bg-gray-50 h-9"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-center">
                                                    {item.additionalKeys.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeChemicalAnalysisKey(index, keyIndex)}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addChemicalAnalysisKey(index)}
                                            className="mt-2 text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white h-8 text-xs"
                                        >
                                            <Plus className="w-3 h-3 mr-2" /> Add Key
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-center pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addChemicalAnalysisLevel}
                                className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Chemical Analysis Level
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Section 3: Grain Size Analysis ────────────────────────────── */}
                <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Grain Size Analysis</h3>
                    <div className="space-y-8">
                        {formData.grainSizeAnalysis.map((levelRows, levelIndex) => (
                            <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-semibold text-gray-700">Grain Size Analysis - Level {levelIndex + 1}</h4>
                                    {formData.grainSizeAnalysis.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeGrainSizeAnalysisLevel(levelIndex)}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                    <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                            <tr>
                                                <th className="px-3 py-3 w-[100px]">Depth (m)</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 1</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 2</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 3</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 4</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 5</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 6</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 7</th>
                                                <th className="px-3 py-3 min-w-[100px]">Sieve 8</th>
                                                <th className="px-3 py-3 w-[50px]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {levelRows.map((item, rowIndex) => (
                                                <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                    <td className="px-2 py-2"><Input value={item.depth} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'depth', e.target.value)} className="h-8" placeholder="Depth" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve1} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve1', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve2} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve2', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve3} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve3', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve4} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve4', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve5} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve5', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve6} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve6', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve7} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve7', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2"><Input value={item.sieve8} onChange={(e) => handleGrainSizeAnalysisChange(levelIndex, rowIndex, 'sieve8', e.target.value)} className="h-8" placeholder="Value" /></td>
                                                    <td className="px-2 py-2 text-center">
                                                        {levelRows.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeGrainSizeAnalysisRow(levelIndex, rowIndex)}
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addGrainSizeAnalysisRow(levelIndex)}
                                    className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Grain Size Analysis Row
                                </Button>
                            </div>
                        ))}

                        <div className="flex justify-center pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addGrainSizeAnalysisLevel}
                                className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Grain Size Analysis Level
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TestingDetailsForm;
