
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, ListTree, Save, Plus, Trash2, LandPlot, FileText, TestTube, MapPin, ClipboardList, FileCheck, ArrowDownFromLine, Layers, Lightbulb, Eye, Zap, X, Loader2, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ReportPreview from '@/components/ReportPreview';
import reportTemplateHtml from '@/templates/report-template.html?raw'
import { useAuth } from '@/contexts/AuthContext';
import { dynamoGenericApi } from '@/lib/dynamoGenericApi';
import { sendTelegramNotification } from '@/lib/notifier';
import { getSiteContent, DB_TYPES } from '@/config';


const soilTypes = [
    'Filled-up Soil',
    'Brownish Gravelly Soil',
    'Grayish Gravelly Soil',
    'Open Rock',
    'Brownish Silty Sand (SM)',
    'Brownish Silt (ML)',
    'Grayish Silt (ML)',
    'Light Yellowish Silt (ML)',
    'Grayish Silty Sand (SM)',
    'Grayish Silty Gravels (GM)',
    'Brownish Silty Gravel (GM)',
    'Grayish Clayey Gravel (GC)',
    'Brownish Clayey Gravel (GC)',
    'Poorly Graded Gravel (GP)',
    'Poorly Graded Sand (SP)',
    'Brownish Clayey Sand (SC)',
    'Grayish Clayey Sand (SC)',
    'Brownish Clay of Low Plasticity (CL)',
    'Grayish Clay of Low Plasticity (CL)',
    'Grayish Clay of High Plasticity (CH)',
    'Black Clay of High Plasticity (CH)',
    'Soft Disintegrated Weathered Rock',
    'Weathered Rock',
    'Lateritic Rock',
    'Laterite Hard Gravels',
    'Rock Pebbles/Hard Morum',
    'Basalt Rock',
    'Fractured Basalt Rock',
    'Hard Rock',
    'Medium Hard Rock',
    'Reddish Gravelly Soil',
    'Reddish Silty Sand (SM)',
    'Reddish Silty Gravel (GM)',
    'Reddish Silt (ML)',
    'Reddish Clayey Gravel (GC)',
    'Reddish Clayey Sand (SC)',
    'Reddish Clay of Low Plasticity (CL)',
    'Others'
];


function fillTemplate(template, data) {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
        return data[key] ?? '';
    });
}

const NewReportForm = ({ editReport, onCancel, onSuccess }) => {
    const siteName = getSiteContent().global?.siteName || "Easy Billing";
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [activeSoilField, setActiveSoilField] = useState(null);
    const [filteredSoilTypes, setFilteredSoilTypes] = useState(soilTypes);
    const [showSoilSuggestions, setShowSoilSuggestions] = useState(false);
    const [jobOrders, setJobOrders] = useState([]);
    const [filteredJobOrders, setFilteredJobOrders] = useState([]);
    const [showJobOrderSuggestions, setShowJobOrderSuggestions] = useState(false);
    const [saveConfirmation, setSaveConfirmation] = useState({ isOpen: false, isGenerating: false });

    useEffect(() => {
        const fetchClients = async () => {
            if (!idToken) return;
            try {
                const data = await dynamoGenericApi.listByType(DB_TYPES.CLIENT, idToken);
                if (data) setClients(data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };
        if (idToken) {
            fetchClients();
        }
    }, [idToken]);

    useEffect(() => {
        const fetchJobOrders = async () => {
            if (!idToken) return;
            try {
                const data = await dynamoGenericApi.listByType(DB_TYPES.JOB, idToken);
                // Map to match expected structure jo.clients?.client_name
                const mappedData = data.map(jo => ({
                    ...jo,
                    clients: {
                        client_name: jo.client_name,
                        client_address: jo.client_address // This might be missing in material_inward, but let's assume it's there or handled
                    }
                }));
                if (data) setJobOrders(mappedData);
            } catch (error) {
                console.error('Error fetching job orders:', error);
            }
        };
        if (idToken) {
            fetchJobOrders();
        }
    }, [idToken]);

    // Load report data from props if editing
    useEffect(() => {
        if (editReport) {
            const reportData = editReport.content || editReport;
            // Merge with defaults so that any fields added after this report was saved
            // (e.g. grainSizeAnalysis, sbcDetails, subSoilProfile, directShearResults, etc.)
            // fall back to their default values rather than being undefined and crashing .map()
            const defaults = getInitialFormData();
            setFormData({ ...defaults, ...reportData, id: editReport.id });
            toast({
                title: "Report Loaded",
                description: `Editing report: ${reportData.projectDetails || reportData.reportId}`,
            });
        }
    }, [editReport, toast]);

    const handleClientSearch = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, client: value }));

        if (value.trim()) {
            const filtered = clients.filter(c =>
                c.client_name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredClients(filtered);
            setShowClientSuggestions(true);
        } else {
            setShowClientSuggestions(false);
        }
    };

    const selectClient = (client) => {
        setFormData(prev => ({
            ...prev,
            client: client.client_name,
            clientAddress: client.client_address || prev.clientAddress
        }));
        setShowClientSuggestions(false);
    };

    const handleJobOrderSearch = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, jobOrderNumber: value }));

        if (value.trim()) {
            const filtered = jobOrders.filter(jo =>
                jo.job_order_no?.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredJobOrders(filtered);
            setShowJobOrderSuggestions(true);
        } else {
            setShowJobOrderSuggestions(false);
        }
    };

    const selectJobOrder = (jo) => {
        setFormData(prev => ({
            ...prev,
            jobOrderNumber: jo.job_order_no,
            client: jo.clients?.client_name || prev.client,
            clientAddress: jo.clients?.client_address || prev.clientAddress
        }));
        setShowJobOrderSuggestions(false);
    };

    // Get initial form data from localStorage or use defaults
    const getInitialFormData = () => {
        const STORAGE_KEY = 'newReportFormData';
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved form data:', e);
            }
        }

        // Return default form data
        return {
            projectType: '',
            reportId: '',
            projectDetails: 'GBT 40m',
            client: '',
            clientImage: '',
            clientAddress: '',
            latitude: '',
            longitude: '',
            siteId: '',
            anchorId: '',
            siteName: '',
            siteAddress: '',
            surveyDate: '',
            groundWaterTable: '',
            isCodes: [
                { key: 'Natural water content', value: 'IS:2720 - (Part 2) - 1973' },
                { key: 'Grain size analysis', value: 'IS:2720 - (Part 4) - 1985' },
                { key: 'Atterberg Limits', value: 'IS:2720 - (Part 5) - 1985' },
                { key: 'Field density', value: 'IS:2720 - (Part 10) - 1993' },
                { key: 'Specific Gravity', value: 'IS:2720 - (Part 3) - 1980' },
                { key: 'Standard penetration test (SPT)', value: 'IS:2131 - 1981' },
                { key: 'Shear strength parameters', value: 'IS:2720 - (Part 13) - 1986' },
                { key: 'Free Swell Index', value: 'IS:2720 - (Part 40) - 1977' },
                { key: 'Chemical Analysis', value: 'IS:2720 - (Part 26) - 1987 & (Part 27) - 1977' },
                { key: 'Foundation design on rock', value: 'IS:12070 - 1987' },
                { key: 'Breaking Capacity of Shallow Foundation', value: 'IS:6403 - 1981' },
                { key: 'Settlement of Foundation', value: 'IS:8009 - 1976' },
                { key: 'Soil Classification', value: 'IS:1498 - 1970' },
                { key: 'Point Load Index of Rock', value: 'IS:8764 - 1998' },
                { key: 'Qualitative Classification System of Rock Mass', value: 'IS:13365 - (Part 1) - 1998' }
            ],
            surveyReport: [
                { key: 'Weather condition', value: '' },
                { key: 'Site Dimension', value: '' },
                { key: 'Ground or seepage water', value: '' },
                { key: 'Site to main road distance', value: '' },
                { key: 'Terrain Details (Agriculture/Hilly/Plain)', value: '' },
                { key: 'Proper road access availability', value: '' },
                { key: 'Electric lines/Pole distance', value: '' },
                { key: 'Transformers', value: '' },
                { key: 'High tension line', value: '' },
                { key: 'Schools, hospital, residential, etc.', value: '' },
                { key: 'Mobile towers', value: '' },
                { key: 'Railway track', value: '' },
                { key: 'Water bodies', value: '' },
                { key: 'Well', value: '' },
                { key: 'Existing or under-construction building', value: '' },
                { key: 'Tree cutting', value: '' },
                { key: 'Site levels', value: '' }
            ],
            surveyReportNote: '',
            includeSurveyReportNote: false,
            conclusions: [
                { value: 'SPT values indicate that the soil strata up to a termination depth is [VALUE].' },
                { value: 'The [VALUE] present in the soil strata is found to be [VALUE] in nature.' },
                { value: 'Ground water table [VALUE] at the time of investigation in the bore hole.' }
            ],
            depthOfFoundation: '',
            recommendationTypes: {
                rock: false,
                soil: true
            },
            sitePhotos: [],
            boreholeLogs: [
                [{
                    depth: '',
                    natureOfSampling: '',
                    soilType: '',
                    waterTable: false,
                    spt1: '',
                    spt2: '',
                    spt3: '',
                    shearParameters: {
                        cValue: '',
                        phiValue: ''
                    },
                    coreLength: '',
                    coreRecovery: '',
                    rqd: '',
                    sbc: ''
                }]
            ],
            labTestResults: [
                [{
                    depth: '',
                    bulkDensity: '',
                    moistureContent: '',
                    grainSizeDistribution: {
                        gravel: '',
                        sand: '',
                        siltAndClay: ''
                    },
                    atterbergLimits: {
                        liquidLimit: '',
                        plasticLimit: '',
                        plasticityIndex: ''
                    },
                    specificGravity: '',
                    freeSwellIndex: ''
                }]
            ],
            chemicalAnalysis: [
                {
                    phValue: '',
                    sulphates: '',
                    chlorides: '',
                    additionalKeys: [
                        { key: '', value: '' }
                    ]
                }
            ],
            grainSizeAnalysis: [
                [
                    {
                        depth: '',
                        sieve1: '',
                        sieve2: '',
                        sieve3: '',
                        sieve4: '',
                        sieve5: '',
                        sieve6: '',
                        sieve7: '',
                        sieve8: '',
                        sieve9: ''
                    }
                ]
            ],
            sbcDetails: [
                [
                    {
                        depth: '',
                        footingDimension: '',
                        useForReport: false,
                        sbcValue: ''
                    }
                ]
            ],
            subSoilProfile: [
                [
                    {
                        depth: '',
                        description: ''
                    }
                ]
            ],

            directShearResults: [
                [
                    {
                        shearBoxSize: '',
                        depthOfSample: '',
                        cValue: '',
                        phiValue: '',
                        stressReadings: [
                            { normalStress: '', shearStress: '' }
                        ]
                    }
                ]
            ],
            pointLoadStrength: [
                [
                    {
                        depth: '',
                        readings: [
                            {
                                loadAtFailure: '',
                                d50: '',
                                d: '',
                                ucs: ''
                            }
                        ]
                    }
                ]
            ],
            pointLoadStrengthLump: [
                [
                    {
                        depth: '',
                        readings: [
                            {
                                loadAtFailure: '',
                                d50: '',
                                d: '',
                                w: '',
                                ucs: ''
                            }
                        ]
                    }
                ]
            ],
            pointLoadStrengthLump: [
                [
                    {
                        depth: '',
                        readings: [
                            {
                                loadAtFailure: '',
                                d50: '',
                                d: '',
                                w: '',
                                ucs: ''
                            }
                        ]
                    }
                ]
            ],
            foundationRockFormations: [
                {
                    rows: [
                        {
                            rock: '',
                            strength: '',
                            rqd: '',
                            spacingDiscontinuity: '',
                            conditionOfDiscontinuity: '',
                            gwtCondition: '',
                            discontinuityOrientation: '',
                            rockGrade: '',
                            inferredNetSbp: ''
                        }
                    ]
                }
            ],
            recommendations: '',
            reportCreatedOn: new Date().toISOString().split('T')[0]
        };
    };

    const handleClientImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    clientImage: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const [formData, setFormData] = useState(getInitialFormData);
    const [sitePhotoPreview, setSitePhotoPreview] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [errors, setErrors] = useState({});

    // Auto-save formData to localStorage whenever it changes
    useEffect(() => {
        const STORAGE_KEY = 'newReportFormData';
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        } catch (e) {
            console.error('Failed to save form data:', e);
        }
    }, [formData]);

    // Generate random sample data
    const generateRandomSampleData = () => {
        const randomProjectTypes = ['Commercial Building (G+4)', 'Residential Apartment (Stilt+10)', 'Industrial Shed', 'Bridge Abutment', 'Overhead Water Tank'];
        const randomClients = ['Prestige Constructions', 'Brigade Group', 'Sobha Ltd', 'Total Environment', 'Adani Realty'];

        const numBH = 2 + Math.floor(Math.random() * 2); // 2 or 3 boreholes

        const data = {
            ...getInitialFormData(), // Start with defaults
            projectType: randomProjectTypes[Math.floor(Math.random() * randomProjectTypes.length)],
            reportId: `EDGE2/GEO/${new Date().getFullYear()}/${100 + Math.floor(Math.random() * 900)}`,
            projectDetails: 'GBT 40m - Multi-storey structure',
            client: randomClients[Math.floor(Math.random() * randomClients.length)],
            clientAddress: '123, MG Road, Residency Area, Bengaluru - 560001',
            latitude: (12.9 + Math.random() * 0.1).toFixed(6),
            longitude: (77.5 + Math.random() * 0.1).toFixed(6),
            siteId: `SITE-${1000 + Math.floor(Math.random() * 9000)}`,
            anchorId: `ANC-${Math.floor(Math.random() * 1000)}`,
            siteName: `Project ${siteName}`,
            siteAddress: 'Sy No. 45/2, Ullal Village, Yeshwanthpur Hobli, Bengaluru North',
            surveyDate: new Date().toISOString().split('T')[0],
            groundWaterTable: 'Not Encountered',
            recommendations: 'Based on the investigation, isolated foundation is recommended. Protective drainage should be provided. Fill material should be well compacted.',
            depthOfFoundation: '1.5',
        };

        // Populate Survey Report
        const surveyAnswers = ['Cloudy', 'Plain', 'Yes', 'Available', '20m', 'None', 'Plain'];
        data.surveyReport = data.surveyReport.map((item, idx) => ({
            ...item,
            value: surveyAnswers[idx % surveyAnswers.length]
        }));

        // Populate Borehole Logs
        data.boreholeLogs = Array.from({ length: numBH }, () =>
            Array.from({ length: 4 }, (_, i) => ({
                depth: (i * 1.5 + 1.5).toFixed(1),
                natureOfSampling: i % 2 === 0 ? 'Undisturbed' : 'Disturbed',
                soilType: soilTypes[Math.floor(Math.random() * (soilTypes.length - 1))],
                waterTable: Math.random() > 0.8,
                spt1: 10 + Math.floor(Math.random() * 10),
                spt2: 15 + Math.floor(Math.random() * 10),
                spt3: 20 + Math.floor(Math.random() * 10),
                shearParameters: {
                    cValue: (0.1 + Math.random() * 0.5).toFixed(2),
                    phiValue: (15 + Math.random() * 15).toFixed(0)
                },
                coreLength: '',
                coreRecovery: '',
                rqd: '',
                sbc: (150 + Math.floor(Math.random() * 150)).toFixed(0)
            }))
        );

        // Populate Lab Test Results
        data.labTestResults = data.boreholeLogs.map(bh =>
            bh.map(log => ({
                depth: log.depth,
                bulkDensity: (1.6 + Math.random() * 0.4).toFixed(2),
                moistureContent: (10 + Math.random() * 20).toFixed(1),
                grainSizeDistribution: {
                    gravel: (5 + Math.random() * 15).toFixed(1),
                    sand: (20 + Math.random() * 40).toFixed(1),
                    siltAndClay: (30 + Math.random() * 30).toFixed(1)
                },
                atterbergLimits: {
                    liquidLimit: (30 + Math.random() * 20).toFixed(1),
                    plasticLimit: (15 + Math.random() * 10).toFixed(1),
                    plasticityIndex: (10 + Math.random() * 15).toFixed(1)
                },
                specificGravity: (2.6 + Math.random() * 0.1).toFixed(2),
                freeSwellIndex: (10 + Math.random() * 20).toFixed(0)
            }))
        );

        // Populate Grain Size Analysis (2 samples per BH)
        data.grainSizeAnalysis = data.boreholeLogs.map(bh =>
            bh.slice(0, 2).map(log => ({
                depth: log.depth,
                sieve1: (95 + Math.random() * 5).toFixed(1),
                sieve2: (85 + Math.random() * 10).toFixed(1),
                sieve3: (75 + Math.random() * 10).toFixed(1),
                sieve4: (65 + Math.random() * 10).toFixed(1),
                sieve5: (55 + Math.random() * 10).toFixed(1),
                sieve6: (45 + Math.random() * 10).toFixed(1),
                sieve7: (35 + Math.random() * 10).toFixed(1),
                sieve8: (25 + Math.random() * 10).toFixed(1),
                sieve9: (25 + Math.random() * 10).toFixed(1)
            }))
        );

        // Populate SBC Details
        data.sbcDetails = data.boreholeLogs.map(bh =>
            bh.map(log => ({
                depth: log.depth,
                footingDimension: '1.5m x 1.5m',
                useForReport: Math.random() > 0.5,
                sbcValue: log.sbc
            }))
        );

        // Populate Sub Soil Profile
        data.subSoilProfile = data.boreholeLogs.map(bh =>
            bh.slice(0, 2).map((log, i) => ({
                depth: i === 0 ? `0.0 to ${log.depth}` : `${bh[i - 1].depth} to ${log.depth}`,
                description: log.soilType
            }))
        );

        // Populate Direct Shear
        data.directShearResults = Array.from({ length: 2 }, (_, levelIndex) =>
            Array.from({ length: 2 }, (_, testIndex) => ({
                shearBoxSize: '6cm x 6cm',
                depthOfSample: (1.5 + levelIndex * 3.0 + testIndex * 1.5).toFixed(1),
                cValue: (0.15 + Math.random() * 0.1).toFixed(2),
                phiValue: (25 + Math.random() * 5).toFixed(0),
                stressReadings: [
                    { normalStress: '0.5', shearStress: (0.3 + Math.random() * 0.1).toFixed(2) },
                    { normalStress: '1.0', shearStress: (0.6 + Math.random() * 0.1).toFixed(2) },
                    { normalStress: '1.5', shearStress: (0.9 + Math.random() * 0.1).toFixed(2) }
                ]
            }))
        );

        // Populate Point Load Strength (Rock Core)
        data.pointLoadStrength = data.boreholeLogs.map(bh =>
            bh.slice(0, 2).map(log => ({
                depth: log.depth,
                readings: Array.from({ length: 3 }, () => ({
                    loadAtFailure: (4 + Math.random() * 5).toFixed(1),
                    d50: '50',
                    d: '50',
                    ucs: (40 + Math.random() * 50).toFixed(0)
                }))
            }))
        );

        // Populate Point Load Strength (Lump)
        data.pointLoadStrengthLump = data.boreholeLogs.map(bh =>
            bh.slice(0, 2).map(log => ({
                depth: log.depth,
                readings: Array.from({ length: 3 }, () => ({
                    loadAtFailure: (3 + Math.random() * 4).toFixed(1),
                    d50: '45',
                    d: '45',
                    w: '40',
                    ucs: (30 + Math.random() * 40).toFixed(0)
                }))
            }))
        );

        // Populate Foundation in Rock Formations
        data.foundationRockFormations = Array.from({ length: 2 }, () => ({
            rows: Array.from({ length: 3 }, (_, i) => ({
                rock: i === 0 ? 'Granite' : (i === 1 ? 'Gneiss' : 'Schist'),
                strength: i === 0 ? 'Hard' : 'Medium',
                rqd: (50 + Math.random() * 40).toFixed(0) + '%',
                spacingDiscontinuity: (100 + Math.random() * 200).toFixed(0) + 'mm',
                conditionOfDiscontinuity: 'Tight',
                gwtCondition: 'Dry',
                discontinuityOrientation: 'Horizontal',
                rockGrade: i === 0 ? 'Grade II' : 'Grade III',
                inferredNetSbp: (2000 + Math.random() * 1000).toFixed(0) + ' kN/m²'
            }))
        }));

        // Populate Chemical Analysis
        data.chemicalAnalysis = Array.from({ length: 2 }, () => ({
            phValue: (6.5 + Math.random() * 2.0).toFixed(1),
            sulphates: (20 + Math.random() * 30).toFixed(1),
            chlorides: (50 + Math.random() * 50).toFixed(1),
            additionalKeys: [
                { key: 'Organic Matter', value: (0.2 + Math.random() * 1.0).toFixed(1) + '%' },
                { key: 'Carbonates', value: (5 + Math.random() * 10).toFixed(0) + ' mg/l' },
                { key: 'Acidity', value: (1 + Math.random() * 2).toFixed(1) + ' ml' }
            ]
        }));

        return data;
    };

    const fillWithRandomData = () => {
        if (window.confirm('This will fill the form with random sample data and overwrite any current changes. Proceed?')) {
            const randomData = generateRandomSampleData();
            setFormData(randomData);
            setErrors({});
            toast({
                title: "Random Data Generated",
                description: "The form has been populated with a comprehensive sample dataset.",
                className: "bg-green-50 border-green-200 text-green-900",
            });
        }
    };

    // Clear form and localStorage
    const clearForm = () => {
        const STORAGE_KEY = 'newReportFormData';

        if (window.confirm('Are you sure you want to clear all form data? This action cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
            setFormData(getInitialFormData());
            setErrors({});
            setActiveTab('basic');
            toast({
                title: "Form Cleared",
                description: "All form data has been cleared successfully.",
                className: "bg-blue-50 border-blue-200 text-blue-900",
            });
        }
    };


    const validate = () => {
        const newErrors = {};

        // Basic Info Tab
        if (!formData.projectType || formData.projectType === '__other__') newErrors.projectType = { message: 'Project Type is required', tab: 'basic' };
        if (!formData.reportId) newErrors.reportId = { message: 'Report ID is required', tab: 'basic' };
        if (!formData.projectDetails) newErrors.projectDetails = { message: 'Project Details are required', tab: 'basic' };
        if (!formData.jobOrderNumber) newErrors.jobOrderNumber = { message: 'Job Order Number is required', tab: 'basic' };
        if (!formData.client) newErrors.client = { message: 'Client is required', tab: 'basic' };
        if (!formData.siteId) newErrors.siteId = { message: 'Site ID is required', tab: 'basic' };
        if (!formData.siteName) newErrors.siteName = { message: 'Site Name is required', tab: 'basic' };
        if (!formData.surveyDate) newErrors.surveyDate = { message: 'Survey Date is required', tab: 'basic' };

        // Survey Tab
        if (!formData.depthOfFoundation) newErrors.depthOfFoundation = { message: 'Depth of Foundation is required', tab: 'survey' };
        if (!formData.recommendationTypes.rock && !formData.recommendationTypes.soil) {
            newErrors.recommendationTypes = { message: 'At least one Recommendation Type is required', tab: 'survey' };
        }

        setErrors(newErrors);
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleIsCodeChange = (index, field, value) => {
        const newIsCodes = [...formData.isCodes];
        newIsCodes[index][field] = value;
        setFormData(prev => ({
            ...prev,
            isCodes: newIsCodes
        }));
    };

    const addIsCode = () => {
        setFormData(prev => ({
            ...prev,
            isCodes: [...prev.isCodes, { key: '', value: '' }]
        }));
    };

    const removeIsCode = (index) => {
        if (formData.isCodes.length > 1) {
            const newIsCodes = formData.isCodes.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                isCodes: newIsCodes
            }));
        }
    };

    const handleSurveyReportChange = (index, field, value) => {
        const newSurveyReport = [...formData.surveyReport];
        newSurveyReport[index][field] = value;
        setFormData(prev => ({
            ...prev,
            surveyReport: newSurveyReport
        }));
    };

    const addSurveyReport = () => {
        setFormData(prev => ({
            ...prev,
            surveyReport: [...prev.surveyReport, { key: '', value: '' }]
        }));
    };

    const removeSurveyReport = (index) => {
        if (formData.surveyReport.length > 1) {
            const newSurveyReport = formData.surveyReport.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                surveyReport: newSurveyReport
            }));
        }
    };

    const handleConclusionChange = (index, value) => {
        const newConclusions = [...formData.conclusions];
        newConclusions[index].value = value;
        setFormData(prev => ({
            ...prev,
            conclusions: newConclusions
        }));
    };

    const addConclusion = () => {
        setFormData(prev => ({
            ...prev,
            conclusions: [...prev.conclusions, { value: '' }]
        }));
    };

    const removeConclusion = (index) => {
        if (formData.conclusions.length > 1) {
            const newConclusions = formData.conclusions.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                conclusions: newConclusions
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSitePhotoPreview(reader.result);
                setFormData(prev => ({
                    ...prev,
                    sitePhotos: [...prev.sitePhotos, reader.result]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSitePhotosAdd = (e) => {
        const files = Array.from(e.target.files);
        if (files) {
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({
                        ...prev,
                        sitePhotos: [...prev.sitePhotos, reader.result]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeSitePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            sitePhotos: prev.sitePhotos.filter((_, i) => i !== index)
        }));
    };

    const handleBoreholeLogChange = (levelIndex, logIndex, field, value) => {
        const newLogs = [...formData.boreholeLogs];

        // Handle nested fields like 'shearParameters.cValue'
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newLogs[levelIndex][logIndex][parent] = {
                ...newLogs[levelIndex][logIndex][parent],
                [child]: value
            };
        } else {
            newLogs[levelIndex][logIndex][field] = value;
        }

        setFormData(prev => ({
            ...prev,
            boreholeLogs: newLogs
        }));
    };

    const handleSoilSearch = (e, levelIndex, logIndex) => {
        const value = e.target.value;
        handleBoreholeLogChange(levelIndex, logIndex, 'soilType', value);

        const filtered = soilTypes.filter(type =>
            type.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSoilTypes(filtered);
        setShowSoilSuggestions(true);
        setActiveSoilField({ levelIndex, logIndex });
    };

    const selectSoilType = (type, levelIndex, logIndex) => {
        handleBoreholeLogChange(levelIndex, logIndex, 'soilType', type);
        setShowSoilSuggestions(false);
        setActiveSoilField(null);
    };

    const addBoreholeLog = (levelIndex) => {
        const newLogs = [...formData.boreholeLogs];
        newLogs[levelIndex].push({
            depth: '',
            natureOfSampling: '',
            soilType: '',
            waterTable: false,
            spt1: '',
            spt2: '',
            spt3: '',
            shearParameters: {
                cValue: '',
                phiValue: ''
            },
            coreLength: '',
            coreRecovery: '',
            rqd: '',
            sbc: ''
        });
        setFormData(prev => ({
            ...prev,
            boreholeLogs: newLogs
        }));
    };

    const removeBoreholeLog = (levelIndex, logIndex) => {
        if (formData.boreholeLogs[levelIndex].length > 1) {
            const newLogs = [...formData.boreholeLogs];
            newLogs[levelIndex] = newLogs[levelIndex].filter((_, i) => i !== logIndex);
            setFormData(prev => ({
                ...prev,
                boreholeLogs: newLogs
            }));
        }
    };

    const addLevel = () => {
        setFormData(prev => ({
            ...prev,
            boreholeLogs: [...prev.boreholeLogs, [{
                depth: '',
                natureOfSampling: '',
                soilType: '',
                waterTable: false,
                spt1: '',
                spt2: '',
                spt3: '',
                shearParameters: {
                    cValue: '',
                    phiValue: ''
                },
                coreLength: '',
                coreRecovery: '',
                rqd: '',
                sbc: ''
            }]]
        }));
    };

    const removeLevel = (levelIndex) => {
        if (formData.boreholeLogs.length > 1) {
            const newLogs = formData.boreholeLogs.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                boreholeLogs: newLogs
            }));
        }
    };

    const handleLabTestResultChange = (levelIndex, logIndex, field, value) => {
        const newResults = [...formData.labTestResults];

        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newResults[levelIndex][logIndex][parent] = {
                ...newResults[levelIndex][logIndex][parent],
                [child]: value
            };
        } else {
            newResults[levelIndex][logIndex][field] = value;
        }

        setFormData(prev => ({
            ...prev,
            labTestResults: newResults
        }));
    };

    const addLabTestLog = (levelIndex) => {
        const newResults = [...formData.labTestResults];
        newResults[levelIndex].push({
            depth: '',
            bulkDensity: '',
            moistureContent: '',
            grainSizeDistribution: {
                gravel: '',
                sand: '',
                siltAndClay: ''
            },
            atterbergLimits: {
                liquidLimit: '',
                plasticLimit: '',
                plasticityIndex: ''
            },
            specificGravity: '',
            freeSwellIndex: ''
        });
        setFormData(prev => ({
            ...prev,
            labTestResults: newResults
        }));
    };

    const removeLabTestLog = (levelIndex, logIndex) => {
        if (formData.labTestResults[levelIndex].length > 1) {
            const newResults = [...formData.labTestResults];
            newResults[levelIndex] = newResults[levelIndex].filter((_, i) => i !== logIndex);
            setFormData(prev => ({
                ...prev,
                labTestResults: newResults
            }));
        }
    };

    const addLabTestLevel = () => {
        setFormData(prev => ({
            ...prev,
            labTestResults: [...prev.labTestResults, [{
                depth: '',
                bulkDensity: '',
                moistureContent: '',
                grainSizeDistribution: {
                    gravel: '',
                    sand: '',
                    siltAndClay: ''
                },
                atterbergLimits: {
                    liquidLimit: '',
                    plasticLimit: '',
                    plasticityIndex: ''
                },
                specificGravity: '',
                freeSwellIndex: ''
            }]]
        }));
    };

    const removeLabTestLevel = (levelIndex) => {
        if (formData.labTestResults.length > 1) {
            const newResults = formData.labTestResults.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                labTestResults: newResults
            }));
        }
    };

    const handleChemicalAnalysisChange = (index, field, value) => {
        const newAnalysis = [...formData.chemicalAnalysis];
        newAnalysis[index][field] = value;
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: newAnalysis
        }));
    };

    const handleChemicalAnalysisKeyChange = (index, keyIndex, field, value) => {
        const newAnalysis = [...formData.chemicalAnalysis];
        newAnalysis[index].additionalKeys[keyIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: newAnalysis
        }));
    };

    const addChemicalAnalysisLevel = () => {
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: [...prev.chemicalAnalysis, {
                phValue: '',
                sulphates: '',
                chlorides: '',
                additionalKeys: [{ key: '', value: '' }]
            }]
        }));
    };

    const removeChemicalAnalysisLevel = (index) => {
        if (formData.chemicalAnalysis.length > 1) {
            const newAnalysis = formData.chemicalAnalysis.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                chemicalAnalysis: newAnalysis
            }));
        }
    };

    const addChemicalAnalysisKey = (index) => {
        const newAnalysis = [...formData.chemicalAnalysis];
        newAnalysis[index].additionalKeys.push({ key: '', value: '' });
        setFormData(prev => ({
            ...prev,
            chemicalAnalysis: newAnalysis
        }));
    };

    const removeChemicalAnalysisKey = (index, keyIndex) => {
        const newAnalysis = [...formData.chemicalAnalysis];
        if (newAnalysis[index].additionalKeys.length > 1) {
            newAnalysis[index].additionalKeys = newAnalysis[index].additionalKeys.filter((_, i) => i !== keyIndex);
            setFormData(prev => ({
                ...prev,
                chemicalAnalysis: newAnalysis
            }));
        }
    };

    const handleGrainSizeAnalysisChange = (levelIndex, rowIndex, field, value) => {
        const newAnalysis = [...formData.grainSizeAnalysis];
        newAnalysis[levelIndex][rowIndex][field] = value;

        // Automatically sync sieve9 (Pan) with sieve8
        if (field === 'sieve8') {
            newAnalysis[levelIndex][rowIndex]['sieve9'] = value;
        }

        setFormData(prev => ({
            ...prev,
            grainSizeAnalysis: newAnalysis
        }));
    };

    const addGrainSizeAnalysisRow = (levelIndex) => {
        const newAnalysis = [...formData.grainSizeAnalysis];
        newAnalysis[levelIndex].push({
            depth: '',
            sieve1: '',
            sieve2: '',
            sieve3: '',
            sieve4: '',
            sieve5: '',
            sieve6: '',
            sieve7: '',
            sieve8: '',
            sieve9: ''
        });
        setFormData(prev => ({
            ...prev,
            grainSizeAnalysis: newAnalysis
        }));
    };

    const removeGrainSizeAnalysisRow = (levelIndex, rowIndex) => {
        if (formData.grainSizeAnalysis[levelIndex].length > 1) {
            const newAnalysis = [...formData.grainSizeAnalysis];
            newAnalysis[levelIndex] = newAnalysis[levelIndex].filter((_, i) => i !== rowIndex);
            setFormData(prev => ({
                ...prev,
                grainSizeAnalysis: newAnalysis
            }));
        }
    };

    const addGrainSizeAnalysisLevel = () => {
        setFormData(prev => ({
            ...prev,
            grainSizeAnalysis: [...prev.grainSizeAnalysis, [{
                depth: '',
                sieve1: '',
                sieve2: '',
                sieve3: '',
                sieve4: '',
                sieve5: '',
                sieve6: '',
                sieve7: '',
                sieve8: '',
                sieve9: ''
            }]]
        }));
    };

    const removeGrainSizeAnalysisLevel = (levelIndex) => {
        if (formData.grainSizeAnalysis.length > 1) {
            const newAnalysis = formData.grainSizeAnalysis.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                grainSizeAnalysis: newAnalysis
            }));
        }
    };

    const handleSBCDetailChange = (levelIndex, rowIndex, field, value) => {
        const newDetails = [...formData.sbcDetails];
        newDetails[levelIndex][rowIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            sbcDetails: newDetails
        }));
    };

    const addSBCDetailRow = (levelIndex) => {
        const newDetails = [...formData.sbcDetails];
        newDetails[levelIndex].push({
            depth: '',
            footingDimension: '',
            useForReport: false,
            sbcValue: ''
        });
        setFormData(prev => ({
            ...prev,
            sbcDetails: newDetails
        }));
    };

    const removeSBCDetailRow = (levelIndex, rowIndex) => {
        if (formData.sbcDetails[levelIndex].length > 1) {
            const newDetails = [...formData.sbcDetails];
            newDetails[levelIndex] = newDetails[levelIndex].filter((_, i) => i !== rowIndex);
            setFormData(prev => ({
                ...prev,
                sbcDetails: newDetails
            }));
        }
    };

    const addSBCLevel = () => {
        setFormData(prev => ({
            ...prev,
            sbcDetails: [...prev.sbcDetails, [{
                depth: '',
                footingDimension: '',
                useForReport: false,
                sbcValue: ''
            }]]
        }));
    };

    const removeSBCLevel = (levelIndex) => {
        if (formData.sbcDetails.length > 1) {
            const newDetails = formData.sbcDetails.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                sbcDetails: newDetails
            }));
        }
    };

    const handleSubSoilProfileChange = (levelIndex, rowIndex, field, value) => {
        const newProfile = [...formData.subSoilProfile];
        newProfile[levelIndex][rowIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            subSoilProfile: newProfile
        }));
    };

    const addSubSoilProfileRow = (levelIndex) => {
        const newProfile = [...formData.subSoilProfile];
        newProfile[levelIndex].push({
            depth: '',
            description: ''
        });
        setFormData(prev => ({
            ...prev,
            subSoilProfile: newProfile
        }));
    };

    const removeSubSoilProfileRow = (levelIndex, rowIndex) => {
        if (formData.subSoilProfile[levelIndex].length > 1) {
            const newProfile = [...formData.subSoilProfile];
            newProfile[levelIndex] = newProfile[levelIndex].filter((_, i) => i !== rowIndex);
            setFormData(prev => ({
                ...prev,
                subSoilProfile: newProfile
            }));
        }
    };

    const addSubSoilLevel = () => {
        setFormData(prev => ({
            ...prev,
            subSoilProfile: [...prev.subSoilProfile, [{
                depth: '',
                description: ''
            }]]
        }));
    };

    const removeSubSoilLevel = (levelIndex) => {
        if (formData.subSoilProfile.length > 1) {
            const newProfile = formData.subSoilProfile.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                subSoilProfile: newProfile
            }));
        }
    };

    const handleDirectShearChange = (levelIndex, testIndex, field, value) => {
        const newResults = [...formData.directShearResults];
        newResults[levelIndex][testIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            directShearResults: newResults
        }));
    };

    const handleDirectShearStressChange = (levelIndex, testIndex, readingIndex, field, value) => {
        const newResults = [...formData.directShearResults];
        newResults[levelIndex][testIndex].stressReadings[readingIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            directShearResults: newResults
        }));
    };

    const addDirectShearReading = (levelIndex, testIndex) => {
        const newResults = [...formData.directShearResults];
        newResults[levelIndex][testIndex].stressReadings.push({
            normalStress: '',
            shearStress: ''
        });
        setFormData(prev => ({
            ...prev,
            directShearResults: newResults
        }));
    };

    const removeDirectShearReading = (levelIndex, testIndex, readingIndex) => {
        if (formData.directShearResults[levelIndex][testIndex].stressReadings.length > 1) {
            const newResults = [...formData.directShearResults];
            newResults[levelIndex][testIndex].stressReadings = newResults[levelIndex][testIndex].stressReadings.filter((_, i) => i !== readingIndex);
            setFormData(prev => ({
                ...prev,
                directShearResults: newResults
            }));
        }
    };

    const addDirectShearTest = (levelIndex) => {
        const newResults = [...formData.directShearResults];
        newResults[levelIndex].push({
            shearBoxSize: '',
            depthOfSample: '',
            cValue: '',
            phiValue: '',
            stressReadings: [
                { normalStress: '', shearStress: '' }
            ]
        });
        setFormData(prev => ({
            ...prev,
            directShearResults: newResults
        }));
    };

    const removeDirectShearTest = (levelIndex, testIndex) => {
        if (formData.directShearResults[levelIndex].length > 1) {
            const newResults = [...formData.directShearResults];
            newResults[levelIndex] = newResults[levelIndex].filter((_, i) => i !== testIndex);
            setFormData(prev => ({
                ...prev,
                directShearResults: newResults
            }));
        }
    };

    const addDirectShearLevel = () => {
        setFormData(prev => ({
            ...prev,
            directShearResults: [...prev.directShearResults, [{
                shearBoxSize: '',
                depthOfSample: '',
                cValue: '',
                phiValue: '',
                stressReadings: [
                    { normalStress: '', shearStress: '' }
                ]
            }]]
        }));
    };

    const removeDirectShearLevel = (levelIndex) => {
        if (formData.directShearResults.length > 1) {
            const newResults = formData.directShearResults.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                directShearResults: newResults
            }));
        }
    };

    const handlePointLoadChange = (levelIndex, testIndex, field, value) => {
        const newResults = [...formData.pointLoadStrength];
        newResults[levelIndex][testIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            pointLoadStrength: newResults
        }));
    };

    const handlePointLoadReadingChange = (levelIndex, testIndex, readingIndex, field, value) => {
        const newResults = [...formData.pointLoadStrength];
        newResults[levelIndex][testIndex].readings[readingIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            pointLoadStrength: newResults
        }));
    };

    const addPointLoadReading = (levelIndex, testIndex) => {
        const newResults = [...formData.pointLoadStrength];
        newResults[levelIndex][testIndex].readings.push({
            loadAtFailure: '',
            d50: '',
            d: '',
            ucs: ''
        });
        setFormData(prev => ({
            ...prev,
            pointLoadStrength: newResults
        }));
    };

    const removePointLoadReading = (levelIndex, testIndex, readingIndex) => {
        if (formData.pointLoadStrength[levelIndex][testIndex].readings.length > 1) {
            const newResults = [...formData.pointLoadStrength];
            newResults[levelIndex][testIndex].readings = newResults[levelIndex][testIndex].readings.filter((_, i) => i !== readingIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrength: newResults
            }));
        }
    };

    const addPointLoadTest = (levelIndex) => {
        const newResults = [...formData.pointLoadStrength];
        newResults[levelIndex].push({
            depth: '',
            readings: [
                {
                    loadAtFailure: '',
                    d50: '',
                    d: '',
                    ucs: ''
                }
            ]
        });
        setFormData(prev => ({
            ...prev,
            pointLoadStrength: newResults
        }));
    };

    const removePointLoadTest = (levelIndex, testIndex) => {
        if (formData.pointLoadStrength[levelIndex].length > 1) {
            const newResults = [...formData.pointLoadStrength];
            newResults[levelIndex] = newResults[levelIndex].filter((_, i) => i !== testIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrength: newResults
            }));
        }
    };

    const addPointLoadLevel = () => {
        setFormData(prev => ({
            ...prev,
            pointLoadStrength: [...prev.pointLoadStrength, [{
                depth: '',
                readings: [
                    {
                        loadAtFailure: '',
                        d50: '',
                        d: '',
                        ucs: ''
                    }
                ]
            }]]
        }));
    };

    const removePointLoadLevel = (levelIndex) => {
        if (formData.pointLoadStrength.length > 1) {
            const newResults = formData.pointLoadStrength.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrength: newResults
            }));
        }
    };

    const handlePointLoadLumpChange = (levelIndex, testIndex, field, value) => {
        const newResults = [...formData.pointLoadStrengthLump];
        newResults[levelIndex][testIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            pointLoadStrengthLump: newResults
        }));
    };

    const handlePointLoadLumpReadingChange = (levelIndex, testIndex, readingIndex, field, value) => {
        const newResults = [...formData.pointLoadStrengthLump];
        newResults[levelIndex][testIndex].readings[readingIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            pointLoadStrengthLump: newResults
        }));
    };

    const addPointLoadLumpReading = (levelIndex, testIndex) => {
        const newResults = [...formData.pointLoadStrengthLump];
        newResults[levelIndex][testIndex].readings.push({
            loadAtFailure: '',
            d50: '',
            d: '',
            w: '',
            ucs: ''
        });
        setFormData(prev => ({
            ...prev,
            pointLoadStrengthLump: newResults
        }));
    };

    const removePointLoadLumpReading = (levelIndex, testIndex, readingIndex) => {
        if (formData.pointLoadStrengthLump[levelIndex][testIndex].readings.length > 1) {
            const newResults = [...formData.pointLoadStrengthLump];
            newResults[levelIndex][testIndex].readings = newResults[levelIndex][testIndex].readings.filter((_, i) => i !== readingIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrengthLump: newResults
            }));
        }
    };

    const addPointLoadLumpTest = (levelIndex) => {
        const newResults = [...formData.pointLoadStrengthLump];
        newResults[levelIndex].push({
            depth: '',
            readings: [
                {
                    loadAtFailure: '',
                    d50: '',
                    d: '',
                    w: '',
                    ucs: ''
                }
            ]
        });
        setFormData(prev => ({
            ...prev,
            pointLoadStrengthLump: newResults
        }));
    };

    const removePointLoadLumpTest = (levelIndex, testIndex) => {
        if (formData.pointLoadStrengthLump[levelIndex].length > 1) {
            const newResults = [...formData.pointLoadStrengthLump];
            newResults[levelIndex] = newResults[levelIndex].filter((_, i) => i !== testIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrengthLump: newResults
            }));
        }
    };

    const addPointLoadLumpLevel = () => {
        setFormData(prev => ({
            ...prev,
            pointLoadStrengthLump: [...prev.pointLoadStrengthLump, [{
                depth: '',
                readings: [
                    {
                        loadAtFailure: '',
                        d50: '',
                        d: '',
                        w: '',
                        ucs: ''
                    }
                ]
            }]]
        }));
    };

    const removePointLoadLumpLevel = (levelIndex) => {
        if (formData.pointLoadStrengthLump.length > 1) {
            const newResults = formData.pointLoadStrengthLump.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                pointLoadStrengthLump: newResults
            }));
        }
    };

    const handleFoundationRockRowChange = (levelIndex, rowIndex, field, value) => {
        const newResults = [...formData.foundationRockFormations];
        newResults[levelIndex].rows[rowIndex][field] = value;
        setFormData(prev => ({
            ...prev,
            foundationRockFormations: newResults
        }));
    };

    const handleRecommendationsChange = (value) => {
        setFormData(prev => ({
            ...prev,
            recommendations: value
        }));
    };

    const addFoundationRockRow = (levelIndex) => {
        const newResults = [...formData.foundationRockFormations];
        newResults[levelIndex].rows.push({
            rock: '',
            strength: '',
            rqd: '',
            spacingDiscontinuity: '',
            conditionOfDiscontinuity: '',
            gwtCondition: '',
            discontinuityOrientation: '',
            rockGrade: '',
            inferredNetSbp: ''
        });
        setFormData(prev => ({
            ...prev,
            foundationRockFormations: newResults
        }));
    };

    const removeFoundationRockRow = (levelIndex, rowIndex) => {
        if (formData.foundationRockFormations[levelIndex].rows.length > 1) {
            const newResults = [...formData.foundationRockFormations];
            newResults[levelIndex].rows = newResults[levelIndex].rows.filter((_, i) => i !== rowIndex);
            setFormData(prev => ({
                ...prev,
                foundationRockFormations: newResults
            }));
        }
    };

    const addFoundationRockLevel = () => {
        setFormData(prev => ({
            ...prev,
            foundationRockFormations: [...prev.foundationRockFormations, {
                rows: [
                    {
                        rock: '',
                        strength: '',
                        rqd: '',
                        spacingDiscontinuity: '',
                        conditionOfDiscontinuity: '',
                        gwtCondition: '',
                        discontinuityOrientation: '',
                        rockGrade: '',
                        inferredNetSbp: ''
                    }
                ]
            }]
        }));
    };

    const removeFoundationRockLevel = (levelIndex) => {
        if (formData.foundationRockFormations.length > 1) {
            const newResults = formData.foundationRockFormations.filter((_, i) => i !== levelIndex);
            setFormData(prev => ({
                ...prev,
                foundationRockFormations: newResults
            }));
        }
    };

    const handleValidationError = (validationErrors) => {
        const errorKeys = Object.keys(validationErrors);
        const firstErrorKey = errorKeys[0];
        const firstError = validationErrors[firstErrorKey];

        setActiveTab(firstError.tab);

        toast({
            title: "Validation Error",
            description: `Please fill in all mandatory fields. Missing: ${firstError.message}`,
            variant: "destructive",
        });

        // Use timeout to allow tab to switch and element to be available in DOM
        setTimeout(() => {
            const element = document.getElementById(firstErrorKey);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        }, 100);
    };

    const handlePreview = (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            handleValidationError(validationErrors);
            return;
        }
        console.log('Report Form Data:', JSON.stringify(formData, null, 2));
        setIsPreviewOpen(true);
    };

    const handleSaveOnly = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            toast({ title: "Validation Error", description: "Please check all tabs for required fields.", variant: "destructive" });
            const firstErrorTab = Object.values(validationErrors)[0].tab;
            setActiveTab(firstErrorTab);
            return;
        }

        try {
            if (!idToken) throw new Error('Authentication required');

            const results = await dynamoGenericApi.findByAttribute('report', 'report_number', formData.reportId, idToken);
            const existing = results[0];

            if (existing && existing.id !== formData.id) {
                setSaveConfirmation({ isOpen: true, isGenerating: false });
                return;
            }

            await executeSave(false, existing);
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: "Error", description: "Failed to save report: " + error.message, variant: "destructive" });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            toast({ title: "Validation Error", description: "Please check all tabs for required fields.", variant: "destructive" });
            const firstErrorTab = Object.values(validationErrors)[0].tab;
            setActiveTab(firstErrorTab);
            return;
        }

        try {
            if (!idToken) throw new Error('Authentication required');

            const results = await dynamoGenericApi.findByAttribute('report', 'report_number', formData.reportId, idToken);
            const existing = results[0];

            if (existing && existing.id !== formData.id) {
                setSaveConfirmation({ isOpen: true, isGenerating: true });
                return;
            }

            await executeSave(true, existing);
        } catch (error) {
            console.error('Submit error:', error);
            toast({ title: "Error", description: "Failed to generate report: " + error.message, variant: "destructive" });
        }
    };

    const executeSave = async (isGenerating, existingRecord = null) => {
        try {
            if (!idToken) throw new Error('Authentication required');

            setIsSaving(true);

            const payload = {
                id: existingRecord?.id || formData.id,
                report_number: formData.reportId,
                client_name: formData.client,
                content: formData,
                created_by: existingRecord?.created_by || (user.id || user.username || user.name),
                updated_by: user.id || user.username || user.name,
                updated_at: new Date().toISOString()
            };

            await dynamoGenericApi.save('report', payload, idToken);

            toast({
                title: isGenerating ? "Report Generated" : "Report Saved",
                description: isGenerating ? "Report saved and PDF generated successfully." : "The report data has been successfully saved to the database.",
                className: "bg-green-50 border-green-200 text-green-900",
            });

            // Telegram Notification
            const action = (existingRecord || formData.id) ? 'Updated' : 'Created';
            const emoji = (existingRecord || formData.id) ? '✏️' : '📄';
            const message = `${emoji} *Report ${action}*\n\nReport No: \`${formData.reportId}\`\nClient: \`${formData.client}\`\nBy: \`${user?.fullName || 'Unknown'}\``;
            sendTelegramNotification(message);

            if (onSuccess) onSuccess();

            if (isGenerating) {
                const currentHtmlContent = reportTemplateHtml;
                const data = {
                    reportRequestJson: JSON.stringify(formData)
                };
                const filledHtml = fillTemplate(currentHtmlContent, data);

                const blob = new Blob([filledHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Execute Save error:', error);
            toast({ title: "Error", description: "Failed to process report: " + error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
            setSaveConfirmation({ isOpen: false, isGenerating: false });
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Unified Top Header matching AdminReportsManager style */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onCancel} title="Cancel and go back" className="h-8 w-8 p-0 rounded-full">
                        <X className="w-4 h-4 text-gray-400" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {editReport?.id ? 'Edit Report' : 'Create New Report'}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-mono">{formData.reportId || 'New'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {user?.role === 'super_admin' && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={fillWithRandomData}
                            variant="outline"
                            className="border-green-300 text-green-600 hover:bg-green-50 h-9 rounded-lg"
                        >
                            <Zap className="w-3.5 h-3.5 mr-2" /> Sample Data
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        onClick={clearForm}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 h-9 rounded-lg"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear Form
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handlePreview}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5 h-9 rounded-lg"
                    >
                        <Eye className="w-3.5 h-3.5 mr-2" /> Preview Report
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveOnly}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary-dark text-white h-9 rounded-lg"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                        Save Report
                    </Button>
                    {/* Hidden Actual Submit */}
                    <Button
                        type="submit"
                        form="report-form"
                        disabled={isSaving}
                        className="hidden"
                    >
                        Generate Report
                    </Button>
                </div>
            </div>

            <main className="w-full">
                <Card className="shadow-sm border-gray-200">
                    <CardContent className="p-2 sm:p-6">
                        <form id="report-form" onSubmit={handleSubmit} className="space-y-8">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex mb-8 w-full justify-center">
                                    <TabsTrigger value="basic" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <MapPin className="w-4 h-4" />
                                        <span className="hidden sm:inline">Basic Info</span>
                                        <span className="sm:hidden">Basic</span>
                                        {Object.values(errors).some(e => e.tab === 'basic') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="borehole" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <ListTree className="w-4 h-4" />
                                        <span className="hidden sm:inline">Borehole Logs</span>
                                        <span className="sm:hidden">Bore</span>
                                        {Object.values(errors).some(e => e.tab === 'borehole') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="lab" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <TestTube className="w-4 h-4" />
                                        <span className="hidden sm:inline">Lab Tests</span>
                                        <span className="sm:hidden">Lab</span>
                                        {Object.values(errors).some(e => e.tab === 'lab') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="pointload" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <ArrowDownFromLine className="w-4 h-4" />
                                        <span className="hidden sm:inline">Point Load</span>
                                        <span className="sm:hidden">Point</span>
                                        {Object.values(errors).some(e => e.tab === 'pointload') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="sbc" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <LandPlot className="w-4 h-4" />
                                        <span className="hidden sm:inline">SBC Details</span>
                                        <span className="sm:hidden">SBC</span>
                                        {Object.values(errors).some(e => e.tab === 'sbc') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="rock" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <Layers className="w-4 h-4" />
                                        <span className="hidden sm:inline">Foundation</span>
                                        <span className="sm:hidden">Rock</span>
                                        {Object.values(errors).some(e => e.tab === 'rock') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="survey" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <ClipboardList className="w-4 h-4" />
                                        <span className="hidden sm:inline">Survey</span>
                                        <span className="sm:hidden">Survey</span>
                                        {Object.values(errors).some(e => e.tab === 'survey') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="recommendations" className="px-3 py-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2 relative">
                                        <Lightbulb className="w-4 h-4" />
                                        <span className="hidden sm:inline">Recommendations</span>
                                        <span className="sm:hidden">Rec</span>
                                        {Object.values(errors).some(e => e.tab === 'recommendations') && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="mt-0 space-y-8">
                                    {/* Section 1: Site Information */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Site Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                            <div className="space-y-2">
                                                <Label htmlFor="projectType" className={errors.projectType ? "text-red-500" : ""}>Project Type</Label>
                                                <div className="space-y-2">
                                                    <Select
                                                        value={['tower'].includes(formData.projectType) ? formData.projectType : (formData.projectType ? 'others' : '')}
                                                        onValueChange={(value) => {
                                                            if (value === 'others') {
                                                                if (['tower'].includes(formData.projectType) || !formData.projectType) {
                                                                    handleChange({ target: { name: 'projectType', value: '__other__' } });
                                                                }
                                                            } else {
                                                                handleChange({ target: { name: 'projectType', value } });
                                                            }

                                                            if (errors.projectType) setErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.projectType;
                                                                return newErrors;
                                                            });
                                                        }}
                                                    >
                                                        <SelectTrigger id="projectType" className={errors.projectType ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}>
                                                            <SelectValue placeholder="Select Project Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="tower">Tower</SelectItem>
                                                            <SelectItem value="others">Others</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {(!['tower'].includes(formData.projectType) && formData.projectType) && (
                                                        <Input
                                                            value={formData.projectType === '__other__' ? '' : formData.projectType}
                                                            onChange={handleChange}
                                                            name="projectType"
                                                            placeholder="Enter your project type here"
                                                            className={errors.projectType ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                        />
                                                    )}
                                                </div>
                                                {errors.projectType && <p className="text-xs text-red-500 mt-1">{errors.projectType.message}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="reportId" className={errors.reportId ? "text-red-500" : ""}>Report ID</Label>
                                                <Input
                                                    id="reportId"
                                                    name="reportId"
                                                    placeholder="e.g. RPT-001"
                                                    value={formData.reportId}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (errors.reportId) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.reportId;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    className={errors.reportId ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                />
                                                {errors.reportId && <p className="text-xs text-red-500 mt-1">{errors.reportId.message}</p>}
                                            </div>

                                            <div className="space-y-2 relative">
                                                <Label htmlFor="jobOrderNumber" className={errors.jobOrderNumber ? "text-red-500" : ""}>Job Order Number</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="jobOrderNumber"
                                                        name="jobOrderNumber"
                                                        placeholder="Search Job Order Number..."
                                                        value={formData.jobOrderNumber}
                                                        onChange={(e) => {
                                                            handleJobOrderSearch(e);
                                                            if (errors.jobOrderNumber) setErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.jobOrderNumber;
                                                                return newErrors;
                                                            });
                                                        }}
                                                        onFocus={() => {
                                                            if (formData.jobOrderNumber?.trim() && filteredJobOrders.length > 0) {
                                                                setShowJobOrderSuggestions(true);
                                                            }
                                                        }}
                                                        className={errors.jobOrderNumber ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                    />
                                                    {showJobOrderSuggestions && filteredJobOrders.length > 0 && (
                                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                                                            {filteredJobOrders.map((jo, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex flex-col"
                                                                    onClick={() => selectJobOrder(jo)}
                                                                >
                                                                    <span className="font-semibold">{jo.job_order_no}</span>
                                                                    <span className="text-xs text-gray-500 truncate">{jo.clients?.client_name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {errors.jobOrderNumber && <p className="text-xs text-red-500 mt-1">{errors.jobOrderNumber.message}</p>}
                                            </div>

                                            <div className="col-span-full space-y-2">
                                                <Label htmlFor="projectDetails" className={errors.projectDetails ? "text-red-500" : ""}>Project Details</Label>
                                                <Input
                                                    id="projectDetails"
                                                    name="projectDetails"
                                                    placeholder="e.g. GBT 40m"
                                                    value={formData.projectDetails}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (errors.projectDetails) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.projectDetails;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    className={errors.projectDetails ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                />
                                                {errors.projectDetails && <p className="text-xs text-red-500 mt-1">{errors.projectDetails.message}</p>}
                                            </div>

                                            <div className="space-y-2 relative">
                                                <Label htmlFor="client" className={errors.client ? "text-red-500" : ""}>Client Name</Label>
                                                <Input
                                                    id="client"
                                                    name="client"
                                                    placeholder="Search or enter client name"
                                                    value={formData.client}
                                                    onChange={(e) => {
                                                        handleClientSearch(e);
                                                        if (errors.client) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.client;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    onFocus={() => formData.client && setShowClientSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                                                    className={errors.client ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                />
                                                {showClientSuggestions && filteredClients.length > 0 && (
                                                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                                                        {filteredClients.map(client => (
                                                            <div
                                                                key={client.id}
                                                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                                onClick={() => {
                                                                    selectClient(client);
                                                                    if (errors.client) setErrors(prev => {
                                                                        const newErrors = { ...prev };
                                                                        delete newErrors.client;
                                                                        return newErrors;
                                                                    });
                                                                }}
                                                            >
                                                                <div className="font-medium">{client.client_name}</div>
                                                                <div className="text-xs text-gray-500 truncate">{client.client_address}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {errors.client && <p className="text-xs text-red-500 mt-1">{errors.client.message}</p>}
                                                {errors.client && <p className="text-xs text-red-500 mt-1">{errors.client.message}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="clientImage">Client Image</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id="clientImage"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleClientImageChange}
                                                        className="cursor-pointer"
                                                    />
                                                    {formData.clientImage && (
                                                        <div className="relative w-10 h-10 border rounded overflow-hidden shrink-0">
                                                            <img
                                                                src={formData.clientImage}
                                                                alt="Preview"
                                                                className="w-full h-full object-contain"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, clientImage: '' }))}
                                                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                                                title="Remove image"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="clientAddress">Client Address</Label>
                                                <Input
                                                    id="clientAddress"
                                                    name="clientAddress"
                                                    placeholder="Enter client address here"
                                                    value={formData.clientAddress}
                                                    onChange={handleChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="latitude">Latitude</Label>
                                                <Input
                                                    id="latitude"
                                                    name="latitude"
                                                    placeholder="Enter latitude here"
                                                    value={formData.latitude}
                                                    onChange={handleChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="longitude">Longitude</Label>
                                                <Input
                                                    id="longitude"
                                                    name="longitude"
                                                    placeholder="Enter longitude here"
                                                    value={formData.longitude}
                                                    onChange={handleChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="siteId" className={errors.siteId ? "text-red-500" : ""}>Site ID</Label>
                                                <Input
                                                    id="siteId"
                                                    name="siteId"
                                                    placeholder="Enter site ID here"
                                                    value={formData.siteId}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (errors.siteId) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.siteId;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    className={errors.siteId ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                    required
                                                />
                                                {errors.siteId && <p className="text-xs text-red-500 mt-1">{errors.siteId.message}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="anchorId">Anchor ID/Indus ID</Label>
                                                <Input
                                                    id="anchorId"
                                                    name="anchorId"
                                                    placeholder="Enter anchor ID/Indus ID here"
                                                    value={formData.anchorId}
                                                    onChange={handleChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="siteName" className={errors.siteName ? "text-red-500" : ""}>Site Name</Label>
                                                <Input
                                                    id="siteName"
                                                    name="siteName"
                                                    placeholder="Enter site name here"
                                                    value={formData.siteName}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (errors.siteName) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.siteName;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    className={errors.siteName ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                    required
                                                />
                                                {errors.siteName && <p className="text-xs text-red-500 mt-1">{errors.siteName.message}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="surveyDate" className={errors.surveyDate ? "text-red-500" : ""}>Survey Date</Label>
                                                <Input
                                                    id="surveyDate"
                                                    name="surveyDate"
                                                    type="date"
                                                    value={formData.surveyDate}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (errors.surveyDate) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.surveyDate;
                                                            return newErrors;
                                                        });
                                                    }}
                                                    className={errors.surveyDate ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}
                                                    required
                                                />
                                                {errors.surveyDate && <p className="text-xs text-red-500 mt-1">{errors.surveyDate.message}</p>}
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="siteAddress">Site Address</Label>
                                                <Textarea
                                                    id="siteAddress"
                                                    name="siteAddress"
                                                    placeholder="Enter site address here"
                                                    value={formData.siteAddress}
                                                    onChange={handleChange}
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="sitePhoto">Google Maps Site Photo</Label>
                                                <div className="flex flex-col gap-4">
                                                    <Input
                                                        id="sitePhoto"
                                                        name="sitePhoto"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="cursor-pointer"
                                                    />
                                                    {sitePhotoPreview && (
                                                        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-gray-200">
                                                            <img
                                                                src={sitePhotoPreview}
                                                                alt="Site Preview"
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Section 2: IS Codes */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">IS Codes</h3>
                                        <div className="space-y-1">
                                            <div className="grid grid-cols-12 gap-4 mb-2">
                                                <div className="col-span-5 text-sm font-medium text-gray-500">Code</div>
                                                <div className="col-span-6 text-sm font-medium text-gray-500">Value</div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            {formData.isCodes.map((code, index) => (
                                                <div key={index} className="grid grid-cols-12 gap-4 items-start bg-gray-50/50 p-0 rounded-md">
                                                    <div className="col-span-5">
                                                        <Input
                                                            placeholder="e.g. Concrete Mix"
                                                            value={code.key}
                                                            onChange={(e) => handleIsCodeChange(index, 'key', e.target.value)}
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                    <div className="col-span-6">
                                                        <Textarea
                                                            placeholder="e.g. IS 456"
                                                            value={code.value}
                                                            onChange={(e) => handleIsCodeChange(index, 'value', e.target.value)}
                                                            className="min-h-[40px] bg-white resize-y"
                                                            rows={1}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center pt-2">
                                                        {formData.isCodes.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeIsCode(index)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addIsCode}
                                                className="mt-2 text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-green-50"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add IS Code
                                            </Button>
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="survey" className="mt-0 space-y-8">
                                    {/* Section 3: Survey Report */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Survey Report</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <Checkbox
                                                    id="includeSurveyReportNote"
                                                    checked={formData.includeSurveyReportNote}
                                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeSurveyReportNote: checked }))}
                                                />
                                                <label
                                                    htmlFor="includeSurveyReportNote"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    Include Survey Report Details
                                                </label>
                                            </div>

                                            {formData.includeSurveyReportNote && (
                                                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 pl-6 border-l-2 border-gray-100 ml-2">
                                                    <div className="grid grid-cols-12 gap-4 mb-2">
                                                        <div className="col-span-5 text-sm font-medium text-gray-500">Parameter</div>
                                                        <div className="col-span-6 text-sm font-medium text-gray-500">Observation/Value</div>
                                                        <div className="col-span-1"></div>
                                                    </div>
                                                    {formData.surveyReport.map((item, index) => (
                                                        <div key={index} className="grid grid-cols-12 gap-4 items-start bg-gray-50/50 p-0 rounded-md">
                                                            <div className="col-span-5">
                                                                <Input
                                                                    placeholder="e.g. Weather condition"
                                                                    value={item.key}
                                                                    onChange={(e) => handleSurveyReportChange(index, 'key', e.target.value)}
                                                                    className="bg-white"
                                                                />
                                                            </div>
                                                            <div className="col-span-6">
                                                                <Textarea
                                                                    placeholder="Enter survey details..."
                                                                    value={item.value}
                                                                    onChange={(e) => handleSurveyReportChange(index, 'value', e.target.value)}
                                                                    className="min-h-[40px] bg-white resize-y"
                                                                    rows={1}
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-center pt-2">
                                                                {formData.surveyReport.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeSurveyReport(index)}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}


                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addSurveyReport}
                                                        className="mt-2 text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-green-50"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" /> Add Survey Item
                                                    </Button>

                                                    <div className="pt-4 space-y-2">
                                                        <Label htmlFor="surveyReportNote">Survey Report Note</Label>
                                                        <Textarea
                                                            id="surveyReportNote"
                                                            placeholder="Enter any additional notes for the survey report..."
                                                            value={formData.surveyReportNote}
                                                            onChange={(e) => handleChange(e)}
                                                            name="surveyReportNote"
                                                            className="min-h-[80px]"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section 4: Conclusions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Conclusions</h3>
                                        <div className="space-y-2">
                                            {formData.conclusions.map((item, index) => (
                                                <div key={index} className="flex gap-4 items-start bg-gray-50/50 p-0 rounded-md group">
                                                    <div className="flex-grow">
                                                        <Textarea
                                                            placeholder="Enter conclusion..."
                                                            value={item.value}
                                                            onChange={(e) => handleConclusionChange(index, e.target.value)}
                                                            className="min-h-[60px] bg-white resize-y"
                                                        />
                                                    </div>
                                                    <div className="flex-shrink-0 pt-2">
                                                        {formData.conclusions.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeConclusion(index)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addConclusion}
                                                className="mt-2 text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-green-50"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add Conclusion
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Section 5: Depth of Foundation */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100"> Depth of Foundation</h3>
                                        <div className="space-y-2">
                                            <Textarea
                                                id="depthOfFoundation"
                                                placeholder="The foundation depth for the proposed structure shall be a minimum depth of [VALUE]m from the existing ground level."
                                                value={formData.depthOfFoundation}
                                                onChange={(e) => {
                                                    handleChange(e);
                                                    if (errors.depthOfFoundation) setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.depthOfFoundation;
                                                        return newErrors;
                                                    });
                                                }}
                                                name="depthOfFoundation"
                                                className={`min-h-[60px] bg-white resize-y ${errors.depthOfFoundation ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500" : ""}`}
                                            />
                                            {errors.depthOfFoundation && <p className="text-xs text-red-500 mt-1">{errors.depthOfFoundation.message}</p>}
                                        </div>
                                    </div>

                                    {/* Section 5: Recommendation Type For SBC */}
                                    <div id="recommendationTypes">
                                        <h3 className={`text-lg font-semibold mb-4 pb-2 border-b border-gray-100 ${errors.recommendationTypes ? "text-red-500 border-red-500" : "text-gray-900"}`}> Recommendation Type/s For SBC</h3>
                                        <div className="flex items-center space-x-8 pt-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="rec-rock"
                                                    checked={formData.recommendationTypes.rock}
                                                    onCheckedChange={(checked) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            recommendationTypes: {
                                                                ...prev.recommendationTypes,
                                                                rock: checked
                                                            }
                                                        }));
                                                        if (errors.recommendationTypes) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.recommendationTypes;
                                                            return newErrors;
                                                        });
                                                    }}
                                                />
                                                <Label htmlFor="rec-rock" className="cursor-pointer">Rock</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="rec-soil"
                                                    checked={formData.recommendationTypes.soil}
                                                    onCheckedChange={(checked) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            recommendationTypes: {
                                                                ...prev.recommendationTypes,
                                                                soil: checked
                                                            }
                                                        }));
                                                        if (errors.recommendationTypes) setErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors.recommendationTypes;
                                                            return newErrors;
                                                        });
                                                    }}
                                                />
                                                <Label htmlFor="rec-soil" className="cursor-pointer">Soil</Label>
                                            </div>
                                        </div>
                                        {errors.recommendationTypes && <p className="text-xs text-red-500 mt-2">{errors.recommendationTypes.message}</p>}
                                    </div>

                                    {/* Section 7: Site Photos */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Site Photos</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {formData.sitePhotos.map((photo, index) => (
                                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                    <img src={photo} alt="Site" className="w-full h-full object-cover" />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => removeSitePhoto(index)}
                                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <div
                                                className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer bg-gray-50"
                                                onClick={() => document.getElementById('site-photos-upload').click()}
                                            >
                                                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                                                <span className="text-sm font-medium text-gray-500">Add Photo</span>
                                            </div>
                                            <Input
                                                id="site-photos-upload"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleSitePhotosAdd}
                                            />
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="borehole" className="mt-0 space-y-8">
                                    {/* Section 8: Borehole Logs */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Borehole Logs</h3>
                                        <div className="space-y-8">
                                            {formData.boreholeLogs.map((levelLogs, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Borehole Log - Level {levelIndex + 1}</h4>
                                                        {formData.boreholeLogs.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removeLevel(levelIndex)}
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
                                                                    <th className="px-3 py-3 min-w-[150px]">Nature of Sampling</th>
                                                                    <th className="px-3 py-3 min-w-[150px]">Soil Type</th>
                                                                    <th className="px-3 py-0 min-w-[60px]">Water Table</th>
                                                                    <th className="px-3 py-3 min-w-[150px]">SPT Depth at Intervals</th>
                                                                    <th className="px-3 py-3 min-w-[120px]">Shear Params</th>
                                                                    <th className="px-3 py-3 min-w-[100px]">Core Length</th>
                                                                    <th className="px-3 py-3 min-w-[120px]">Core Recovery %</th>
                                                                    <th className="px-3 py-3 min-w-[100px]">RQD %</th>
                                                                    <th className="px-3 py-3 min-w-[100px]">SBC Value</th>
                                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {levelLogs.map((log, logIndex) => (
                                                                    <tr key={logIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                        <td className="px-2 py-2"><Input value={log.depth} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'depth', e.target.value)} className="h-8" /></td>
                                                                        <td className="px-2 py-2">
                                                                            <Select
                                                                                value={log.natureOfSampling}
                                                                                onValueChange={(value) => handleBoreholeLogChange(levelIndex, logIndex, 'natureOfSampling', value)}
                                                                            >
                                                                                <SelectTrigger className="h-8">
                                                                                    <SelectValue placeholder="Select" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="CR">CR</SelectItem>
                                                                                    <SelectItem value="DS">DS</SelectItem>
                                                                                    <SelectItem value="UDS">UDS</SelectItem>
                                                                                    <SelectItem value="DS/UDS">DS/UDS</SelectItem>
                                                                                    <SelectItem value="TP">TP</SelectItem>
                                                                                    <SelectItem value="SPT">SPT</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </td>
                                                                        <td className="px-2 py-2 relative">
                                                                            <Input
                                                                                value={log.soilType}
                                                                                onChange={(e) => handleSoilSearch(e, levelIndex, logIndex)}
                                                                                onFocus={() => {
                                                                                    setActiveSoilField({ levelIndex, logIndex });
                                                                                    setShowSoilSuggestions(true);
                                                                                    setFilteredSoilTypes(soilTypes.filter(type =>
                                                                                        type.toLowerCase().includes((log.soilType || '').toLowerCase())
                                                                                    ));
                                                                                }}
                                                                                onBlur={() => setTimeout(() => setShowSoilSuggestions(false), 200)}
                                                                                className="h-8"
                                                                                placeholder="Soil Type"
                                                                            />
                                                                            {showSoilSuggestions &&
                                                                                activeSoilField?.levelIndex === levelIndex &&
                                                                                activeSoilField?.logIndex === logIndex &&
                                                                                filteredSoilTypes.length > 0 && (
                                                                                    <div className="absolute z-[100] w-64 bg-white border rounded-md shadow-lg max-h-40 overflow-auto mt-1 left-0">
                                                                                        {filteredSoilTypes.map((type, idx) => (
                                                                                            <div
                                                                                                key={idx}
                                                                                                className="p-2 hover:bg-gray-100 cursor-pointer text-xs"
                                                                                                onClick={() => selectSoilType(type, levelIndex, logIndex)}
                                                                                            >
                                                                                                {type}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                        </td>
                                                                        <td className="px-0 py-2 text-center">
                                                                            <div className="flex justify-center">
                                                                                <Checkbox
                                                                                    checked={log.waterTable}
                                                                                    onCheckedChange={(checked) => handleBoreholeLogChange(levelIndex, logIndex, 'waterTable', checked)}
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-2 py-2">
                                                                            <Input value={log.spt1} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt1', e.target.value)} className="h-8 mb-1" placeholder="SPT at 15cm" />
                                                                            <Input value={log.spt2} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt2', e.target.value)} className="h-8 mb-1" placeholder="SPT at 30cm" />
                                                                            <Input value={log.spt3} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'spt3', e.target.value)} className="h-8" placeholder="SPT at 45cm" />
                                                                        </td>
                                                                        <td className="px-2 py-2">
                                                                            <Input value={log.shearParameters?.cValue} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'shearParameters.cValue', e.target.value)} className="h-8 mb-1" placeholder="C Value" />
                                                                            <Input value={log.shearParameters?.phiValue} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'shearParameters.phiValue', e.target.value)} className="h-8" placeholder="Phi Value" />
                                                                        </td>
                                                                        <td className="px-2 py-2"><Input value={log.coreLength} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'coreLength', e.target.value)} className="h-8" placeholder="Core Length" /></td>
                                                                        <td className="px-2 py-2"><Input value={log.coreRecovery} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'coreRecovery', e.target.value)} className="h-8" placeholder="Recovery" /></td>
                                                                        <td className="px-2 py-2"><Input value={log.rqd} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'rqd', e.target.value)} className="h-8" placeholder="RQD" /></td>
                                                                        <td className="px-2 py-2"><Input value={log.sbc} onChange={(e) => handleBoreholeLogChange(levelIndex, logIndex, 'sbc', e.target.value)} className="h-8" placeholder="SBC" /></td>
                                                                        <td className="px-2 py-2 text-center">
                                                                            {levelLogs.length > 1 && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => removeBoreholeLog(levelIndex, logIndex)}
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
                                                        onClick={() => addBoreholeLog(levelIndex)}
                                                        className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" /> Add Log to Level {levelIndex + 1}
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Borehole Log Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="lab" className="mt-0 space-y-8">
                                    {/* Section 9: Laboratory Test Results */}
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

                                    {/* Section 10: Chemical Analysis */}
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

                                    {/* Section 11: Grain Size Analysis */}
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


                                </TabsContent>

                                <TabsContent value="sbc" className="mt-0 space-y-8">
                                    {/* Section 12: SBC Details */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">SBC Details</h3>
                                        <div className="space-y-8">
                                            {formData.sbcDetails.map((levelRows, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">SBC Details - Level {levelIndex + 1}</h4>
                                                        {formData.sbcDetails.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removeSBCLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                                                        <table className="w-full text-sm text-left border-collapse min-w-[600px] rounded-lg">
                                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                <tr>
                                                                    <th className="px-3 py-3 w-[150px]">Depth (m)</th>
                                                                    <th className="px-3 py-3 min-w-[200px]">Footing Dimension</th>
                                                                    <th className="px-3 py-3 w-[150px] text-center">Use for report?</th>
                                                                    <th className="px-3 py-3 min-w-[200px]">SBC Value</th>
                                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {levelRows.map((item, rowIndex) => (
                                                                    <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                        <td className="px-2 py-2"><Input value={item.depth} onChange={(e) => handleSBCDetailChange(levelIndex, rowIndex, 'depth', e.target.value)} className="h-8" placeholder="Depth" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.footingDimension} onChange={(e) => handleSBCDetailChange(levelIndex, rowIndex, 'footingDimension', e.target.value)} className="h-8" placeholder="Dimension" /></td>
                                                                        <td className="px-2 py-2 text-center">
                                                                            <div className="flex justify-center">
                                                                                <Checkbox
                                                                                    checked={item.useForReport}
                                                                                    onCheckedChange={(checked) => handleSBCDetailChange(levelIndex, rowIndex, 'useForReport', checked)}
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-2 py-2"><Input value={item.sbcValue} onChange={(e) => handleSBCDetailChange(levelIndex, rowIndex, 'sbcValue', e.target.value)} className="h-8" placeholder="SBC" /></td>
                                                                        <td className="px-2 py-2 text-center">
                                                                            {levelRows.length > 1 && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => removeSBCDetailRow(levelIndex, rowIndex)}
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
                                                        <div className="mt-4">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addSBCDetailRow(levelIndex)}
                                                                className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" /> Add SBC Detail
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addSBCLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add SBC Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>


                                </TabsContent>

                                <TabsContent value="borehole" className="mt-0 space-y-8">
                                    {/* Section 13: Sub Soil Profile and Classifications */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Sub Soil Profile and Classifications</h3>
                                        <div className="space-y-8">
                                            {formData.subSoilProfile.map((levelRows, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Sub Soil Profile - Level {levelIndex + 1}</h4>
                                                        {formData.subSoilProfile.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removeSubSoilLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                                        <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                <tr>
                                                                    <th className="px-3 py-3 w-[150px]">Depth (m)</th>
                                                                    <th className="px-3 py-3 min-w-[300px]">Soil Description</th>
                                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {levelRows.map((item, rowIndex) => (
                                                                    <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                        <td className="px-2 py-2"><Input value={item.depth} onChange={(e) => handleSubSoilProfileChange(levelIndex, rowIndex, 'depth', e.target.value)} className="h-8" placeholder="Depth" /></td>
                                                                        <td className="px-2 py-2">
                                                                            <Textarea
                                                                                value={item.description}
                                                                                onChange={(e) => handleSubSoilProfileChange(levelIndex, rowIndex, 'description', e.target.value)}
                                                                                className="min-h-[40px] py-1"
                                                                                placeholder="Soil Description"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-2 text-center">
                                                                            {levelRows.length > 1 && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => removeSubSoilProfileRow(levelIndex, rowIndex)}
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
                                                        onClick={() => addSubSoilProfileRow(levelIndex)}
                                                        className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" /> Add Sub Soil Profile Row
                                                    </Button>
                                                </div>
                                            ))}

                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addSubSoilLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Sub Soil Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="lab" className="mt-0 space-y-8">
                                    {/* Section 14: Direct Shear Results */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Direct Shear Results</h3>
                                        <div className="space-y-8">
                                            {formData.directShearResults.map((levelTests, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Direct Shear - Level {levelIndex + 1}</h4>
                                                        {formData.directShearResults.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removeDirectShearLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        {levelTests.map((test, testIndex) => (
                                                            <div key={testIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                                                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                                                    <h5 className="text-sm font-semibold text-gray-600">Direct Shear Test {testIndex + 1}</h5>
                                                                    {levelTests.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removeDirectShearTest(levelIndex, testIndex)}
                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Test
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div>
                                                                        <Label className="block text-sm font-medium text-gray-700 mb-1">Shear Box Size (cm)</Label>
                                                                        <Input
                                                                            value={test.shearBoxSize}
                                                                            onChange={(e) => handleDirectShearChange(levelIndex, testIndex, 'shearBoxSize', e.target.value)}
                                                                            className="bg-white"
                                                                            placeholder="e.g. 6.0"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="block text-sm font-medium text-gray-700 mb-1">Depth of Sample (m)</Label>
                                                                        <Input
                                                                            value={test.depthOfSample}
                                                                            onChange={(e) => handleDirectShearChange(levelIndex, testIndex, 'depthOfSample', e.target.value)}
                                                                            className="bg-white"
                                                                            placeholder="Depth"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="block text-sm font-medium text-gray-700 mb-1">C Value (kg/cm²)</Label>
                                                                        <Input
                                                                            value={test.cValue}
                                                                            onChange={(e) => handleDirectShearChange(levelIndex, testIndex, 'cValue', e.target.value)}
                                                                            className="bg-white"
                                                                            placeholder="C Value"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="block text-sm font-medium text-gray-700 mb-1">Phi Value (degrees)</Label>
                                                                        <Input
                                                                            value={test.phiValue}
                                                                            onChange={(e) => handleDirectShearChange(levelIndex, testIndex, 'phiValue', e.target.value)}
                                                                            className="bg-white"
                                                                            placeholder="Phi"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="mt-6 border-t border-gray-100 pt-4">
                                                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Stress Readings</h4>
                                                                    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                                                        <table className="w-full text-sm text-left border-collapse min-w-[400px]">
                                                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                                <tr>
                                                                                    <th className="px-3 py-3">Normal Stress (kg/cm²)</th>
                                                                                    <th className="px-3 py-3">Shear Stress (kg/cm²)</th>
                                                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {test.stressReadings.map((reading, readingIndex) => (
                                                                                    <tr key={readingIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                                        <td className="px-2 py-2"><Input value={reading.normalStress} onChange={(e) => handleDirectShearStressChange(levelIndex, testIndex, readingIndex, 'normalStress', e.target.value)} className="h-8" placeholder="Stress" /></td>
                                                                                        <td className="px-2 py-2"><Input value={reading.shearStress} onChange={(e) => handleDirectShearStressChange(levelIndex, testIndex, readingIndex, 'shearStress', e.target.value)} className="h-8" placeholder="Stress" /></td>
                                                                                        <td className="px-2 py-2 text-center">
                                                                                            {test.stressReadings.length > 1 && (
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    onClick={() => removeDirectShearReading(levelIndex, testIndex, readingIndex)}
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
                                                                        onClick={() => addDirectShearReading(levelIndex, testIndex)}
                                                                        className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                                    >
                                                                        <Plus className="w-4 h-4 mr-2" /> Add Stress Reading
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-center pt-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addDirectShearTest(levelIndex)}
                                                                className="text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" /> Add Direct Shear Test
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addDirectShearLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Direct Shear Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="pointload" className="mt-0 space-y-8">
                                    {/* Section 15: Point Load Strength Index of Rock */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Point Load Strength Index of Rock</h3>
                                        <div className="space-y-8">
                                            {formData.pointLoadStrength.map((levelTests, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Point Load - Level {levelIndex + 1}</h4>
                                                        {formData.pointLoadStrength.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removePointLoadLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        {levelTests.map((test, testIndex) => (
                                                            <div key={testIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                                                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                                                    <h5 className="text-sm font-semibold text-gray-600">Test {testIndex + 1}</h5>
                                                                    {levelTests.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removePointLoadTest(levelIndex, testIndex)}
                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Test
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <div className="mb-6 max-w-xs">
                                                                    <Label className="block text-sm font-medium text-gray-700 mb-1">Depth (m)</Label>
                                                                    <Input
                                                                        value={test.depth}
                                                                        onChange={(e) => handlePointLoadChange(levelIndex, testIndex, 'depth', e.target.value)}
                                                                        className="bg-white"
                                                                        placeholder="Depth"
                                                                    />
                                                                </div>

                                                                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                                                    <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                            <tr>
                                                                                <th className="px-3 py-3">Load At Failure (kg)</th>
                                                                                <th className="px-3 py-3">D 50 Value (mm)</th>
                                                                                <th className="px-3 py-3">D Value (mm)</th>
                                                                                <th className="px-3 py-3">UCS (kg/cm²)</th>
                                                                                <th className="px-3 py-3 w-[50px]"></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {test.readings.map((item, readingIndex) => (
                                                                                <tr key={readingIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                                    <td className="px-2 py-2"><Input value={item.loadAtFailure} onChange={(e) => handlePointLoadReadingChange(levelIndex, testIndex, readingIndex, 'loadAtFailure', e.target.value)} className="h-8" placeholder="Load" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.d50} onChange={(e) => handlePointLoadReadingChange(levelIndex, testIndex, readingIndex, 'd50', e.target.value)} className="h-8" placeholder="d50" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.d} onChange={(e) => handlePointLoadReadingChange(levelIndex, testIndex, readingIndex, 'd', e.target.value)} className="h-8" placeholder="d" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.ucs} onChange={(e) => handlePointLoadReadingChange(levelIndex, testIndex, readingIndex, 'ucs', e.target.value)} className="h-8" placeholder="UCS" /></td>
                                                                                    <td className="px-2 py-2 text-center">
                                                                                        {test.readings.length > 1 && (
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                onClick={() => removePointLoadReading(levelIndex, testIndex, readingIndex)}
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
                                                                    onClick={() => addPointLoadReading(levelIndex, testIndex)}
                                                                    className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                                >
                                                                    <Plus className="w-4 h-4 mr-2" /> Add Reading
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-center pt-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addPointLoadTest(levelIndex)}
                                                                className="text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" /> Add Point Load Test
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addPointLoadLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Point Load Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 16: Point Load Strength Index of Lump */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Point Load Strength Index of Lump</h3>
                                        <div className="space-y-8">
                                            {formData.pointLoadStrengthLump.map((levelTests, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Point Load (Lump) - Level {levelIndex + 1}</h4>
                                                        {formData.pointLoadStrengthLump.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removePointLoadLumpLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        {levelTests.map((test, testIndex) => (
                                                            <div key={testIndex} className="bg-white p-4 rounded-lg border border-gray-200">
                                                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                                                    <h5 className="text-sm font-semibold text-gray-600">Test {testIndex + 1}</h5>
                                                                    {levelTests.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removePointLoadLumpTest(levelIndex, testIndex)}
                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Test
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <div className="mb-6 max-w-xs">
                                                                    <Label className="block text-sm font-medium text-gray-700 mb-1">Depth (m)</Label>
                                                                    <Input
                                                                        value={test.depth}
                                                                        onChange={(e) => handlePointLoadLumpChange(levelIndex, testIndex, 'depth', e.target.value)}
                                                                        className="bg-white"
                                                                        placeholder="Depth"
                                                                    />
                                                                </div>

                                                                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                                                    <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                            <tr>
                                                                                <th className="px-3 py-3">Load At Failure (kg)</th>
                                                                                <th className="px-3 py-3">D 50 Value (mm)</th>
                                                                                <th className="px-3 py-3">D Value (mm)</th>
                                                                                <th className="px-3 py-3">W Value</th>
                                                                                <th className="px-3 py-3">UCS (kg/cm²)</th>
                                                                                <th className="px-3 py-3 w-[50px]"></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {test.readings.map((item, readingIndex) => (
                                                                                <tr key={readingIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                                    <td className="px-2 py-2"><Input value={item.loadAtFailure} onChange={(e) => handlePointLoadLumpReadingChange(levelIndex, testIndex, readingIndex, 'loadAtFailure', e.target.value)} className="h-8" placeholder="Load" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.d50} onChange={(e) => handlePointLoadLumpReadingChange(levelIndex, testIndex, readingIndex, 'd50', e.target.value)} className="h-8" placeholder="d50" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.d} onChange={(e) => handlePointLoadLumpReadingChange(levelIndex, testIndex, readingIndex, 'd', e.target.value)} className="h-8" placeholder="d" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.w} onChange={(e) => handlePointLoadLumpReadingChange(levelIndex, testIndex, readingIndex, 'w', e.target.value)} className="h-8" placeholder="w" /></td>
                                                                                    <td className="px-2 py-2"><Input value={item.ucs} onChange={(e) => handlePointLoadLumpReadingChange(levelIndex, testIndex, readingIndex, 'ucs', e.target.value)} className="h-8" placeholder="UCS" /></td>
                                                                                    <td className="px-2 py-2 text-center">
                                                                                        {test.readings.length > 1 && (
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                onClick={() => removePointLoadLumpReading(levelIndex, testIndex, readingIndex)}
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
                                                                    onClick={() => addPointLoadLumpReading(levelIndex, testIndex)}
                                                                    className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                                >
                                                                    <Plus className="w-4 h-4 mr-2" /> Add Reading
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-center pt-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addPointLoadLumpTest(levelIndex)}
                                                                className="text-primary border-dashed border-primary/50 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" /> Add Point Load (Lump) Test
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addPointLoadLumpLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Point Load (Lump) Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>



                                <TabsContent value="rock" className="mt-0 space-y-8">
                                    {/* Section 17: Foundation In Rock Formations */}
                                    <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Foundation In Rock Formations</h3>
                                        <div className="space-y-8">
                                            {formData.foundationRockFormations.map((levelData, levelIndex) => (
                                                <div key={levelIndex} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="text-md font-semibold text-gray-700">Foundation (Rock) - Level {levelIndex + 1}</h4>
                                                        {formData.foundationRockFormations.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removeFoundationRockLevel(levelIndex)}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Level
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white mb-4">
                                                        <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                                                                <tr>
                                                                    <th className="px-3 py-3">Rock</th>
                                                                    <th className="px-3 py-3">Strength</th>
                                                                    <th className="px-3 py-3">RQD</th>
                                                                    <th className="px-3 py-3">Spacing Discontinuity</th>
                                                                    <th className="px-3 py-3">Condition Of Discontinuity</th>
                                                                    <th className="px-3 py-3">GWT Condition</th>
                                                                    <th className="px-3 py-3">Discontinuity Orientation</th>
                                                                    <th className="px-3 py-3">Rock Grade</th>
                                                                    <th className="px-3 py-3">Inferred Net SBP</th>
                                                                    <th className="px-3 py-3 w-[50px]"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {levelData.rows.map((item, rowIndex) => (
                                                                    <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50/50">
                                                                        <td className="px-2 py-2"><Input value={item.rock} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'rock', e.target.value)} className="h-8" placeholder="Rock" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.strength} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'strength', e.target.value)} className="h-8" placeholder="Strength" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.rqd} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'rqd', e.target.value)} className="h-8" placeholder="RQD" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.spacingDiscontinuity} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'spacingDiscontinuity', e.target.value)} className="h-8" placeholder="Spacing" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.conditionOfDiscontinuity} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'conditionOfDiscontinuity', e.target.value)} className="h-8" placeholder="Condition" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.gwtCondition} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'gwtCondition', e.target.value)} className="h-8" placeholder="GWT" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.discontinuityOrientation} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'discontinuityOrientation', e.target.value)} className="h-8" placeholder="Orient." /></td>
                                                                        <td className="px-2 py-2"><Input value={item.rockGrade} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'rockGrade', e.target.value)} className="h-8" placeholder="Grade" /></td>
                                                                        <td className="px-2 py-2"><Input value={item.inferredNetSbp} onChange={(e) => handleFoundationRockRowChange(levelIndex, rowIndex, 'inferredNetSbp', e.target.value)} className="h-8" placeholder="SBP" /></td>
                                                                        <td className="px-2 py-2 text-center">
                                                                            {levelData.rows.length > 1 && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => removeFoundationRockRow(levelIndex, rowIndex)}
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
                                                        onClick={() => addFoundationRockRow(levelIndex)}
                                                        className="text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" /> Add Row
                                                    </Button>

                                                </div>

                                            ))}
                                            <div className="flex justify-center pt-4 border-t border-gray-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addFoundationRockLevel}
                                                    className="w-full md:w-auto text-primary border-dashed border-gray-300 hover:bg-primary/5 hover:text-primary-dark hover:border-primary bg-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Add Foundation (Rock) Level
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>

                                <TabsContent value="recommendations" className="mt-0 space-y-8">
                                    {/* Section 18: Recommendations / Comments */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Recommendations / Comments</h3>
                                        <div className="max-w-4xg">
                                            <Textarea
                                                value={formData.recommendations}
                                                onChange={(e) => handleRecommendationsChange(e.target.value)}
                                                className="bg-white min-h-[100px]"
                                                placeholder="Enter recommendations or comments..."
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>



                        </form>
                    </CardContent>
                </Card>
            </main >


            {isPreviewOpen && (
                <ReportPreview
                    formData={formData}
                    onClose={() => setIsPreviewOpen(false)}
                />
            )}
            {/* Overwrite Confirmation Dialog */}
            <AlertDialog open={saveConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setSaveConfirmation({ isOpen: false, isGenerating: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Overwrite Existing Report?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            A report with the ID <span className="font-semibold text-gray-900">{formData.reportId}</span> already exists.
                            Saving will overwrite the existing data. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => executeSave(saveConfirmation.isGenerating)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Yes, Overwrite
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default NewReportForm;
