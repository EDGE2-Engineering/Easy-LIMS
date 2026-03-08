
import React from 'react';
import { Info, CheckCircle2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { MermaidDiagram } from '@lightenna/react-mermaid-diagram';
import { Button } from '@/components/ui/button';
import { enableInfoDiagramZoom, getSiteContent } from '@/config';

const SystemInfo = () => {
    const siteName = getSiteContent().global?.siteName || "Easy Billing";

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                    <Info className="w-6 h-6 text-primary" /> System Information & Help
                </h2>
                <p className="text-gray-500">Learn how to use the EDGE2 {siteName} & Inward Management System effectively.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Inward Management
                    </h3>
                    <div className="space-y-3">
                        {[
                            "Register new samples received from clients with auto-generated Job Order numbers.",
                            "Track sample status from 'Received' through 'Testing' to 'Completed'.",
                            "Manage multiple samples under a single inward entry for bulk processing.",
                            "Filter and search records by Job Order #, PO/WO #, or Client name."
                        ].map((text, i) => (
                            <div key={i} className="flex gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Billing & Document Generation
                    </h3>
                    <div className="space-y-3">
                        {[
                            "Generate Quotations, Tax Invoices, and Proforma Invoices with consistent numbering.",
                            "Automatic tax calculations (GST) based on selected services and HSN codes.",
                            "Store and manage Terms & Conditions for different types of clients.",
                            "Export documents to professional PDF formats for client distribution."
                        ].map((text, i) => (
                            <div key={i} className="flex gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">System Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900">Searchable Lists</p>
                        <p className="text-xs text-gray-500">Most management pages include real-time search and advanced filters.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900">Tablet & Desktop Ready</p>
                        <p className="text-xs text-gray-500">The entire system is optimized for tablet and desktop use.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900">Data Integrity</p>
                        <p className="text-xs text-gray-500">All changes represent real-time updates to the database.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            System Process Flow
                        </h3>
                        <p className="text-sm text-gray-500 italic">Visual representation of the standard material testing and billing cycle.</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner overflow-hidden relative group">
                    <TransformWrapper
                        initialScale={1}
                        initialPositionX={0}
                        initialPositionY={0}
                        centerOnInit={true}
                        minScale={0.5}
                        maxScale={3}
                        disabled={!enableInfoDiagramZoom}
                    >
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                {enableInfoDiagramZoom && (
                                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-gray-200 hover:bg-white"
                                            onClick={() => zoomIn()}
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="w-5 h-5 text-gray-600" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-gray-200 hover:bg-white"
                                            onClick={() => zoomOut()}
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="w-5 h-5 text-gray-600" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur shadow-sm border border-gray-200 hover:bg-white"
                                            onClick={() => resetTransform()}
                                            title="Reset View"
                                        >
                                            <RotateCcw className="w-5 h-5 text-gray-600" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex justify-center w-full">
                                    <TransformComponent
                                        wrapperProps={{
                                            style: {
                                                width: "100%",
                                                height: "600px",
                                                cursor: "grab",
                                            }
                                        }}
                                        contentProps={{
                                            style: {
                                                width: "100%",
                                                display: "flex",
                                                justifyContent: "center"
                                            }
                                        }}
                                    >
                                        <div className="p-2 w-full min-h-[1200px] min-w-[1200px]">
                                            <MermaidDiagram>
                                                {`
                                                flowchart TD
                                                        A["Receive PO/WO from Client (After Quotation Approval)"] --> B
                                                        A --> C
                                                    
                                                        B["Generate Unified Identification Number (UIN) / Job Order Number upon Receipt of PO/WO and Material"] --> D
                                                        D --> |"Testing Process (4–5 Days)"| F

                                                C["Accounts Team Raises Proforma Invoice upon Receipt of PO/WO and Sends to Client"]

                                                D["Material Receiving Officer (MRO) Labels Material with UIN and Prepares Job Card cum Result Sheet (Internal Hard Copy), then Forwards to Relevant Department (Chemical / Physical / Soil / NDT)"]
                                                    
                                                        F["Respective Department Conducts Testing and Records Results in Job Card cum Result Sheet (Internal Hard Copy), then Returns to MRO/Typist"] --> G
                                                    
                                                        G["MRO Generates Final Report with ULR Number and Report Number"] --> H
                                                        H["Authorized Signatory Reviews and Signs the Report"] --> I
                                                        I["Seal Report, Scan & Photocopy; Send Scanned Copy to Accounts Team"] --> J

                                                J["Accounts Team Confirms Payment Receipt; Upon Confirmation, Release Final Report to Client"]
                                                `}
                                            </MermaidDiagram>
                                        </div>
                                    </TransformComponent>
                                </div>
                            </>
                        )}
                    </TransformWrapper>
                    {enableInfoDiagramZoom && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/50 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-[10px] font-medium tracking-wider uppercase pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Drag to Pan • use buttons to zoom
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemInfo;
