import React from 'react';
import { DEPARTMENTS } from '@/data/config';
import { Building2, Info } from 'lucide-react';

const AdminDepartmentsManager = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <p>
          Departments are defined in the application configuration file (
          <code className="font-mono bg-blue-100 px-1 rounded">src/data/config.js</code>). Contact a
          developer to add, rename, or remove departments.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap w-12">#</th>
                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Lab Test Department Name
                </th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((dept) => (
                <tr key={dept.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 align-middle text-gray-400 font-mono">{dept.id}</td>
                  <td className="py-4 px-4 align-middle text-gray-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary/60" />
                      <span className="font-semibold text-gray-900">{dept.name}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDepartmentsManager;
