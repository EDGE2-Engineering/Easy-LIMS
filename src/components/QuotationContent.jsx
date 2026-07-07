import React from 'react';
import { format } from 'date-fns';
import { DOCUMENT_ITEM_TYPE_KEYS } from '@/data/config';

// Helper: number to Indian words
const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
  };
  const [integerPart, decimalPart] = num.toFixed(2).split('.');
  const intNum = parseInt(integerPart);
  if (intNum === 0) {
    return decimalPart && parseInt(decimalPart) > 0
      ? 'Zero Rupees and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise'
      : 'Zero Rupees';
  }
  let result = '';
  if (intNum >= 10000000) result += convertLessThanThousand(Math.floor(intNum / 10000000)) + ' Crore ';
  const lakhs = Math.floor((intNum % 10000000) / 100000);
  if (lakhs > 0) result += convertLessThanThousand(lakhs) + ' Lakh ';
  const thousands = Math.floor((intNum % 100000) / 1000);
  if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
  const remainder = intNum % 1000;
  if (remainder > 0) result += convertLessThanThousand(remainder);
  result = result.trim() + ' Rupees';
  if (decimalPart && parseInt(decimalPart) > 0) result += ' and ' + convertLessThanThousand(parseInt(decimalPart)) + ' Paise';
  return result + ' Only';
};

const roundAmount = (v) => Math.floor(v);

/**
 * QuotationContent — renders a single flowing A4 document.
 * No page splitting logic here; Paged.js handles that via CSS break rules.
 */
const QuotationContent = ({
  quoteDetails,
  items,
  documentType,
  discount,
  discountShow,
  daysShow,
  sealShow,
  isInterstate,
  selectedBank,
  settings,
  currentVersion,
  // Derived section data
  derivedPaymentTermsTypes,
  derivedTcTypes,
  derivedTechTypes,
  paymentTerms,
  terms,
  technicals,
  // Tax
  taxCGST,
  taxSGST,
  taxIGST,
  taxTotalPercent,
  // Base URL for assets
  baseUrl,
}) => {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const grandTotal = roundAmount(subtotal * (1 - discount / 100) * (1 + taxTotalPercent / 100));

  const getFormattedDocNumber = () => {
    const baseNum = quoteDetails.quoteNumber;
    if (!baseNum) return 'Pending';
    if (documentType === 'Quotation') return `${baseNum}/R${currentVersion || 1}`;
    return baseNum;
  };

  const docNumber = getFormattedDocNumber();
  const hasContractor = quoteDetails.contractorName && quoteDetails.contractorName.trim() && quoteDetails.contractorName.trim() !== '-';

  // Build payment terms sections
  const paySections = (derivedPaymentTermsTypes || []).map((type) => ({
    type,
    items: (paymentTerms || []).filter((t) => t.type === type),
  })).filter((s) => s.items.length > 0);

  // Build T&C sections
  const tcSections = (derivedTcTypes || []).map((type) => ({
    type,
    items: (terms || []).filter((t) => t.type === type),
  })).filter((s) => s.items.length > 0);

  // Build technicals sections
  const techSections = (derivedTechTypes || []).map((type) => ({
    type,
    items: (technicals || []).filter((t) => t.type === type),
  })).filter((s) => s.items.length > 0);

  const hasSections = paySections.length > 0 || tcSections.length > 0 || techSections.length > 0;

  return (
    <>
      {/* ── PAGE 1+: Items table ─────────────────────────────────────── */}
      <div className="section-items">
        {/* Hidden string for @page running footer */}
        <div className="footer-company-string" aria-hidden="true">
          EDGE2 Engineering Solutions India Pvt. Ltd.
        </div>
        {/* Watermark — fixed position, repeats on every page */}
        <div className="watermark" aria-hidden="true">
          EDGE2 Engineering Solutions India Pvt. Ltd.
        </div>

        {/* Company Header */}
        <div className="flex justify-between items-start gap-2 border-b pb-4 mb-2 min-w-0">
          <div style={{ width: '30%' }}>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              {documentType.toUpperCase()}
            </h3>
            <p className="text-gray-500 mt-1 text-xs">
              {quoteDetails.quoteNumber ? docNumber : <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Pending</span>}
            </p>
            <p className="text-gray-500 mt-1 text-xs">
              Date: {format(new Date(quoteDetails.date || new Date()), 'dd MMM yyyy')}
            </p>
          </div>
          <div style={{ width: '70%' }} className="flex items-center gap-2 text-right">
            <div className="text-right min-w-0 flex-1">
              <h2 className="font-bold text-lg">EDGE2 Engineering Solutions India Pvt. Ltd.</h2>
              <p className="text-gray-600 text-xs">Shivaganga Arcade, B35/130, 6th Cross, 6th Block,</p>
              <p className="text-gray-600 text-xs">Vishweshwaraiah Layout, Ullal Upanagar,</p>
              <p className="text-gray-600 text-xs">Bangalore - 560056, Karnataka</p>
              <p className="text-gray-600 text-xs">
                <strong>PAN:</strong> AACCE1702A, <strong>GSTIN:</strong> 29AACCE1702A1ZD
              </p>
              <p className="text-gray-600 text-xs">
                <strong>Phone:</strong> 09448377127 / 09880973810 / 080-50056086
              </p>
              <p className="text-gray-600 text-xs flex justify-end gap-4">
                <span><strong>Email:</strong> info@edge2.in</span>
                <span><strong>Website:</strong> https://edge2.in</span>
              </p>
            </div>
            <img
              src={`${baseUrl}edge2-logo.png`}
              alt="EDGE2 Logo"
              style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Client / Contractor / Project row */}
        <div
          className={`grid ${hasContractor ? 'grid-cols-3' : 'grid-cols-2'} gap-6 mb-2 text-sm py-0 border-b`}
        >
          <div className="space-y-1">
            <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">Client</h3>
            <p className="font-bold text-gray-900 text-xs">{quoteDetails.clientName || '-'}</p>
            <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.clientAddress}</p>
            <p className="text-gray-600 mt-1 text-xs">Name: {quoteDetails.name || '-'}</p>
            <p className="text-gray-600 mt-1 text-xs">Email: {quoteDetails.email || '-'}</p>
            <p className="text-gray-600 text-xs">Phone: {quoteDetails.phone || '-'}</p>
            <p className="text-gray-600 mt-1 text-xs">GSTIN: {quoteDetails.gstin || '-'}</p>
          </div>
          {hasContractor && (
            <div className="space-y-1 border-l pl-2">
              <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">Contractor</h3>
              <p className="font-bold text-gray-900 text-xs">{quoteDetails.contractorName || '-'}</p>
              <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.contractorAddress}</p>
            </div>
          )}
          <div className="space-y-1 border-l pl-2">
            <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b pb-1 mb-2">Project Details</h3>
            <p className="font-bold text-gray-900 text-xs">{quoteDetails.projectName || '-'}</p>
            <p className="text-gray-600 whitespace-pre-wrap text-xs">{quoteDetails.projectAddress}</p>
          </div>
        </div>
        <div className="text-xs text-right" style={{ color: '#374151' }}>
          Created by: {quoteDetails.generatedBy}
        </div>

        {/* Items Table */}
        <table className="quote-items-table w-full mb-8 mt-2" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: documentType === 'Quotation' && daysShow ? '48%' : '53%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            {documentType === 'Quotation' && daysShow && <col style={{ width: '5%' }} />}
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              {[
                { label: 'Sl No', className: 'col-slno' },
                { label: 'Description', className: documentType === 'Quotation' && daysShow ? 'col-desc' : 'col-desc-nodaysshow' },
                { label: 'HSN / SAC', className: 'col-hsn' },
                { label: 'Price Per Unit', className: 'col-price' },
                { label: 'Unit', className: 'col-unit' },
                { label: 'Qty', className: 'col-qty' },
                ...(documentType === 'Quotation' && daysShow ? [{ label: 'Days', className: 'col-days' }] : []),
                { label: 'Total', className: 'col-total' },
              ].map((col) => (
                <th
                  key={col.label}
                  className={`border border-gray-200 py-3 px-1 font-semibold text-xs ${col.className} ${col.label === 'Total' ? 'text-right' : 'text-center'}`}
                  style={{ color: 'rgb(33, 112, 187)' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={documentType === 'Quotation' && daysShow ? 8 : 7}
                  className="py-8 text-center text-gray-400 italic"
                >
                  No items added yet.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const slNo = idx + 1;
                const groupItems = item.packageGroupId ? items.filter((x) => x.packageGroupId === item.packageGroupId) : [];
                const isFirstInGroup = groupItems[0]?.id === item.id;
                const isLastInGroup = groupItems[groupItems.length - 1]?.id === item.id;
                const nextItem = items[idx + 1];
                const nextItemIsPackage = nextItem && nextItem.packageGroupId;
                const persistentB = item.packageGroupId && isLastInGroup && !nextItemIsPackage ? 'package-group-persistent-b' : '';

                return (
                  <React.Fragment key={item.id}>
                    {/* Package group name row */}
                    {item.packageGroupId && isFirstInGroup && (
                      <tr>
                        <td
                          colSpan={documentType === 'Quotation' && daysShow ? 8 : 7}
                          className="py-1 px-2 text-xs font-semibold text-gray-700 border-t border-gray-200"
                          style={{ backgroundColor: '#f9fafb' }}
                        >
                          📦 {item.packageName}
                        </td>
                      </tr>
                    )}
                    <tr className={persistentB}>
                      <td className="py-2 px-1 text-center text-gray-600 text-xs align-top border-r border-l border-gray-200">
                        {slNo}
                      </td>
                      <td className={`py-1 px-2 align-top border-r border-l border-gray-200 ${persistentB}`}>
                        
                        <span className="font-medium text-gray-900 text-xs block">{item.description}</span>
                        <br/>
                        <span className="text-xs text-gray-400 uppercase block italic">
                          {item.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS ? 'Field Test' :
                           item.type === DOCUMENT_ITEM_TYPE_KEYS.LAB_TESTS ? 'Lab Test' :
                           item.type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING ? 'Sampling' : 'Service'}
                        </span>
                        {(item.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS || item.type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING) &&
                          ((item.methodOfSampling && item.methodOfSampling !== 'NA') ||
                           (typeof item.numBHs === 'number' && item.numBHs > 0) ||
                           (item.measure && item.measure !== 'NA')) && (
                          <span className="text-xs text-gray-500 block">
                            {[
                              item.methodOfSampling && item.methodOfSampling !== 'NA' ? `Method: ${item.methodOfSampling}` : null,
                              typeof item.numBHs === 'number' && item.numBHs > 0 ? `BHs: ${item.numBHs}` : null,
                              item.measure && item.measure !== 'NA' ? `Measure: ${item.measure}` : null,
                            ].filter(Boolean).join(' | ')}
                          </span>
                        )}
                      </td>
                      <td className={`py-2 px-1 text-center text-gray-600 text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                        {item.hsnCode || ''}
                      </td>
                      <td className={`py-2 px-1 text-right text-gray-900 font-medium text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                        <span className="rupee">₹</span>{Number(item.price || 0).toLocaleString()}
                      </td>
                      <td className={`py-2 px-1 text-center text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                        {item.unit || 'No.'}
                      </td>
                      <td className={`py-2 px-1 text-center text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                        {item.qty}
                      </td>
                      {documentType === 'Quotation' && daysShow && (
                        <td className={`py-2 px-1 text-center text-gray-600 font-medium text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                          {item.type === DOCUMENT_ITEM_TYPE_KEYS.FIELD_TESTS ||
                           item.type === DOCUMENT_ITEM_TYPE_KEYS.LAB_TESTS ||
                           item.type === DOCUMENT_ITEM_TYPE_KEYS.SAMPLING
                            ? (item.numDays ?? 1)
                            : '—'}
                        </td>
                      )}
                      <td className={`py-2 px-1 text-right text-gray-900 font-medium text-xs align-top border-r border-l border-gray-200 ${persistentB}`}>
                        <span className="rupee">₹</span>{item.total.toLocaleString()}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {/* Totals block */}
        <div className="totals-block flex justify-left">
          <div className="w-full space-y-3">
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Subtotal</span>
              <span><span className="rupee">₹</span>{subtotal.toLocaleString()}</span>
            </div>
            {discountShow && discount > 0 && (
              <div className="flex justify-between text-green-600 text-xs">
                <span>Discount ({discount}%)</span>
                <span>- <span className="rupee">₹</span>{(subtotal * (discount / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {isInterstate ? (
              <div className="flex justify-between text-gray-600 text-xs">
                <span>IGST ({taxIGST}%)</span>
                <span><span className="rupee">₹</span>{(subtotal * (1 - discount / 100) * (taxIGST / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>CGST ({taxCGST}%)</span>
                  <span><span className="rupee">₹</span>{(subtotal * (1 - discount / 100) * (taxCGST / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>SGST ({taxSGST}%)</span>
                  <span><span className="rupee">₹</span>{(subtotal * (1 - discount / 100) * (taxSGST / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-gray-600 text-xs font-medium">
              <span>Total Tax Amount</span>
              <span><span className="rupee">₹</span>{(subtotal * (1 - discount / 100) * (taxTotalPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span><span className="rupee">₹</span>{grandTotal.toLocaleString()}</span>
            </div>
            {documentType === 'Tax Invoice' && quoteDetails.paymentAmount > 0 && (
              <>
                <div className="flex justify-between text-xs text-red-600">
                  <span>Less: Payment Received</span>
                  <span>- <span className="rupee">₹</span>{roundAmount(Number(quoteDetails.paymentAmount)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Balance Due</span>
                  <span><span className="rupee">₹</span>{roundAmount(grandTotal - Number(quoteDetails.paymentAmount)).toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="mt-2 text-xs text-gray-600 italic">
              <span className="font-medium">Amount in Words: Rupees </span>
              <span>{numberToWords(grandTotal)} /-</span>
            </div>
            {discount > 0 && (
              <div className="mt-2 text-xs text-gray-600 italic">
                <span className="font-medium">Note: Discount included in the above amount.</span>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-600 italic">
              * This is a computer generated {documentType.toLowerCase()} and does not require a physical signature.
            </div>
            {sealShow && (
              <div className="flex justify-end mt-4">
                <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src={`${baseUrl}company-seal.png`}
                    alt="Company Seal"
                    style={{ width: 96, height: 96, objectFit: 'contain' }}
                  />
                  <p style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                    For EDGE2 Engineering Solutions India Pvt. Ltd.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PAGE: Bank Details + General T&C ─────────────────────────── */}
      <div className="section-bank-details">
        <div className="text-gray-700 text-sm">
          {/* Bank Details */}
          <div className={`grid grid-cols-2 gap-4 mt-2 text-left text-xs`}>
            <div>
              <h2 className="font-semibold mb-4 text-sm text-gray-900">Bank Details</h2>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Name:', selectedBank?.bank_account_holder_name || settings?.bank_account_holder_name || 'EDGE2 Engineering Solutions India Pvt. Ltd.'],
                    ['A/c. No:', selectedBank?.bank_account_number || settings?.bank_account_number || '560321000022687'],
                    ['IFSC Code:', selectedBank?.ifsc_code || settings?.ifsc_code || 'UBIN0907634'],
                    ['Branch:', selectedBank?.branch_name || settings?.branch_name || 'Bangalore - Peenya'],
                    ['Bank:', selectedBank?.bank_name || settings?.bank_name || 'Union Bank of India'],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="py-1 font-semibold text-gray-900" style={{ width: 128 }}>{label}</td>
                      <td className="py-1 text-gray-700">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedBank?.qr_code_url && (
              <div className="flex flex-col items-center justify-center">
                <img
                  src={selectedBank.qr_code_url}
                  alt="UPI QR Code"
                  className="upi-qr-code-img object-contain"
                />
              </div>
            )}
          </div>

          {/* Payment Received Details (Tax Invoice only) */}
          {documentType === 'Tax Invoice' && quoteDetails.paymentDate && (
            <div className="mt-6 pt-4 border-t">
              <h2 className="font-semibold text-left mb-3 text-sm text-gray-900">Payment Received Details</h2>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold text-gray-900" style={{ width: 160 }}>Payment Received Date:</td>
                    <td className="py-1 text-gray-700">{format(new Date(quoteDetails.paymentDate), 'dd MMM yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-gray-900">Mode of Payment:</td>
                    <td className="py-1 text-gray-700">{quoteDetails.paymentMode}</td>
                  </tr>
                  {quoteDetails.paymentAmount && (
                    <tr>
                      <td className="py-1 font-semibold text-gray-900">Amount Received:</td>
                      <td className="py-1 text-gray-700">
                        <span className="rupee">₹</span>
                        {Number(quoteDetails.paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {quoteDetails.bankDetails && (
                    <tr>
                      <td className="py-1 font-semibold text-gray-900">Transaction Details:</td>
                      <td className="py-1 text-gray-700">{quoteDetails.bankDetails}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* General Terms & Conditions */}
          <div className="mt-6 pt-4 border-t w-full">
            <h2 className="font-semibold text-left mb-3 text-gray-900">General Terms &amp; Conditions</h2>
            <div className="text-xs whitespace-pre-wrap text-gray-700">
              {quoteDetails.generalTerms !== undefined
                ? quoteDetails.generalTerms
                : `- This quotation is valid for 30 days only\n- GST @ 18% as given above\n- Billing will be made based on the actual quantity involved in work\n- Any quantities exceeding the quantities mentioned above will be subject to additional charges\n- The rates quoted in this offer are valid only for the quantum of this scope of quotation. If there is any reduction in the quantity, the rates are subject to an increase accordingly and present quotation stands invalid\n- Reports will be issued only after confirmation of 100% full payment`}
            </div>
          </div>
        </div>
      </div>

      {/* ── PAGE(S): Payment Terms ────────────────────────────────────── */}
      {paySections.length > 0 && (
        <div className="section-payment-terms">
          <h2 className="font-semibold text-lg mb-6 text-center pb-2">Payment Terms</h2>
          <div className="space-y-4">
            {paySections.map((section) => (
              <div key={section.type} className="section-block">
                {section.type !== 'general' && section.type !== 'General' && (
                  <h3 className="font-bold text-sm text-gray-800 border-l-4 border-primary pl-2 mb-2">
                    {section.type}
                  </h3>
                )}
                {section.items.map((item) => (
                  <div key={item.id} className="text-xs text-gray-700 leading-relaxed mb-1 pl-2">
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAGE(S): Terms & Conditions ──────────────────────────────── */}
      {tcSections.length > 0 && (
        <div className="section-tc">
          <h2 className="font-semibold text-lg mb-4 text-center">Terms &amp; Conditions</h2>
          <div className="text-left text-gray-500 text-sm">
            <div className="space-y-1">
              {tcSections.map((section) => (
                <div key={section.type} className="section-block">
                  {section.type !== 'general' && section.type !== 'General' && (
                    <h3 className="font-bold text-sm text-gray-800 border-l-4 border-primary pl-2 mb-2 mt-4">
                      {section.type}
                    </h3>
                  )}
                  {section.items.map((item) => (
                    <div key={item.id} className="flex gap-2 text-xs leading-relaxed mb-1">
                      <span className="whitespace-pre-line pl-2">{item.text}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE(S): Technical Specifications ────────────────────────── */}
      {techSections.length > 0 && (
        <div className="section-technicals">
          <h2 className="font-semibold text-lg mb-6 text-center pb-2">Technicals</h2>
          <div className="space-y-4">
            {techSections.map((section) => (
              <div key={section.type} className="section-block">
                <h3 className="font-bold text-sm text-gray-800 border-l-4 border-primary pl-2 mb-2">
                  {section.type}
                </h3>
                {section.items.map((item) => (
                  <div key={item.id} className="text-xs text-gray-700 leading-relaxed mb-1 pl-2">
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default QuotationContent;
