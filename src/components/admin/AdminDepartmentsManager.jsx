
import React from 'react';
import { DEPARTMENTS } from '@/data/config';
import { Building2, Info } from 'lucide-react';

const AdminDepartmentsManager = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <p>
                    Departments are defined in the application configuration file (<code className="font-mono bg-blue-100 px-1 rounded">src/data/config.js</code>).
                    Contact a developer to add, rename, or remove departments.
                </p>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 w-12">#</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Lab Test Department Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DEPARTMENTS.map((dept) => (
                            <tr key={dept.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-400 font-mono">{dept.id}</td>
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary/60" />
                                        {dept.name}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDepartmentsManager;
