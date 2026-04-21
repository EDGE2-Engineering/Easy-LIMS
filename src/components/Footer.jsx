
import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { getSiteContent } from '@/data/config';

const Footer = () => {
  const content = getSiteContent();

  return (
    <footer className="bg-gray-900 text-white py-4 border-t border-gray-800">
      <div className="container mx-auto px-4">
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ClipboardCheck className="w-8 h-8" />
              <span className="text-xl font-bold">{content.global?.siteName || "Easy Billing"}</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              {content.global?.footerAbout}
            </p>
          </div>
        </div> */}

        <div className="pt-0 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          {/* <p>&copy; {new Date().getFullYear()} {content.global?.siteName}. All rights reserved.</p> */}
          <p>&copy; {new Date().getFullYear()} EDGE2 Engineering Solutions India Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
