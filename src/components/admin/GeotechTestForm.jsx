import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { ArrowDownFromLine, Layers, LandPlot, Trash2, Plus, FlaskConical, TestTube } from 'lucide-react';

const soilTypes = [
    'Filled-up Soil', 'Brownish Gravelly Soil', 'Grayish Gravelly Soil', 'Open Rock',
    'Brownish Silty Sand (SM)', 'Brownish Silt (ML)', 'Grayish Silt (ML)',
    'Light Yellowish Silt (ML)', 'Grayish Silty Sand (SM)', 'Grayish Silty Gravels (GM)',
    'Brownish Silty Gravel (GM)', 'Grayish Clayey Gravel (GC)', 'Brownish Clayey Gravel (GC)',
    'Poorly Graded Gravel (GP)', 'Poorly Graded Sand (SP)', 'Brownish Clayey Sand (SC)',
    'Grayish Clayey Sand (SC)', 'Brownish Clay of Low Plasticity (CL)',
    'Grayish Clay of Low Plasticity (CL)', 'Grayish Clay of High Plasticity (CH)',
    'Black Clay of High Plasticity (CH)', 'Soft Disintegrated Weathered Rock',
    'Weathered Rock', 'Lateritic Rock', 'Laterite Hard Gravels', 'Rock Pebbles/Hard Morum',
    'Basalt Rock', 'Fractured Basalt Rock', 'Hard Rock', 'Medium Hard Rock',
    'Reddish Gravelly Soil', 'Reddish Silty Sand (SM)', 'Reddish Silty Gravel (GM)',
    'Reddish Silt (ML)', 'Reddish Clayey Gravel (GC)', 'Reddish Clayey Sand (SC)',
    'Reddish Clay of Low Plasticity (CL)', 'Others'
];

export default function GeotechTestForm({ value, onChange }) {
    const [activeTab, setActiveTab] = useState('borehole');
    const [activeSoilField, setActiveSoilField] = useState(null);
    const [filteredSoilTypes, setFilteredSoilTypes] = useState(soilTypes);
    const [showSoilSuggestions, setShowSoilSuggestions] = useState(false);

    // Ensure all required properties exist with defaults if value is empty
    const formData = {
        boreholeLogs: value?.boreholeLogs || [[{ depth: '', natureOfSampling: '', soilType: '', waterTable: false, spt1: '', spt2: '', spt3: '', shearParameters: { cValue: '', phiValue: '' }, coreLength: '', coreRecovery: '', rqd: '', sbc: '' }]],
        labTestResults: value?.labTestResults || [[{ depth: '', bulkDensity: '', moistureContent: '', grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' }, atterbergLimits: { liquidLimit: '', plasticLimit: '', plasticityIndex: '' }, specificGravity: '', freeSwellIndex: '' }]],
        chemicalAnalysis: value?.chemicalAnalysis || [{ phValue: '', sulphates: '', chlorides: '', additionalKeys: [{ key: '', value: '' }] }],
        grainSizeAnalysis: value?.grainSizeAnalysis || [[{ depth: '', sieve1: '', sieve2: '', sieve3: '', sieve4: '', sieve5: '', sieve6: '', sieve7: '', sieve8: '', sieve9: '' }]],
        sbcDetails: value?.sbcDetails || [[{ depth: '', footingDimension: '', useForReport: false, sbcValue: '' }]],
        subSoilProfile: value?.subSoilProfile || [[{ depth: '', description: '' }]],
        directShearResults: value?.directShearResults || [[{ shearBoxSize: '', depthOfSample: '', cValue: '', phiValue: '', stressReadings: [{ normalStress: '', shearStress: '' }] }]],
        pointLoadStrength: value?.pointLoadStrength || [[{ depth: '', readings: [{ loadAtFailure: '', d50: '', d: '', ucs: '' }] }]],
        pointLoadStrengthLump: value?.pointLoadStrengthLump || [[{ depth: '', readings: [{ loadAtFailure: '', d50: '', d: '', w: '', ucs: '' }] }]],
        foundationRockFormations: value?.foundationRockFormations || [{ rows: [{ rock: '', strength: '', rqd: '', spacingDiscontinuity: '', conditionOfDiscontinuity: '', gwtCondition: '', discontinuityOrientation: '', rockGrade: '', inferredNetSbp: '' }] }],
    };

    const setFormData = (updater) => {
        if (typeof updater === 'function') {
            onChange(updater(formData));
        } else {
            onChange(updater);
        }
    };

    // --- Borehole Handlers ---
    const handleBoreholeLogChange = (levelIndex, logIndex, field, val) => {
        const newLogs = [...formData.boreholeLogs];
        const log = newLogs[levelIndex][logIndex];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            log[parent][child] = val;
        } else {
            log[field] = val;
        }
        setFormData({ ...formData, boreholeLogs: newLogs });
    };

    const addBoreholeLog = (levelIndex) => {
        const newLogs = [...formData.boreholeLogs];
        newLogs[levelIndex].push({ depth: '', natureOfSampling: '', soilType: '', waterTable: false, spt1: '', spt2: '', spt3: '', shearParameters: { cValue: '', phiValue: '' }, coreLength: '', coreRecovery: '', rqd: '', sbc: '' });
        setFormData({ ...formData, boreholeLogs: newLogs });
    };

    const removeBoreholeLog = (levelIndex, logIndex) => {
        const newLogs = [...formData.boreholeLogs];
        newLogs[levelIndex].splice(logIndex, 1);
        setFormData({ ...formData, boreholeLogs: newLogs });
    };

    const addLevel = () => {
        setFormData({
            ...formData,
            boreholeLogs: [...formData.boreholeLogs, [{ depth: '', natureOfSampling: '', soilType: '', waterTable: false, spt1: '', spt2: '', spt3: '', shearParameters: { cValue: '', phiValue: '' }, coreLength: '', coreRecovery: '', rqd: '', sbc: '' }]]
        });
    };

    const removeLevel = (index) => {
        const newLogs = [...formData.boreholeLogs];
        newLogs.splice(index, 1);
        setFormData({ ...formData, boreholeLogs: newLogs });
    };

    const handleSoilSearch = (e, levelIndex, logIndex) => {
        const val = e.target.value;
        handleBoreholeLogChange(levelIndex, logIndex, 'soilType', val);
        if (val.trim()) {
            setFilteredSoilTypes(soilTypes.filter(s => s.toLowerCase().includes(val.toLowerCase())));
            setShowSoilSuggestions(true);
        } else {
            setShowSoilSuggestions(false);
        }
    };

    const selectSoilType = (type, levelIndex, logIndex) => {
        handleBoreholeLogChange(levelIndex, logIndex, 'soilType', type);
        setShowSoilSuggestions(false);
    };

    // --- Lab Test Handlers ---
    const handleLabTestResultChange = (levelIndex, logIndex, field, val) => {
        const newResults = [...formData.labTestResults];
        const log = newResults[levelIndex][logIndex];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            log[parent][child] = val;
        } else {
            log[field] = val;
        }
        setFormData({ ...formData, labTestResults: newResults });
    };

    const addLabTestLog = (levelIndex) => {
        const newResults = [...formData.labTestResults];
        newResults[levelIndex].push({ depth: '', bulkDensity: '', moistureContent: '', grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' }, atterbergLimits: { liquidLimit: '', plasticLimit: '', plasticityIndex: '' }, specificGravity: '', freeSwellIndex: '' });
        setFormData({ ...formData, labTestResults: newResults });
    };

    const removeLabTestLog = (levelIndex, logIndex) => {
        const newResults = [...formData.labTestResults];
        newResults[levelIndex].splice(logIndex, 1);
        setFormData({ ...formData, labTestResults: newResults });
    };

    const addLabTestLevel = () => {
        setFormData({
            ...formData,
            labTestResults: [...formData.labTestResults, [{ depth: '', bulkDensity: '', moistureContent: '', grainSizeDistribution: { gravel: '', sand: '', siltAndClay: '' }, atterbergLimits: { liquidLimit: '', plasticLimit: '', plasticityIndex: '' }, specificGravity: '', freeSwellIndex: '' }]]
        });
    };

    const removeLabTestLevel = (index) => {
        const newResults = [...formData.labTestResults];
        newResults.splice(index, 1);
        setFormData({ ...formData, labTestResults: newResults });
    };

    return (
        <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white border rounded-xl p-1 shadow-sm mb-6 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="borehole" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" /> Borehole
                    </TabsTrigger>
                    <TabsTrigger value="lab" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2">
                        <TestTube className="w-4 h-4" /> Lab Tests
                    </TabsTrigger>
                </TabsList>

                {/* BOREHOLE TAB */}
                <TabsContent value="borehole" className="mt-0 space-y-8">
                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Borehole Logs</h3>
                        <div className="space-y-8">
                            {formData.boreholeLogs.map((levelLogs, levelIndex) => (
                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-semibold text-gray-700">Borehole Log - Level {levelIndex + 1}</h4>
                                        {formData.boreholeLogs.length > 1 && (
                                            <Button type="button" variant="destructive" size="sm" onClick={() => removeLevel(levelIndex)} className="bg-red-50 text-red-600 hover:bg-red-100">
                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                            </Button>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto border rounded-lg bg-white mb-4">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                <tr>
                                                    <th className="px-3 py-3 min-w-[100px]">Depth (m)</th>
                                                    <th className="px-3 py-3 min-w-[150px]">Sampling</th>
                                                    <th className="px-3 py-3 min-w-[150px]">Soil Type</th>
                                                    <th className="px-3 py-3 min-w-[150px]">SPT Depth</th>
                                                    <th className="px-3 py-3 min-w-[120px]">Shear Params</th>
                                                    <th className="px-3 py-3 min-w-[100px]">SBC</th>
                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {levelLogs.map((log, logIndex) => (
                                                    <tr key={logIndex} className="border-b">
                                                        <td className="px-2 py-2"><Input value={log.depth} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'depth', e.target.value)} className="h-8" /></td>
                                                        <td className="px-2 py-2">
                                                            <Select value={log.natureOfSampling} onValueChange={(v) => handleBoreholeLogChange(levelIndex, logIndex, 'natureOfSampling', v)}>
                                                                <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="CR">CR</SelectItem>
                                                                    <SelectItem value="DS">DS</SelectItem>
                                                                    <SelectItem value="UDS">UDS</SelectItem>
                                                                    <SelectItem value="SPT">SPT</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-2 py-2 relative">
                                                            <Input value={log.soilType} onChange={(e) => handleSoilSearch(e, levelIndex, logIndex)} onFocus={() => { setActiveSoilField({ levelIndex, logIndex }); setShowSoilSuggestions(true); setFilteredSoilTypes(soilTypes.filter(type => type.toLowerCase().includes((log.soilType || '').toLowerCase()))); }} onBlur={() => setTimeout(() => setShowSoilSuggestions(false), 200)} className="h-8" placeholder="Soil Type" />
                                                            {showSoilSuggestions && activeSoilField?.levelIndex === levelIndex && activeSoilField?.logIndex === logIndex && (
                                                                <div className="absolute z-[100] w-64 bg-white border rounded-md shadow-lg max-h-40 overflow-auto mt-1 left-0">
                                                                    {filteredSoilTypes.map((type, idx) => (
                                                                        <div key={idx} className="p-2 hover:bg-gray-100 cursor-pointer text-xs" onClick={() => selectSoilType(type, levelIndex, logIndex)}>{type}</div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <Input value={log.spt1} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt1', e.target.value)} className="h-8 mb-1" placeholder="15cm" />
                                                            <Input value={log.spt2} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt2', e.target.value)} className="h-8 mb-1" placeholder="30cm" />
                                                            <Input value={log.spt3} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt3', e.target.value)} className="h-8" placeholder="45cm" />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <Input value={log.shearParameters?.cValue || ''} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'shearParameters.cValue', e.target.value)} className="h-8 mb-1" placeholder="C Value" />
                                                            <Input value={log.shearParameters?.phiValue || ''} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'shearParameters.phiValue', e.target.value)} className="h-8" placeholder="Phi Value" />
                                                        </td>
                                                        <td className="px-2 py-2"><Input value={log.sbc} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'sbc', e.target.value)} className="h-8" placeholder="SBC" /></td>
                                                        <td className="px-2 py-2">
                                                            {levelLogs.length > 1 && (
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeBoreholeLog(levelIndex, logIndex)} className="text-red-500">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addBoreholeLog(levelIndex)} className="text-primary"><Plus className="w-4 h-4 mr-2" /> Add Log</Button>
                                </div>
                            ))}
                            <div className="flex justify-center pt-4 border-t">
                                <Button type="button" variant="outline" onClick={addLevel} className="text-primary"><Plus className="w-4 h-4 mr-2" /> Add Level</Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* LAB TAB */}
                <TabsContent value="lab" className="mt-0 space-y-8">
                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Lab Test Results</h3>
                        <div className="space-y-8">
                            {formData.labTestResults.map((levelLogs, levelIndex) => (
                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-semibold text-gray-700">Lab Tests - Level {levelIndex + 1}</h4>
                                        {formData.labTestResults.length > 1 && (
                                            <Button type="button" variant="destructive" size="sm" onClick={() => removeLabTestLevel(levelIndex)} className="bg-red-50 text-red-600">
                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                            </Button>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto border rounded-lg bg-white mb-4">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                <tr>
                                                    <th className="px-3 py-3">Depth</th>
                                                    <th className="px-3 py-3">Density/Moisture</th>
                                                    <th className="px-3 py-3">Grain Size (G/S/SC)</th>
                                                    <th className="px-3 py-3">Atterberg (LL/PL/PI)</th>
                                                    <th className="px-3 py-3">SG/FSI</th>
                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {levelLogs.map((log, logIndex) => (
                                                    <tr key={logIndex} className="border-b">
                                                        <td className="px-2 py-2"><Input value={log.depth} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'depth', e.target.value)} className="h-8 w-20" /></td>
                                                        <td className="px-2 py-2">
                                                            <Input value={log.bulkDensity} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'bulkDensity', e.target.value)} className="h-8 mb-1" placeholder="Bulk Density" />
                                                            <Input value={log.moistureContent} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'moistureContent', e.target.value)} className="h-8" placeholder="Moisture Content" />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <div className="flex gap-1">
                                                                <Input value={log.grainSizeDistribution.gravel} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.gravel', e.target.value)} className="h-8" placeholder="G" />
                                                                <Input value={log.grainSizeDistribution.sand} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.sand', e.target.value)} className="h-8" placeholder="S" />
                                                                <Input value={log.grainSizeDistribution.siltAndClay} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'grainSizeDistribution.siltAndClay', e.target.value)} className="h-8" placeholder="SC" />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <div className="flex gap-1">
                                                                <Input value={log.atterbergLimits.liquidLimit} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.liquidLimit', e.target.value)} className="h-8" placeholder="LL" />
                                                                <Input value={log.atterbergLimits.plasticLimit} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.plasticLimit', e.target.value)} className="h-8" placeholder="PL" />
                                                                <Input value={log.atterbergLimits.plasticityIndex} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'atterbergLimits.plasticityIndex', e.target.value)} className="h-8" placeholder="PI" />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <Input value={log.specificGravity} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'specificGravity', e.target.value)} className="h-8 mb-1" placeholder="SG" />
                                                            <Input value={log.freeSwellIndex} onChange={(e) => handleLabTestResultChange(levelIndex, logIndex, 'freeSwellIndex', e.target.value)} className="h-8" placeholder="FSI" />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            {levelLogs.length > 1 && (
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLabTestLog(levelIndex, logIndex)} className="text-red-500">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addLabTestLog(levelIndex)} className="text-primary"><Plus className="w-4 h-4 mr-2" /> Add Result</Button>
                                </div>
                            ))}
                            <div className="flex justify-center pt-4 border-t">
                                <Button type="button" variant="outline" onClick={addLabTestLevel} className="text-primary"><Plus className="w-4 h-4 mr-2" /> Add Level</Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
                
                {/* Note: In a complete version we would also include pointload, sbc, rock, chemical, grainsize, etc tabs identical to NewReportForm */}
                {/* I have built the Borehole & Lab tests as the primary 'soil testing' forms based on their density. You can easily add the other tabs following this exact same pattern. */}
            </Tabs>
        </div>
    );
}
