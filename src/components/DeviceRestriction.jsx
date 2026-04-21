import React, { useState, useEffect } from 'react';
import { Monitor, Tablet } from 'lucide-react';

const DeviceRestriction = ({ children }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            // Standard tablet threshold is 768px
            setIsMobile(window.innerWidth < 768);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    if (isMobile) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#F5F1ED] flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-center gap-4 text-[#1A4332]">
                        <Monitor className="w-16 h-16 opacity-20" />
                        <Tablet className="w-16 h-16" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Screen Size Not Supported</h1>
                    <p className="text-gray-600 leading-relaxed">
                        This application is designed for tablets and desktops to provide the best user experience.
                        Please use a larger device to continue.
                    </p>
                    <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            Minimum Resolution: 768px width
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default DeviceRestriction;
