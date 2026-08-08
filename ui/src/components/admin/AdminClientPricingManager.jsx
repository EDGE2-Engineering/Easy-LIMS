import React, { useState, useEffect } from 'react';
import { useClients } from '@/contexts/ClientsContext';
import { useFieldTests } from '@/contexts/FieldTestsContext';
import { useLabTests } from '@/contexts/LabTestsContext';
import { useAuth } from '@/contexts/AuthContext';
import { sendTelegramNotification } from '@/lib/notifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Save, Trash2, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Rupee from '../Rupee';
import { useToast } from '@/components/ui/use-toast';
import { DOCUMENT_ITEM_TYPES } from '@/data/config';

const AdminClientPricingManager = () => {
  const { clients } = useClients();
  const {
    fieldTests,
    clientFieldTestPrices,
    updateClientFieldTestPrice,
    deleteClientFieldTestPrice,
  } = useFieldTests();
  const { labTests, clientLabTestPrices, updateClientLabTestPrice, deleteClientLabTestPrice } =
    useLabTests();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('fieldTests');
  const [pendingPrices, setPendingPrices] = useState({});

  useEffect(() => {
    setPendingPrices({});
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filteredFieldTests = fieldTests.filter(
    (s) =>
      s.fieldTestType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLabTests = labTests.filter(
    (t) =>
      t.testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(t.materials) ? t.materials.join(', ') : t.materials || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      t.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePendingPriceChange = (itemId, value) => {
    setPendingPrices((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSavePrice = async (itemId, type) => {
    if (!selectedClientId) return;

    const price = pendingPrices[itemId];
    if (price === undefined) return;

    try {
      if (type === 'fieldTest') {
        await updateClientFieldTestPrice(selectedClientId, itemId, Number(price));
      } else {
        await updateClientLabTestPrice(selectedClientId, itemId, Number(price));
      }

      // Clear pending status on success
      setPendingPrices((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      toast({
        title: 'Price updated',
        description: `Successfully updated price for the client.`,
      });

      // Telegram Notification
      const itemName =
        type === 'fieldTest'
          ? fieldTests.find((s) => s.id === itemId)?.fieldTestType
          : labTests.find((t) => t.id === itemId)?.testType;
      const message = `💰 *Client Pricing Updated*\n\nClient: \`${selectedClient?.clientName}\`\nItem: \`${itemName}\`\nNew Price: \`${price}\`\nUpdated By: \`${user?.fullName || 'Unknown'}\``;
      sendTelegramNotification(message);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update price.',
        variant: 'destructive',
      });
    }
  };

  const handleRemovePrice = async (itemId, type) => {
    if (!selectedClientId) return;

    try {
      if (type === 'fieldTest') {
        await deleteClientFieldTestPrice(selectedClientId, itemId);
      } else {
        await deleteClientLabTestPrice(selectedClientId, itemId);
      }
      toast({
        title: 'Price removed',
        description: `Client-specific price removed. Default price will be used.`,
      });

      // Telegram Notification
      const itemName =
        type === 'fieldTest'
          ? fieldTests.find((s) => s.id === itemId)?.fieldTestType
          : labTests.find((t) => t.id === itemId)?.testType;
      const message = `💸 *Client Pricing Removed*\n\nClient: \`${selectedClient?.clientName}\`\nItem: \`${itemName}\`\nRemoved By: \`${user?.fullName || 'Unknown'}\``;
      sendTelegramNotification(message);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove price.',
        variant: 'destructive',
      });
    }
  };

  const getClientPrice = (itemId, type) => {
    if (type === 'fieldTest') {
      return clientFieldTestPrices.find(
        (p) => p.client_id === selectedClientId && p.field_test_id === itemId
      )?.price;
    } else {
      return clientLabTestPrices.find(
        (p) => p.client_id === selectedClientId && p.lab_test_id === itemId
      )?.price;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <Label>Select Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client to manage prices" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Label>Search Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                className="pl-10"
                placeholder="Search by name, material or HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {!selectedClientId ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-gray-900 font-semibold text-lg">No Client Selected</h3>
          <p className="text-gray-500">
            Please select a client from the dropdown above to manage their specific prices.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">
                  Managing Prices for:{' '}
                  <span className="text-primary">{selectedClient?.clientName}</span>
                </h2>
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="fieldTests">
                    {DOCUMENT_ITEM_TYPES.FIELD_TESTS.label}
                  </TabsTrigger>
                  <TabsTrigger value="labTests">{DOCUMENT_ITEM_TYPES.LAB_TESTS.label}</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="fieldTests" className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Field Test Name
                      </th>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Default Price
                      </th>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Price for Client
                      </th>
                      <th className="text-right py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFieldTests.map((fieldTest) => {
                      const clientPrice = getClientPrice(fieldTest.id, 'fieldTest');
                      return (
                        <tr
                          key={fieldTest.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-6 text-gray-600 align-middle">
                            <div className="font-medium text-gray-900">
                              {fieldTest.fieldTestType}
                            </div>
                            <div className="text-gray-500 text-xs">HSN: {fieldTest.hsnCode}</div>
                          </td>
                          <td className="py-4 px-6 text-gray-600 align-middle">
                            <Rupee />
                            {fieldTest.price.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 w-48 text-gray-600 align-middle">
                            <Input
                              type="number"
                              placeholder={`₹${fieldTest.price}`}
                              value={
                                pendingPrices[fieldTest.id] !== undefined
                                  ? pendingPrices[fieldTest.id]
                                  : (clientPrice ?? '')
                              }
                              onChange={(e) =>
                                handlePendingPriceChange(fieldTest.id, e.target.value)
                              }
                              className={
                                clientPrice || pendingPrices[fieldTest.id] !== undefined
                                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                                  : 'border-gray-200'
                              }
                            />
                          </td>
                          <td className="py-4 px-6 text-right text-gray-600 align-middle">
                            <div className="flex justify-end gap-2">
                              {pendingPrices[fieldTest.id] !== undefined &&
                                String(pendingPrices[fieldTest.id]) !==
                                  String(clientPrice ?? '') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSavePrice(fieldTest.id, 'fieldTest')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    title="Save Price for Client"
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                  </Button>
                                )}
                              {clientPrice && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemovePrice(fieldTest.id, 'fieldTest')}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">
                                      Remove custom price and revert to default
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="labTests" className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Test Name & Material
                      </th>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Default Price
                      </th>
                      <th className="text-left py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Price for Client
                      </th>
                      <th className="text-right py-3 px-6 font-bold text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLabTests.map((labTest) => {
                      const clientPrice = getClientPrice(labTest.id, 'labTest');
                      return (
                        <tr
                          key={labTest.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-6 text-gray-600 align-middle">
                            <div className="font-medium text-gray-900">{labTest.testType}</div>
                            <div className="text-gray-500 text-xs">
                              {Array.isArray(labTest.materials)
                                ? labTest.materials.join(', ')
                                : labTest.materials || '-'}{' '}
                              | HSN: {labTest.hsnCode}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-gray-600 align-middle">
                            <Rupee />
                            {labTest.price.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 w-48 text-gray-600 align-middle">
                            <Input
                              type="number"
                              placeholder={`₹${labTest.price}`}
                              value={
                                pendingPrices[labTest.id] !== undefined
                                  ? pendingPrices[labTest.id]
                                  : (clientPrice ?? '')
                              }
                              onChange={(e) => handlePendingPriceChange(labTest.id, e.target.value)}
                              className={
                                clientPrice || pendingPrices[labTest.id] !== undefined
                                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                                  : 'border-gray-200'
                              }
                            />
                          </td>
                          <td className="py-4 px-6 text-right text-gray-600 align-middle">
                            <div className="flex justify-end gap-2">
                              {pendingPrices[labTest.id] !== undefined &&
                                String(pendingPrices[labTest.id]) !== String(clientPrice ?? '') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSavePrice(labTest.id, 'labTest')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Save className="w-4 h-4 mr-1" /> Save
                                  </Button>
                                )}
                              {clientPrice && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemovePrice(labTest.id, 'labTest')}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-xs">
                                      Remove custom price and revert to default
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AdminClientPricingManager;
