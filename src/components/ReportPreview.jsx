import React from 'react';
import logo from '@/assets/edge2-logo.png';
// Import client logos
import atcLogo from '@/assets/clients/atc.png';
import indusLogo from '@/assets/clients/indus.png';
import jioLogo from '@/assets/clients/reliance-jio.png';
// Import ISO logos
import iso9001 from '@/assets/iso-9001-2015.png';
import iso45001 from '@/assets/iso-45001-2018.png';
// Import seals and signatures
import companySeal from '@/assets/company-seal.png';
import engineerSeal from '@/assets/engineer-seal.jpeg';
import engineerSign from '@/assets/engineer-sign.jpeg';

import { X, Printer, FileText, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';


const GrainSizeGraph = ({ data, bhName }) => {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
        if (!window.Chart || !chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');

        const datasets = data.map((row, index) => {
            const points = [
                { x: 4.750, y: parseFloat(row.sieve1) || 0 },
                { x: 2.360, y: parseFloat(row.sieve2) || 0 },
                { x: 1.180, y: parseFloat(row.sieve3) || 0 },
                { x: 0.600, y: parseFloat(row.sieve4) || 0 },
                { x: 0.425, y: parseFloat(row.sieve5) || 0 },
                { x: 0.300, y: parseFloat(row.sieve6) || 0 },
                { x: 0.150, y: parseFloat(row.sieve7) || 0 },
                { x: 0.075, y: parseFloat(row.sieve8) || 0 }
            ].filter(p => !isNaN(p.y));

            return {
                label: `Depth ${row.depth}m`,
                data: points,
                borderColor: `hsl(${index * 137.5}, 70%, 50%)`,
                backgroundColor: `hsl(${index * 137.5}, 70%, 50%, 0.1)`,
                tension: 0.3,
                fill: false,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'logarithmic',
                        position: 'bottom',
                        title: { display: true, text: 'Sieve Size (mm)', font: { weight: 'bold' } },
                        min: 0.001,
                        max: 10,
                        ticks: {
                            minRotation: 45,
                            maxRotation: 45,
                            stepSize: 0,
                            autoSkip: true,
                            maxTicksLimit: 15,
                            callback: function (value) {
                                // if (value === 10 || value === 1 || value === 0.1 || value === 0.01 || value === 0.001) {
                                //     return value.toString();
                                // }
                                // return null;
                                return Number(value).toFixed(3);
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Percentage Passing (%)', font: { weight: 'bold' } },
                        ticks: {
                            autoSkip: true,
                            stepSize: 10
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, padding: 15 }
                    },
                    title: {
                        display: true,
                        text: `Grain Size Analysis - ${bhName}`,
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    }
                },
                animation: false
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, bhName]);

    return (
        <div className="w-full h-[500px] border border-gray-200 rounded-lg p-4 bg-white shadow-sm mt-4">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

const Page = ({ children, reportId, pageNumber, totalPages }) => (
    <div
        className="a4-page shadow-2xl print:shadow-none bg-white relative overflow-hidden"
        style={{
            width: '210mm',
            height: '297mm',
            padding: '10mm',
            minHeight: '297mm',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
            breakAfter: 'page'
        }}
    >
        {/* Watermark */}
        <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
                transform: 'rotate(-55deg)',
                zIndex: 0
            }}
        >
            <span
                style={{
                    fontSize: '42pt',
                    fontWeight: 700,
                    color: 'rgba(0,0,0,0.02)',
                    whiteSpace: 'nowrap'
                }}
            >
                EDGE2 Engineering Solutions India Pvt. Ltd.
            </span>
        </div>

        <div className="border-[0.5pt] border-black h-[277mm] relative p-2 flex flex-col overflow z-10">
            <div className="flex-grow overflow-hidden">
                {children}
            </div>

            {/* Page Footer */}
            <div className="absolute bottom-[-25px] left-[5px] right-[5px]">
                <div className="pt-2 text-gray-700 grid grid-cols-2 items-center">
                    <p className="font-semibold text-[9pt] text-left">
                        EDGE2 Engineering Solutions India Pvt. Ltd.
                    </p>
                    <p className="text-[8pt] text-right font-semibold">
                        Report ID: {reportId || 'N/A'}
                        <span className="px-4">|</span>
                        Page {pageNumber} of {totalPages}
                    </p>
                </div>
            </div>
        </div>
    </div>
);




const ReportPreview = ({ formData, onClose }) => {
    if (!formData) return null;

    const handlePrint = () => {
        window.print();
    };

    const getClientLogo = () => {
        if (formData.clientImage) return formData.clientImage;
        const clientName = formData.client?.toUpperCase() || '';
        if (clientName.includes("ATC TELECOM")) return atcLogo;
        if (clientName.includes("INDUS TOWERS")) return indusLogo;
        if (clientName.includes("RELIANCE JIO")) return jioLogo;
        return formData.clientLogo;
    };

    const clientLogo = getClientLogo();

    const [chartLoaded, setChartLoaded] = React.useState(false);

    React.useEffect(() => {
        if (window.Chart) {
            setChartLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js";
        script.onload = () => setChartLoaded(true);
        document.body.appendChild(script);

        return () => {
            // Script remains in body to avoid multiple loads
        };
    }, []);

    // Calculate dynamic page numbers for TOC
    const grainSizeBHList = (formData.grainSizeAnalysis || [])
        .map((bhData, index) => ({
            name: `BH ${index + 1}`,
            depths: bhData.filter(row => row.depth || row.sieve1).map(row => row.depth).filter(Boolean).join(', '),
            hasData: bhData.some(row => row.depth || row.sieve1)
        }))
        .filter(bh => bh.hasData);

    const getStartPages = () => {
        let current = 9; // Borehole Logs starts at page 9
        const starts = {
            boreholeLogs: current
        };

        current += (formData.boreholeLogs?.length || 0);
        starts.labResults = current; // Detailed lab results

        current += (formData.labTestResults?.length || 0);
        starts.directShear = current; // Detailed direct shear results

        current += (formData.directShearResults?.length || 0);
        starts.sbcCharts = current; // Detailed SBC calculation pages

        current += (formData.sbcDetails?.length || 0);
        starts.pointLoad = current;

        current += (formData.pointLoadStrength?.length || 0);
        starts.rockFoundation = current;

        if (formData.foundationRockFormations?.length > 0) current += 1;
        starts.sitePhotos = current;

        if (formData.sitePhotos?.length > 0) current += 1;
        starts.grainSize = current;

        if (grainSizeBHList.length > 0) current += (1 + grainSizeBHList.length);
        starts.recommendations = current;

        return starts;
    };

    const sectionStarts = getStartPages();

    // 1. Collect all pages in an array to calculate totalPages dynamically
    const pages = [];

    // Page 1: Front Sheet
    pages.push(
        <Page key="front" reportId={formData.reportId}>
            <div className="flex flex-col items-center h-full text-center font-sans" style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
                <div className="mt-2 mb-2 w-full max-h-[10cm] flex flex-col items-center">
                    <h1 className="text-[16px] text-[#29299a] font-bold leading-tight mb-0 w-full px-2 uppercase">
                        Geo-Technical Investigation Report for Construction of <span className="font-bold inline-block align-bottom">{formData.projectType || '________________'}</span> at
                    </h1>
                    <p className="text-[11pt] text-[#29299a] mt-0 px-0 max-h-[45px] line-clamp-3">
                        {formData.siteAddress || '________________'}
                    </p>
                    <p className="text-[16px] font-bold text-black mt-4 mb-4">Issued to</p>

                    <h2 className="text-[16px] font-bold text-[#29299a] px-2 max-h-[60px] line-clamp-2">
                        {formData.client || '________________'}
                    </h2>

                    <p className="text-[11pt] text-[#29299a] mt-1 px-2 max-h-[70px] line-clamp-3">
                        {formData.clientAddress || '________________'}
                    </p>
                </div>

                <div className="mt-4 mb-8 flex-shrink-0 h-[2cm] w-[4cm] flex items-center justify-center">
                    {clientLogo && (
                        <img
                            src={clientLogo}
                            alt="Client Logo"
                            className="max-h-full max-w-full object-contain"
                        />
                    )}
                </div>

                {/* Report Details Table */}
                <div className="w-full max-w-[18cm] mx-auto mb-12">
                    <table className="w-full border-collapse text-[10pt]">
                        <tbody>
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold w-1/3 text-left">Report ID:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left">{formData.reportId || '________________'}</td>
                            </tr>
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold text-left">Site ID:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left">{formData.siteId || '________________'}</td>
                            </tr>
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold text-left">Site Name:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left line-clamp-3">{formData.siteName || '________________'}</td>
                            </tr>
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold text-left">Project Name:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left line-clamp-2">{formData.projectDetails || '________________'}</td>
                            </tr>
                            {formData.sbcDetails && formData.sbcDetails[0] && formData.sbcDetails[0]
                                .filter(s => s.useForReport)
                                .map((s, idx) => (
                                    <tr key={idx} className="border-b border-black/10">
                                        <td className="py-1.5 pr-4 font-bold text-left">SBC Value {idx + 1}:</td>
                                        <td className="py-1.5 pl-4 border-black/20 font-medium text-left">{s.sbcValue || '________________'}</td>
                                    </tr>
                                ))
                            }
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold text-left">Ground Water Table:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left">
                                    {(() => {
                                        if (!formData.boreholeLogs || formData.boreholeLogs.length === 0) return 'Not Encountered';

                                        return formData.boreholeLogs.map((bh, bhIndex) => {
                                            const wtLog = bh.find(log => log.waterTable === true || log.waterTable === 'true' || (log.waterTable && log.waterTable !== 'false'));
                                            if (wtLog) {
                                                return `BH${bhIndex + 1}: Found at ${wtLog.depth}m`;
                                            }
                                            return `BH${bhIndex + 1}: Not detected`;
                                        }).join(', ');
                                    })()}
                                </td>
                            </tr>
                            <tr className="border-b border-black/10">
                                <td className="py-1.5 pr-4 font-bold text-left">Survey Date:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left">{formData.surveyDate || '________________'}</td>
                            </tr>
                            <tr>
                                <td className="py-1.5 pr-4 font-bold text-left">Report Created On:</td>
                                <td className="py-1.5 pl-4 border-black/20 font-medium text-left">{formData.reportCreatedOn}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Section */}
                <div className="w-full mt-auto">
                    <div className="flex flex-col items-center mb-2">
                        <p className="text-[15px] font-bold text-gray-800 mb-2">Report Issued By</p>
                        <img src={logo} alt="EDGE2 Logo" className="w-[10mm] object-contain mb-1" />
                        <h3 className="text-[11pt] font-bold text-black">EDGE2 Engineering Solutions India Pvt. Ltd.</h3>
                        <p className="text-[10pt] text-black mt-1">
                            Geo-technical Investigation • Material Testing • Structural Health & Stability <br />
                            NDT • Restoration & Rehabilitation • PMC & QA
                        </p>
                        <div className="text-[9pt] text-black mt-1 space-y-0.5">
                            <p>Website: www.edge2.in</p>
                            <p>📞 +91 98809 73810 / 080 5005 6086</p>
                            <p>Email: info@edge2.in | reports@edge2.in</p>
                            <p>PAN: AACCE1702A | GSTIN: 29AACCE1702A1ZD</p>
                        </div>
                    </div>

                    <hr className="border-black/50 my-2" />

                    <div className="grid grid-cols-[3fr_1fr] gap-4 text-left">
                        <div className="text-[13px]">
                            <p><span className="text-[#800000] text-sm">Registered Office and Laboratory:</span><br />
                                EDGE2 Engineering Solutions India Pvt. Ltd.<br />
                                ISO 9001:2015 Certified<br />
                                (Certificate No: IN12701A)<br />
                                Shivaganga Arcade, B35/130, 6th Cross, 6th Block, Vishweshwaraiah Layout, Ullal Upanagar, Bengaluru, Karnataka - 560056</p>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                            <img src={iso9001} alt="ISO 9001:2015" className="w-[15mm] object-contain" />
                            <img src={iso45001} alt="ISO 45001:2018" className="w-[15mm] object-contain" />
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );

    // Page 2: Table of Contents
    pages.push(
        <Page key="toc" reportId={formData.reportId}>
            <h2 className="text-center font-bold text-[16pt] mb-8 uppercase text-blue-900">Table of Contents</h2>
            <table className="w-full border-collapse text-[11pt]">
                <thead>
                    <tr className="border-b-2 border-blue-900">
                        <th className="text-left py-3">Contents</th>
                        <th className="text-right py-3 w-24">Page No.</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {[
                        { label: '1.0 INTRODUCTION', page: '3' },
                        { label: '2.0 OBJECTIVES AND SCOPE OF WORK', page: '3' },
                        { label: '3.0 FIELD INVESTIGATIONS', page: '3' },
                        { label: '4.0 SCHEDULE OF INVESTIGATIONS', page: '4' },
                        { label: '5.0 RESULTS AND DISCUSSIONS', page: '5' },
                        { label: 'BOREHOLE LOGS', page: sectionStarts.boreholeLogs },
                        { label: 'LABORATORY TEST RESULTS', page: sectionStarts.labResults },
                        ...(formData.directShearResults?.length > 0 ? [{ label: 'DIRECT SHEAR TEST RESULTS', page: sectionStarts.directShear }] : []),
                        ...(formData.sbcDetails?.length > 0 ? [{ label: 'SBC CALCULATION DETAILS', page: sectionStarts.sbcCharts }] : []),
                        ...(formData.pointLoadStrength?.length > 0 ? [{ label: 'POINT LOAD STRENGTH RESULTS', page: sectionStarts.pointLoad }] : []),
                        ...(formData.foundationRockFormations?.length > 0 ? [{ label: 'FOUNDATION IN ROCK FORMATIONS', page: sectionStarts.rockFoundation }] : []),
                        ...(formData.sitePhotos?.length > 0 ? [{ label: 'ANNEXURE: SITE PHOTOGRAPHS', page: sectionStarts.sitePhotos }] : []),
                        ...(grainSizeBHList.length > 0 ? [{ label: '7.0 GRAIN SIZE ANALYSIS', page: sectionStarts.grainSize }] : []),
                        { label: '6.0 RECOMMENDATIONS & CONCLUSIONS', page: sectionStarts.recommendations },
                    ].map((item, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 font-medium text-gray-700">{item.label}</td>
                            <td className="py-3 text-right text-gray-500 font-bold">{item.page}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Page>
    );

    // Page 3: Introduction
    pages.push(
        <Page key="intro" reportId={formData.reportId}>
            <h1 className="text-center font-bold text-[14pt] mb-10 uppercase text-blue-900">Technical Report for Geo-technical Investigation</h1>
            <section className="mb-8">
                <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-900 text-white px-2 mr-3">1.0</span> INTRODUCTION
                </h2>
                <div className="text-[10pt] text-justify leading-relaxed">
                    <p className="mb-4">
                        <strong>M/s {formData.client || '________________'}</strong>, Proposes to Construct
                        {' '}{formData.projectType || '________________'} situated at {formData.siteAddress || '________________'}.
                    </p>
                    <p className="mb-4 text-justify">
                        <strong>M/s EDGE2 Engineering Solutions India Pvt. Ltd.</strong> have assigned the Geo-Technical Investigation work to be carried out at the above said project site locations with a view to furnish the detailed Geo-Technical Information of the nature and sub-soil strata for Detailed Foundation Designs.
                    </p>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-900 text-white px-2 mr-3">2.0</span>LOCATION OF PROJECT SITE
                </h2>
                <p className="text-[10pt] mb-4">
                    The proposed Project Site is located at the site plan showing number and depth of Bore-Hole Investigations were carried out in detail.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-900 text-white px-2 mr-3 uppercase ">3.0</span> OBJECTIVES AND SCOPE OF WORK
                </h2>
                <h2 className="text-[10pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-700 text-white px-2 mr-3 uppercase ">3.1</span> OBJECTIVES
                </h2>
                <p className="text-[10pt] mb-4">
                    The objectives of Geo-Technical Investigation is to evaluate the following:
                </p>
                <ul className="list-disc ml-8 text-[10pt] space-y-2">
                    <li>To ascertain the sub-soil strata at each site</li>
                    <li>To study standing Ground Water Level</li>
                    <li>To study the physical and engineering properties of soil strata</li>
                    <li>To evaluate allowable safe bearing capacity of soil</li>
                    <li>To recommend type and depth of foundation</li>
                </ul>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-700 text-white px-2 mr-3 uppercase ">3.2</span> SCOPE OF WORK
                </h2>
                <p className="text-[10pt] mb-4">
                    The Scope of Geo-technical Investigations includes the following Insitu and Lab Tests.
                </p>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">3.2.1</span> FIELD INVESTIGATIONS
                </h2>
                <ul className="list-disc ml-8 text-[10pt] space-y-2">
                    <li>Boring 01 No of 100/150mm dia Boreholes in all kinds of soil up to 10 m depth or refusal strata (N&gt;100 blows for 30 cm penetrations) whichever encounters early.</li>
                    <li>Conducting field-tests such as Standard Penetration Tests as per IS 2131-1981.</li>
                    <li>Collecting disturbed and undisturbed soil samples.</li>
                    <li>To study and record the standing Ground Water Table Level.</li>
                    <li>To ascertain the sub-soil strata and ground topography.</li>
                </ul>
            </section>
        </Page>
    );

    // Page 4: Laboratory Testing and Schedule
    pages.push(
        <Page key="schedule" reportId={formData.reportId}>
            <section className="mb-8">
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">3.2.2</span> LABORATORY TESTING
                </h2>
                <p className="text-[10pt] mb-4">The scope of Laboratory Testing is as follows:</p>
                <ul className="list-disc ml-8 text-[10pt] space-y-2">
                    <li>Grain Size Analysis as per IS 2720 - Part 4 – 1985</li>
                    <li>Atterberg Limits as per IS 2720 - Part 5 - 1985, IS 2720 - Part 2 - 1973</li>
                    <li>Determination of natural moisture content as per IS 2720 - Part 2 - 1973</li>
                    <li>Specific Gravity as per IS 2720 (Part 3/Sec1) - 1980</li>
                    <li>Free Swell Index as per IS 2720 (Part 40) - 1977</li>
                    <li>Direct Shear Test as per IS 2720 (Part 13) - 1986</li>
                    <li>Chemical Analysis</li>
                </ul>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">3.3</span> REPORTING SPECIFICATIONS
                </h2>
                <p className="text-[10pt] mb-4">
                    This comprises preparing a detailed report including soil profiles, physical and engineering properties of soil/rock strata based on laboratory as well as field investigation/tests, recommendations regarding allowable bearing pressure, type and depth of foundations and improvement in bearing capacity if any. Submission of Detailed Technical Report with complete relevant recommendations.
                </p>
                <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-900 text-white px-2 mr-3 uppercase ">4.0</span> SCHEDULE OF INVESTIGATIONS
                </h2>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">4.1</span> FIELD INVESTIGATIONS
                </h2>
                <p className="text-[10pt] mb-4">To study sub-soil strata, field investigations were carried out by drilling 01 No 100mm/ 150 mm dia Boreholes using hand operated Auger Boreholes at the specified locations.</p>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 4.1 </span> Details of Ground Level and termination depth of each Bore-Hole
                </h2>
                <table className="w-full border-collapse border border-black text-[10pt] text-center">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2">Sl.No</th>
                            <th className="border border-black p-2">BH No.</th>
                            <th className="border border-black p-2">Termination Depth (m)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.boreholeLogs?.map((log, index) => (
                            <tr key={index}>
                                <td className="border border-black p-2">{index + 1}</td>
                                <td className="border border-black p-2">BH {index + 1}</td>
                                <td className="border border-black p-2">{log[log.length - 1]?.depth || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">4.2</span> STANDARD PENETRATION TESTS
                </h2>
                <p className="text-[10pt] mb-4">The Standard Penetration Tests (SPT) were conducted using split spoon sampler as per IS-2131-1981 at various depths in Boreholes to determine (N&gt;100 blows for 30 cm penetrations) whichever encounters early.</p>
                <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                    <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 4.2 </span> Details of SPT Tests conducted in Boreholes
                </h2>
                <table className="w-full border-collapse border border-black text-[10pt] text-center">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2">Sl.No</th>
                            <th className="border border-black p-2">BH No.</th>
                            <th className="border border-black p-2">SPT Depth / Levels (m)</th>
                            <th className="border border-black p-2">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.boreholeLogs?.map((log, index) => (
                            <tr key={index}>
                                <td className="border border-black p-2">{index + 1}</td>
                                <td className="border border-black p-2">BH {index + 1}</td>
                                <td className="border border-black p-2">{log[log.length - 1]?.depth || '-'}</td>
                                <td className="border border-black p-2">{log[log.length - 1]?.remarks || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </Page>
    );

    // Page 5: Sampling and Geology
    pages.push(
        <Page key="sampling" reportId={formData.reportId}>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">4.3</span>  DISRUPTED / REPRESENTATIVE SOIL SAMPLES (DS/RS)
            </h2>
            <p className="text-[10pt] mb-4">Disturbed / Representative samples (DS / RS) were collected during drilling and also during SPT Tests. The Representative Samples were collected from the split spoon sampler. The samples recovered were packed in polythene bags, labelled and sent to the laboratory for testing.</p>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 4.3 </span> Details of Sampling in Boreholes
            </h2>
            <p className="text-[10pt] mb-4">Disturbed sample and Undisturbed samples were collected at Boreholes is as follows:</p>
            <table className="w-full border-collapse border border-black text-[10pt] text-center">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">Sl.No</th>
                        <th className="border border-black p-2">BH No.</th>
                        <th className="border border-black p-2">Sampling Depth (m)</th>
                        <th className="border border-black p-2">Sample Type</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.boreholeLogs?.map((log, index) => (
                        <tr key={index}>
                            <td className="border border-black p-2">{index + 1}</td>
                            <td className="border border-black p-2">BH {index + 1}</td>
                            <td className="border border-black p-2">{log
                                .map(item => item.depth ?? '-')
                                .join(', ')}
                            </td>
                            <td className="border border-black p-2">{log[log.length - 1]?.natureOfSampling || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                Refusal Strata / Rock Depth
            </h2>
            <p className="text-[10pt] mb-4">The depth of Refusal Strata and Rock at different Borehole locations were collected during investigations and recorded in the Borehole logs.</p>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">4.3</span>  GROUND TOPOGRAPHY, GEOLOGY OF THE AREA AND SUB-SOIL DETAILS
            </h2>
            <p className="text-[10pt] mb-4">The ground topography, geology at the Project Site location and sub-soil details at the Site location was studied and recorded in the Borehole logs. The soil was classified as per IS 1498-1970.</p>
            <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                <span className="bg-blue-900 text-white px-2 mr-3 uppercase ">5.0</span> RESULTS AND DISCUSSIONS
            </h2>
            <p className="text-[10pt] mb-4">
                The results of field investigations and laboratory tests are presented in Borehole log.
            </p>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.1</span> SOIL PROFILE AND CLASSIFICATION
            </h2>
            <p className="text-[10pt] mb-4">The ground topography at all the Site locations is fairly level. General Subsoil profile is interpreted from borehole. For this purpose whenever necessary field borehole logs have been corrected on the basis of laboratory tests conducted on samples. However, based on interpretation of the borehole logs the following general stratification and soil has been observed.</p>
            <ul className="list-disc ml-8 text-[10pt] space-y-2">
                <li>Top Ground soil: Laterite Rock</li>
                <li>Intermediate Soil: Grayish Clay of High Plasticity (CH)</li>
            </ul>
            <p className="text-[10pt] mb-4 mt-4">The Grain Size Distribution Curves are presented in Figure 1.</p>
        </Page>
    );

    // Page 6: SPT Results
    pages.push(
        <Page key="spt-results" reportId={formData.reportId}>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.2</span> STANDARD PENETRATION NUMBER
            </h2>
            <p className="text-[10pt] mb-4">The Standard Penetration Tests were conducted at various depths in boreholes to determine penetration resistance as per IS 2131-1981. The no. of blows were recorded at every 15 cm penetration up to 45 cm penetrations. The number of blows required to drive the sampler for 30cms beyond seating drive is termed as penetration resistance. Refusal is said to be reached when the sampler penetrates less than 30cm under {'>'}100 blows.<br /><br />The observed ‘N’ values at a borehole location is indicated on the borehole log come sub-soil profiles.</p>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.1 </span> Details of SPT Test Results conducted in Boreholes
            </h2>
            {formData.boreholeLogs?.map((bh, bhIndex) => {
                const logsWithSPT = bh.filter(log => log.spt1 || log.spt2 || log.spt3);
                if (logsWithSPT.length === 0) return null;

                return (
                    <table
                        key={bhIndex}
                        className="w-full border-collapse border border-black text-[8pt] text-center mb-4"
                    >
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={5} className="border border-black p-1">
                                    SPT Value - BH {bhIndex + 1}
                                </th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1 uppercase">Depth (m)</th>
                                <th className="border border-black p-1 uppercase">0.15m</th>
                                <th className="border border-black p-1 uppercase">0.30m</th>
                                <th className="border border-black p-1 uppercase">0.45m</th>
                                <th className="border border-black p-1 uppercase">N-value</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logsWithSPT.map((log, logIndex) => {
                                const spt2 = parseInt(log.spt2) || 0;
                                const spt3 = parseInt(log.spt3) || 0;
                                const nValue = spt2 + spt3;

                                return (
                                    <tr key={logIndex}>
                                        <td className="border border-black p-1">{log.depth}</td>
                                        <td className="border border-black p-1">{log.spt1}</td>
                                        <td className="border border-black p-1">{log.spt2}</td>
                                        <td className="border border-black p-1">{log.spt3}</td>
                                        <td className="border border-black p-1">
                                            {nValue || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}
        </Page>
    );

    // Page 7: Atterberg and Specific Gravity
    pages.push(
        <Page key="atterberg" reportId={formData.reportId}>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.3</span> Atterberg Limits
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.2 </span> Atterberg Limits Results conducted in Boreholes
            </h2>
            {formData.labTestResults?.map((bh, bhIndex) => {
                const logsWithAL = bh.filter(log =>
                    log.atterbergLimits?.liquidLimit ||
                    log.atterbergLimits?.plasticLimit ||
                    log.atterbergLimits?.plasticityIndex
                );
                if (logsWithAL.length === 0) return null;

                return (
                    <table
                        key={bhIndex}
                        className="w-full border-collapse border border-black text-[8pt] text-center mb-4"
                    >
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={4} className="border border-black p-1">
                                    Atterberg Limits Results - BH {bhIndex + 1}
                                </th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1 uppercase">Depth (m)</th>
                                <th className="border border-black p-1 uppercase">Liquid Limit %</th>
                                <th className="border border-black p-1 uppercase">Plastic Limit %</th>
                                <th className="border border-black p-1 uppercase">Plasticity Index</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logsWithAL.map((log, logIndex) => {
                                return (
                                    <tr key={logIndex}>
                                        <td className="border border-black p-1">{log.depth}</td>
                                        <td className="border border-black p-1">{log.atterbergLimits?.liquidLimit || '-'}</td>
                                        <td className="border border-black p-1">{log.atterbergLimits?.plasticLimit || '-'}</td>
                                        <td className="border border-black p-1">{log.atterbergLimits?.plasticityIndex || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}

            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.4</span> Specific Gravity
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.3 </span> Specific Gravity Results conducted in Boreholes
            </h2>
            {formData.labTestResults?.map((bh, bhIndex) => {
                const logsWithSG = bh.filter(log => log.specificGravity);
                if (logsWithSG.length === 0) return null;

                return (
                    <table
                        key={bhIndex}
                        className="w-full border-collapse border border-black text-[8pt] text-center mb-4"
                    >
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={2} className="border border-black p-1">
                                    Specific Gravity Results - BH {bhIndex + 1}
                                </th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1 uppercase">Depth (m)</th>
                                <th className="border border-black p-1 uppercase">Specific Gravity</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logsWithSG.map((log, logIndex) => {
                                return (
                                    <tr key={logIndex}>
                                        <td className="border border-black p-1">{log.depth}</td>
                                        <td className="border border-black p-1">{log.specificGravity || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}
        </Page>
    );

    // Page 8: Shear, FSI, Chemical, Water Table
    pages.push(
        <Page key="lab-results-summary" reportId={formData.reportId}>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.5</span> Shear Parameters
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.4 </span> Shear Parameters Results conducted in Boreholes
            </h2>
            {formData.directShearResults?.map((bh, bhIndex) => {
                const logsWithShear = bh.filter(log => log.cValue || log.phiValue);
                if (logsWithShear.length === 0) return null;

                return (
                    <table
                        key={bhIndex}
                        className="w-full border-collapse border border-black text-[8pt] text-center mb-4"
                    >
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={3} className="border border-black p-1">
                                    Shear Parameters Results - BH {bhIndex + 1}
                                </th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1 uppercase">Depth of Sample (m)</th>
                                <th className="border border-black p-1 uppercase">Cohesion (C) - kg/cm²</th>
                                <th className="border border-black p-1 uppercase">Angle of Internal Friction (Φ)</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logsWithShear.map((log, logIndex) => {
                                return (
                                    <tr key={logIndex}>
                                        <td className="border border-black p-1">{log.depthOfSample}</td>
                                        <td className="border border-black p-1">{log.cValue || '-'}</td>
                                        <td className="border border-black p-1">{log.phiValue ? `${log.phiValue}°` : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.6</span> Free Swell Index
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.5 </span> Free Swell Index Results conducted in Boreholes
            </h2>
            {formData.labTestResults?.map((bh, bhIndex) => {
                const logsWithFSI = bh.filter(log => log.freeSwellIndex);
                if (logsWithFSI.length === 0) return null;

                return (
                    <table
                        key={bhIndex}
                        className="w-full border-collapse border border-black text-[8pt] text-center mb-4"
                    >
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={2} className="border border-black p-1">
                                    Free Swell Index Results - BH {bhIndex + 1}
                                </th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1 uppercase">Depth (m)</th>
                                <th className="border border-black p-1 uppercase">Free Swell Index %</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logsWithFSI.map((log, logIndex) => {
                                return (
                                    <tr key={logIndex}>
                                        <td className="border border-black p-1">{log.depth}</td>
                                        <td className="border border-black p-1">{log.freeSwellIndex || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            })}
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.7</span> Chemical Analysis of Soil Sample
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.6 </span> Chemical Analysis of Soil Sample Results
            </h2>
            {formData.chemicalAnalysis && formData.chemicalAnalysis.length > 0 && (
                <table className="w-full border-collapse border border-black text-[8pt] text-center mb-4">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-1 uppercase">Sample Level</th>
                            <th className="border border-black p-1 uppercase">pH Value</th>
                            <th className="border border-black p-1 uppercase">Chlorides (%)</th>
                            <th className="border border-black p-1 uppercase">Sulphates (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.chemicalAnalysis.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-1">Level {idx + 1}</td>
                                <td className="border border-black p-1">{item.phValue || '-'}</td>
                                <td className="border border-black p-1">{item.chlorides || '-'}</td>
                                <td className="border border-black p-1">{item.sulphates || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-blue-600 text-white px-2 mr-3 uppercase ">5.8</span> Water Table
            </h2>
            <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                <span className="bg-gray-200 text-black px-2 mr-3 uppercase "> Table 5.7 </span> Details of Ground Water Table noticed during Investigation
            </h2>
            <table className="w-full border-collapse border border-black text-[8pt] text-center mb-4">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-1 uppercase">BH No.</th>
                        <th className="border border-black p-1 uppercase">Depth (m) from ground surface</th>
                        <th className="border border-black p-1 uppercase">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.boreholeLogs?.map((bh, bhIndex) => {
                        const LogsWithWT = bh.filter(log => log.waterTable === true || log.waterTable === 'true' || (log.waterTable && String(log.waterTable).toLowerCase() !== 'false'));
                        if (LogsWithWT.length === 0) return null;
                        return LogsWithWT.map((log, logIndex) => (
                            <tr key={`${bhIndex}-${logIndex}`}>
                                <td className="border border-black p-1">BH {bhIndex + 1}</td>
                                <td className="border border-black p-1">{log.depth || '-'}</td>
                                <td className="border border-black p-1">Noticed at the time of investigation</td>
                            </tr>
                        ));
                    })}
                    {(!formData.boreholeLogs || formData.boreholeLogs.every(bh => !bh.some(l => l.waterTable === true || l.waterTable === 'true' || (l.waterTable && String(l.waterTable).toLowerCase() !== 'false')))) && (
                        <tr>
                            <td colSpan={3} className="border border-black p-1 italic">No ground water table noticed up to explored depth.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Page>
    );

    // Borehole Log Pages
    formData.boreholeLogs?.forEach((log, bhIndex) => {
        pages.push(
            <Page key={`bh-${bhIndex}`} reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Borehole Log, Sub-Soil Profile and Laboratory Test Results: (BH {bhIndex + 1})</h4>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-[8pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th colSpan={15} className="border border-black p-1 uppercase">BH {bhIndex + 1}</th>
                            </tr>
                            <tr className="bg-gray-50">
                                <th colSpan={3} className="border border-black p-1 text-left">Project Name:</th>
                                <th colSpan={8} className="border border-black p-1 text-left font-medium">{formData.projectType || '________________'}</th>
                                <th colSpan={2} className="border border-black p-1">Date:</th>
                                <th colSpan={2} className="border border-black p-1 font-medium">{formData.surveyDate || '________________'}</th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th rowSpan={2} className="border border-black p-1">Depth (m)</th>
                                <th rowSpan={2} className="border border-black p-1">Sample</th>
                                <th rowSpan={2} className="border border-black p-1">Legend</th>
                                <th rowSpan={2} className="border border-black p-1">Soil Description</th>
                                <th rowSpan={2} className="border border-black p-1">Water</th>
                                <th colSpan={4} className="border border-black p-1">SPT / Blows</th>
                                <th colSpan={2} className="border border-black p-1">Shear</th>
                                <th rowSpan={2} className="border border-black p-1">Core (m)</th>
                                <th rowSpan={2} className="border border-black p-1">CR%</th>
                                <th rowSpan={2} className="border border-black p-1">RQD%</th>
                                <th rowSpan={2} className="border border-black p-1">SBC</th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1">15</th>
                                <th className="border border-black p-1">30</th>
                                <th className="border border-black p-1">45</th>
                                <th className="border border-black p-1">N</th>
                                <th className="border border-black p-1">C</th>
                                <th className="border border-black p-1">Φ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {log.map((row, rowIndex) => {
                                const N = (parseInt(row.spt2) || 0) + (parseInt(row.spt3) || 0);
                                return (
                                    <tr key={rowIndex}>
                                        <td className="border border-black p-1">{row.depth}</td>
                                        <td className="border border-black p-1">{row.natureOfSampling}</td>
                                        <td className="border border-black p-1 bg-gray-50"></td>
                                        <td className="border border-black p-1 text-left whitespace-normal min-w-[3cm]">{row.soilType}</td>
                                        <td className="border border-black p-1">{row.waterTable ? 'Found' : '-'}</td>
                                        <td className="border border-black p-1">{row.spt1 || '-'}</td>
                                        <td className="border border-black p-1">{row.spt2 || '-'}</td>
                                        <td className="border border-black p-1">{row.spt3 || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{N || '-'}</td>
                                        <td className="border border-black p-1">{row.shearParameters?.cValue || '-'}</td>
                                        <td className="border border-black p-1">{row.shearParameters?.phiValue || '-'}</td>
                                        <td className="border border-black p-1">{row.coreLength || '-'}</td>
                                        <td className="border border-black p-1">{row.coreRecovery || '-'}</td>
                                        <td className="border border-black p-1">{row.rqd || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{row.sbc || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    });

    // Lab Test Results Pages
    formData.labTestResults?.forEach((results, bhIndex) => {
        pages.push(
            <Page key={`lab-${bhIndex}`} reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Summary of Laboratory Test Results: (BH {bhIndex + 1})</h4>
                <div className="flex-1">
                    <table className="w-full border-collapse border border-black text-[8pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th rowSpan={2} className="border border-black p-1">Depth (m)</th>
                                <th rowSpan={2} className="border border-black p-1">Bulk Density (g/cc)</th>
                                <th rowSpan={2} className="border border-black p-1">Moisture content (%)</th>
                                <th colSpan={3} className="border border-black p-1">Grain Size Distribution (%)</th>
                                <th colSpan={3} className="border border-black p-1">Atterberg Limits (%)</th>
                                <th rowSpan={2} className="border border-black p-1">Specific Gravity</th>
                                <th rowSpan={2} className="border border-black p-1">Free Swell Index (%)</th>
                            </tr>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1">Gravel</th>
                                <th className="border border-black p-1">Sand</th>
                                <th className="border border-black p-1">Silt & Clay</th>
                                <th className="border border-black p-1">LL</th>
                                <th className="border border-black p-1">PL</th>
                                <th className="border border-black p-1">PI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="border border-black p-1">{row.depth}</td>
                                    <td className="border border-black p-1">{row.bulkDensity || '-'}</td>
                                    <td className="border border-black p-1">{row.moistureContent || '-'}</td>
                                    <td className="border border-black p-1">{row.grainSizeDistribution?.gravel || '-'}</td>
                                    <td className="border border-black p-1">{row.grainSizeDistribution?.sand || '-'}</td>
                                    <td className="border border-black p-1">{row.grainSizeDistribution?.siltAndClay || '-'}</td>
                                    <td className="border border-black p-1">{row.atterbergLimits?.liquidLimit || '-'}</td>
                                    <td className="border border-black p-1">{row.atterbergLimits?.plasticLimit || '-'}</td>
                                    <td className="border border-black p-1">{row.atterbergLimits?.plasticityIndex || '-'}</td>
                                    <td className="border border-black p-1">{row.specificGravity || '-'}</td>
                                    <td className="border border-black p-1">{row.freeSwellIndex || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    });

    // Direct Shear Test Results
    formData.directShearResults?.forEach((analysis, bhIndex) => {
        pages.push(
            <Page key={`ds-${bhIndex}`} reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Direct Shear Test Results: (BH {bhIndex + 1})</h4>
                <div className="flex-1">
                    <table className="w-full border-collapse border border-black text-[9pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">Depth (m)</th>
                                <th className="border border-black p-2">Cohesion 'c' (kg/cm²)</th>
                                <th className="border border-black p-2">Angle of Internal Friction 'Φ' (degrees)</th>
                                <th className="border border-black p-2">Type of Test</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="border border-black p-2 font-bold">{row.depthOfSample}</td>
                                    <td className="border border-black p-2">{row.cValue || '-'}</td>
                                    <td className="border border-black p-2">{row.phiValue || '-'}</td>
                                    <td className="border border-black p-2">Consolidated Undrained</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    });

    // // Grain Size Analysis Pages
    // formData.grainSizeAnalysis?.forEach((analysis, bhIndex) => {
    //     pages.push(
    //         <Page key={`gsa-${bhIndex}`} reportId={formData.reportId}>
    //             <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Grain Size Analysis Results: (BH {bhIndex + 1})</h4>
    //             <div className="flex-1">
    //                 <table className="w-full border-collapse border border-black text-[8pt] text-center">
    //                     <thead>
    //                         <tr className="bg-gray-200">
    //                             <th rowSpan={2} className="border border-black p-1">Depth (m)</th>
    //                             <th colSpan={9} className="border border-black p-1">Sieve Analysis (Percentage Passing)</th>
    //                         </tr>
    //                         <tr className="bg-gray-200 text-[6pt]">
    //                             {['4.75mm', '2.36mm', '1.18mm', '600μ', '425μ', '300μ', '150μ', '75μ', '<75μ'].map((s, i) => (
    //                                 <th key={i} className="border border-black p-1">{s}</th>
    //                             ))}
    //                         </tr>
    //                     </thead>
    //                     <tbody>
    //                         {analysis.map((row, rowIndex) => (
    //                             <tr key={rowIndex}>
    //                                 <td className="border border-black p-1 font-bold">{row.depth}</td>
    //                                 <td className="border border-black p-1">{row.sieve1 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve2 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve3 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve4 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve5 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve6 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve7 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve8 || '-'}</td>
    //                                 <td className="border border-black p-1">{row.sieve9 || '-'}</td>
    //                             </tr>
    //                         ))}
    //                     </tbody>
    //                 </table>
    //             </div>
    //         </Page>
    //     );
    // });

    // SBC Details Pages
    formData.sbcDetails?.forEach((details, bhIndex) => {
        pages.push(
            <Page key={`sbc-${bhIndex}`} reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Safe Bearing Capacity (SBC) Calculations: (BH {bhIndex + 1})</h4>
                <div className="flex-1">
                    <table className="w-full border-collapse border border-black text-[9pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">Depth (m)</th>
                                <th className="border border-black p-2">Footing Dimension (m)</th>
                                <th className="border border-black p-2">SBC Value (kN/m²)</th>
                                <th className="border border-black p-2">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="border border-black p-2 font-bold">{row.depth}</td>
                                    <td className="border border-black p-2">{row.footingDimension || '-'}</td>
                                    <td className="border border-black p-2 text-blue-900 font-bold">{row.sbcValue || '-'}</td>
                                    <td className="border border-black p-2 text-left">{row.useForReport ? 'Selected for final recommendation' : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    });

    // Point Load Strength Test Results
    formData.pointLoadStrength?.forEach((analysis, bhIndex) => {
        pages.push(
            <Page key={`pls-${bhIndex}`} reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Point Load Strength Test Results: (BH {bhIndex + 1})</h4>
                <div className="flex-1">
                    <table className="w-full border-collapse border border-black text-[9pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">Depth (m)</th>
                                <th className="border border-black p-2">Failure Load (P) (kN)</th>
                                <th className="border border-black p-2">Correction Factor (f)</th>
                                <th className="border border-black p-2">Is strength corrected?</th>
                                <th className="border border-black p-2">Strength Value (Is) (MPa)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="border border-black p-2 font-bold">{row.depth}</td>
                                    <td className="border border-black p-2">{row.failureLoad || '-'}</td>
                                    <td className="border border-black p-2">{row.correctionFactor || '-'}</td>
                                    <td className="border border-black p-2">{row.isStrengthCorrected ? 'Yes' : 'No'}</td>
                                    <td className="border border-black p-2 font-bold">{row.strengthValue || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    });

    // Foundation in Rock Formations
    if (formData.foundationRockFormations && formData.foundationRockFormations.length > 0) {
        pages.push(
            <Page key="rock-foundation" reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-4 text-blue-900">Foundation In Rock Formations</h4>
                <div className="flex-1">
                    <table className="w-full border-collapse border border-black text-[10pt] text-center">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-3">Strata Type / Description</th>
                                <th className="border border-black p-3">Depth Range (m)</th>
                                <th className="border border-black p-3">Allowable Bearing Pressure (kN/m²)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.foundationRockFormations.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="border border-black p-3 text-left font-medium">{row.strataType}</td>
                                    <td className="border border-black p-3">{row.depthRange}</td>
                                    <td className="border border-black p-3 font-bold text-blue-900">{row.allowablePressure}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Page>
        );
    }

    // Site Photos Page
    if (formData.sitePhotos && formData.sitePhotos.length > 0) {
        pages.push(
            <Page key="photos" reportId={formData.reportId}>
                <h4 className="font-bold text-[12pt] mb-6 text-blue-900 border-b pb-2 uppercase">Annexure: Site Photographs</h4>
                <div className="grid grid-cols-2 gap-8 overflow-y-auto max-h-[240mm]">
                    {formData.sitePhotos.map((photo, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className="border border-black p-1 bg-white shadow-sm w-full h-[8cm] flex items-center justify-center">
                                <img src={photo} alt={`Site Photo ${index + 1}`} className="max-w-full max-h-full object-contain" />
                            </div>
                            <p className="mt-2 text-[10pt] font-bold text-gray-700">Photo {index + 1}: {index === 0 ? 'Borehole Location' : 'Site View'}</p>
                        </div>
                    ))}
                </div>
            </Page>
        );
    }

    // Figures

    if (grainSizeBHList.length > 0) {
        pages.push(
            <Page key="figures" reportId={formData.reportId}>
                <section className="mb-8">
                    <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                        <span className="bg-blue-900 text-white px-2 mr-3 uppercase">7.0</span> Grain Size Analysis
                    </h2>
                    <p className="text-[10pt] font-bold mb-4">Summary of Analysis Carried Out:</p>
                    <table className="w-full border-collapse border border-black text-[10pt] text-center mb-6">
                        <thead>
                            <tr className="bg-gray-100 font-bold">
                                <th className="border border-black p-2">Borehole No.</th>
                                <th className="border border-black p-2">Analyzed Depths (m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grainSizeBHList.map((bh, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black p-2">{bh.name}</td>
                                    <td className="border border-black p-2">{bh.depths || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-[10pt] italic">
                        Following {grainSizeBHList.length} page{grainSizeBHList.length > 1 ? 's are' : ' is'} the Grain Size Analysis chart{grainSizeBHList.length > 1 ? 's' : ''}.
                    </p>
                </section>
            </Page>
        );
    }

    // Page: Grain Size Analysis Graphs (one per BH)
    if (formData.grainSizeAnalysis && formData.grainSizeAnalysis.length > 0) {
        formData.grainSizeAnalysis.forEach((bhData, bhIndex) => {
            const hasData = bhData.some(row => row.depth || row.sieve1);
            if (hasData) {
                const bhName = `BH ${bhIndex + 1}`;
                pages.push(
                    <Page key={`grain-size-graph-${bhIndex}`} reportId={formData.reportId}>
                        <div className="flex flex-col h-full">
                            <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                                <span className="bg-blue-900 text-white px-2 mr-3 lowercase ">GS</span> GRAIN SIZE ANALYSIS - {bhName}
                            </h2>

                            <table className="w-full border-collapse border border-black text-[9pt] text-center mb-6">
                                <thead>
                                    <tr className="bg-gray-100 font-bold">
                                        <th className="border border-black p-1" rowSpan="3">Depth (m)</th>
                                        <th className="border border-black p-1" colSpan="9">Sieve Size (mm)</th>
                                    </tr>
                                    <tr className="bg-gray-50 text-[8pt]">
                                        <th className="border border-black p-1">4.750</th>
                                        <th className="border border-black p-1">2.360</th>
                                        <th className="border border-black p-1">1.180</th>
                                        <th className="border border-black p-1">0.600</th>
                                        <th className="border border-black p-1">0.425</th>
                                        <th className="border border-black p-1">0.300</th>
                                        <th className="border border-black p-1">0.150</th>
                                        <th className="border border-black p-1">0.075</th>
                                        <th className="border border-black p-1">Pan</th>
                                    </tr>
                                    <tr className="bg-gray-100 font-bold">
                                        <th colSpan={9}>% Passing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bhData.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            <td className="border border-black p-1 font-bold">{row.depth}</td>
                                            <td className="border border-black p-1">{row.sieve1}</td>
                                            <td className="border border-black p-1">{row.sieve2}</td>
                                            <td className="border border-black p-1">{row.sieve3}</td>
                                            <td className="border border-black p-1">{row.sieve4}</td>
                                            <td className="border border-black p-1">{row.sieve5}</td>
                                            <td className="border border-black p-1">{row.sieve6}</td>
                                            <td className="border border-black p-1">{row.sieve7}</td>
                                            <td className="border border-black p-1">{row.sieve8}</td>
                                            <td className="border border-black p-1">{row.sieve9}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {chartLoaded ? (
                                <GrainSizeGraph data={bhData} bhName={bhName} />
                            ) : (
                                <div className="h-[400px] flex items-center justify-center border border-gray-200 rounded-lg">
                                    <p className="text-gray-500 italic text-[10pt]">Loading Chart Components...</p>
                                </div>
                            )}

                            <div className="mt-auto pt-6 text-[9pt] text-gray-600 italic">
                                <p>Note: The semi-logarithmic plot shows the particle size distribution for the tested samples based on IS:2720 - (Part 4) - 1985.</p>
                            </div>
                        </div>
                    </Page>
                );
            }
        });
    }

    // Recommendations & Conclusions Pages
    pages.push(
        <Page key="recommendations" reportId={formData.reportId}>
            <section className="mb-8">
                <h2 className="text-[12pt] font-bold mb-4 flex items-center">
                    <span className="bg-blue-900 text-white px-2 mr-3 uppercase">6.0</span> RECOMMENDATIONS & CONCLUSIONS
                </h2>
                <div className="text-[10pt] text-justify leading-relaxed">
                    <p className="mb-4">
                        Based on the field investigations and laboratory tests conducted, the following recommendations and conclusions are made for the proposed project.
                    </p>

                    <h3 className="text-[11pt] font-bold mt-4 mb-2 flex items-center">
                        <span className="bg-blue-700 text-white px-2 mr-3 uppercase text-[10pt]">6.1</span> Details of Recommended Safe Bearing Capacity
                    </h3>
                    <p className="mb-4">
                        The recommended Safe Bearing Capacity (SBC) values for the proposed structure at various depths and borehole locations are summarized in the table below.
                    </p>

                    <h2 className="text-[10pt] font-bold mt-4 mb-4 flex items-center">
                        <span className="bg-gray-200 text-black px-2 mr-3 uppercase"> Table 6.1 </span> Details of Recommended Safe Bearing Capacity
                    </h2>

                    <table className="w-full border-collapse border border-black text-[9.5pt] text-center mb-6">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1">Sl.No</th>
                                <th className="border border-black p-1">BH No.</th>
                                <th className="border border-black p-1">Depth of Footing / Levels (m)</th>
                                <th className="border border-black p-1">Type of strata / soil classification</th>
                                <th className="border border-black p-1">Recommended SBC (kN/m²)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let slNo = 1;
                                return formData.boreholeLogs?.map((bh, bhIndex) => {
                                    const logsWithSBC = bh.filter(log => log.sbc);
                                    return logsWithSBC.map((log, logIndex) => (
                                        <tr key={`${bhIndex}-${logIndex}`}>
                                            <td className="border border-black p-1">{slNo++}</td>
                                            <td className="border border-black p-1">BH {bhIndex + 1}</td>
                                            <td className="border border-black p-1">{log.depth || '-'}</td>
                                            <td className="border border-black p-1 text-left px-2">{log.soilType || '-'}</td>
                                            <td className="border border-black p-1 font-bold text-blue-900">{log.sbc}</td>
                                        </tr>
                                    ));
                                });
                            })()}
                            {(!formData.boreholeLogs || formData.boreholeLogs.every(bh => !bh.some(l => l.sbc))) && (
                                <tr>
                                    <td colSpan={5} className="border border-black p-2 italic">No SBC data available for recommendations.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <h3 className="text-[11pt] font-bold mt-6 mb-2 flex items-center">
                        <span className="bg-blue-700 text-white px-2 mr-3 uppercase text-[10pt]">6.2</span> Type of Foundations
                    </h3>
                    <p className="mb-2">
                        The following open type of Foundations are recommended:
                    </p>
                    <ul className="list-disc ml-8 space-y-2 mb-4">
                        <li>Isolated /Raft Foundation</li>
                    </ul>

                </div>
            </section>
        </Page>
    );
    // Additional Recommendations & Conclusions Page
    pages.push(
        <Page key="recommendations-conclusions" reportId={formData.reportId}>
            <section className="mb-8">
                <div className="text-[10pt] text-justify leading-relaxed">
                    <h3 className="text-[11pt] font-bold mt-2 mb-2 flex items-center">
                        <span className="bg-blue-700 text-white px-2 mr-3 uppercase text-[10pt]">6.3</span> Additional Recommendations & Conclusions
                    </h3>

                    <div className="space-y-3">
                        <p className="mb-4">
                            From the field Investigations and laboratory testing, the following conclusions are drawn:
                        </p>
                        {formData.recommendations ? (
                            <ul className="list-disc ml-8 space-y-2">
                                {formData.recommendations
                                    .split(/\r?\n/)
                                    .filter(line => line.trim() !== "")
                                    .map((line, index) => (
                                        <li key={index}>{line}</li>
                                    ))}
                            </ul>
                        ) : (
                            <p>
                                From the field Investigations and laboratory testing, the following conclusions are drawn:
                            </p>
                        )}

                        {formData.conclusions && formData.conclusions.length > 0 ? (
                            <ul className="list-disc ml-8 space-y-2">
                                {formData.conclusions.map((con, i) => (
                                    <li key={i}>{typeof con === 'object' ? con.value : con}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mb-2 italic text-gray-600">No additional conclusions provided.</p>
                        )}

                        <div className="mt-6 p-4 border-t bg-gray-100 border-gray-100 italic text-[9pt]">
                            <p>Note: The above recommendations are based on the tested samples and site observations from the specified borehole locations. Any significant variation in the soil strata encountered during actual construction should be brought to our notice immediately.</p>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-[400px]">
                                <div className="grid grid-cols-2 gap-4">
                                    <p className="col-span-2 text-center font-semibold text-xs">
                                        For EDGE2 Engineering Solutions India Pvt. Ltd.
                                    </p>

                                    <div className="flex justify-center">
                                        <img
                                            src={engineerSign}
                                            alt="Engineer Signature"
                                            className="max-w-30 max-h-20"
                                        />
                                    </div>
                                    <div className="flex justify-center">
                                        <img
                                            src={companySeal}
                                            alt="Company Seal"
                                            className="max-w-30 max-h-20"
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <img
                                            src={engineerSeal}
                                            alt="Engineer Seal"
                                            className="max-w-30 max-h-20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Page>
    );

    const totalPages = pages.length;

    return (
        <div id="report-preview-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white overflow-hidden print:block print:relative print:inset-auto print:z-auto">
            <div className="bg-white w-full max-w-5xl h-[95vh] rounded-lg shadow-2xl flex flex-col print:h-auto print:rounded-none print:shadow-none print:max-w-none print:block print:overflow-visible">
                {/* Header/Controls */}
                <div className="flex items-center justify-between p-4 border-b print:hidden bg-white rounded-t-lg">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Report Preview</h2>
                            <p className="text-xs text-gray-500 font-medium tracking-wide flex items-center">
                                <span className="uppercase mr-2">This is a Preview of the Report to check for data correctness before generating the final report</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center space-x-2 border-primary/20 hover:bg-primary/5">
                            <Printer className="w-4 h-4" />
                            <span className="text-xs">Print / Save PDF</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto bg-gray-100 p-8 print:p-0 print:bg-white print:overflow-visible print:block">
                    <div className="flex flex-col items-center space-y-12 print:space-y-0 print:block">

                        {pages.map((page, index) => (
                            <div key={page.key || index} className="print:break-after-page">
                                {React.cloneElement(page, {
                                    pageNumber: index + 1,
                                    totalPages: totalPages
                                })}
                            </div>
                        ))}


                    </div>
                </div>
            </div>

            <style>{`
                @media screen {
                    .a4-page {
                        margin: 0 auto;
                        box-sizing: border-box;
                    }
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #report-preview-modal, #report-preview-modal * {
                        visibility: visible !important;
                    }
                    #report-preview-modal {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                        display: block !important;
                    }
                    .bg-black\\/60 {
                        background: transparent !important;
                        backdrop-filter: none !important;
                    }
                    .bg-gray-100 {
                        background: white !important;
                    }
                    .shadow-2xl {
                        box-shadow: none !important;
                    }
                    .rounded-lg {
                        border-radius: 0 !important;
                    }
                    .flex-1 {
                        overflow: visible !important;
                    }
                    .a4-page {
                        margin: 0 !important;
                        padding: 10mm !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: hidden !important;
                    }
                    .a4-page:last-child {
                        page-break-after: auto !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    /* Prevent content from breaking across pages */
                    h1, h2, h3, h4, h5, h6 {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    table, figure, img {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    /* Prevent orphans and widows */
                    p {
                        orphans: 3;
                        widows: 3;
                    }
                    /* Ensure headers don't get cut off */
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default ReportPreview;
