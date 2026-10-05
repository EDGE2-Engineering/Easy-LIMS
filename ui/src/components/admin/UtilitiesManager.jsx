import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  FileText,
  Award,
} from 'lucide-react';
import PayslipGenerator from './PayslipGenerator';
import RelievingLetterGenerator from './RelievingLetterGenerator';
import OfferLetterGenerator from './OfferLetterGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const UtilitiesManager = ({ id }) => {
  const navigate = useNavigate();

  const TABS_CONFIG = [
    {
      id: 'payslip',
      label: 'Payslip Generator',
      icon: Banknote,
      description: 'Generate, calculate, and print formal employee pay slips',
    },
    {
      id: 'relieving_letter',
      label: 'Relieving Letter Generator',
      icon: FileText,
      description: 'Generate, customize, and print formal employee relieving letters',
    },
    {
      id: 'offer_letter',
      label: 'Offer Letter Generator',
      icon: Award,
      description: 'Generate, customize, and print formal employment offer letters',
    },
  ];

  const activeTab = id && TABS_CONFIG.find((t) => t.id === id) ? id : TABS_CONFIG[0].id;

  useEffect(() => {
    if (!id && TABS_CONFIG.length > 0) {
      navigate(`/settings/utilities/${TABS_CONFIG[0].id}`, { replace: true });
    }
  }, [id, navigate]);

  const handleTabChange = (value) => {
    navigate(`/settings/utilities/${value}`);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm h-auto inline-flex flex-wrap justify-center">
            {TABS_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                    <p className="text-xs">{tab.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent
          value="payslip"
          className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <PayslipGenerator />
        </TabsContent>

        <TabsContent
          value="relieving_letter"
          className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <RelievingLetterGenerator />
        </TabsContent>

        <TabsContent
          value="offer_letter"
          className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <OfferLetterGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UtilitiesManager;
