"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, EmptyState } from "@/components/ui"; // Assuming these are available

// --- Shared Record Type (as per brief) ---
type Record = {
  id: string;
  title: string; // Will map to clientName or invoiceNumber for display
  notes: string;
  createdAt: string;
};

// --- Extended Invoice Types (implied by flows) ---
type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceStatus = 'Draft' | 'Payment Link Ready' | 'Paid';

type Invoice = Record & {
  invoiceNumber: string;
  clientName: string; // Used for 'title' in the Record context
  clientEmail: string;
  clientAddress: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  status: InvoiceStatus;
  paymentLink?: string;
  updatedAt: string; // ISO string
};

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return dateString; // Fallback for invalid date strings
  }
};

const calculateTotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
};

export default function ShareInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("Invoice ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const storedInvoicesString = localStorage.getItem("lastmile:invoice-generator-freelancers:invoices");
      if (storedInvoicesString) {
        const allInvoices: Invoice[] = JSON.parse(storedInvoicesString);
        const foundInvoice = allInvoices.find(inv => inv.id === invoiceId);
        if (foundInvoice) {
          setInvoice(foundInvoice);
        } else {
          setError("Invoice not found.");
        }
      } else {
        setError("No invoices found in storage.");
      }
    } catch (e) {
      console.error("Failed to load invoice from localStorage:", e);
      setError("Failed to load invoice data.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const totalAmount = useMemo(() => {
    return invoice ? calculateTotal(invoice.items) : 0;
  }, [invoice]);

  const getStatusBadgeClasses = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-700 text-green-200';
      case 'Payment Link Ready':
        return 'bg-blue-700 text-blue-200'; // Using accent color for consistency
      case 'Draft':
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-inter flex items-center justify-center p-4">
        <p className="text-lg">Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-inter flex items-center justify-center p-4">
        <EmptyState
          title="Invoice Not Found"
          description={error}
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-[#4f8cff]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>}
        />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-inter flex items-center justify-center p-4">
        <EmptyState
          title="Invoice Not Found"
          description="The invoice you are looking for could not be found. It might have been deleted or the link is incorrect."
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-[#4f8cff]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-inter p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <Card className="p-6 bg-[#14171c] shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-gray-700 pb-4">
            <h1 className="text-3xl font-bold text-[#e6e9ef] mb-2 sm:mb-0">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClasses(invoice.status)} font-mono`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold text-[#e6e9ef] mb-3">Billed To:</h2>
              <p className="text-gray-300 font-inter">{invoice.clientName}</p>
              <p className="text-gray-400 font-inter">{invoice.clientEmail}</p>
              <p className="text-gray-400 font-inter whitespace-pre-wrap">{invoice.clientAddress}</p>
            </div>
            <div className="md:text-right">
              <h2 className="text-lg font-semibold text-[#e6e9ef] mb-3">Invoice Details:</h2>
              <p className="text-gray-300">
                <span className="font-semibold">Invoice ID:</span> <span className="font-mono text-[#4f8cff]">{invoice.id}</span>
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Issue Date:</span> <span className="font-mono">{formatDate(invoice.issueDate)}</span>
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Due Date:</span> <span className="font-mono">{formatDate(invoice.dueDate)}</span>
              </p>
              <p className="text-gray-300">
                <span className="font-semibold">Created:</span> <span className="font-mono">{formatDate(invoice.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#e6e9ef] mb-3">Items:</h2>
            <div className="overflow-x-auto rounded-md border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {invoice.items.length > 0 ? (
                    invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-800 transition-colors duration-200">
                        <td className="px-4 py-3 whitespace-normal text-sm font-inter text-gray-300 max-w-xs break-words">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-300 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-300 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-300 text-right">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-sm text-gray-400">
                        No items on this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-800 border-t border-gray-700">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-base font-semibold text-[#e6e9ef] uppercase">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold font-mono text-[#4f8cff]">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {invoice.notes && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#e6e9ef] mb-3">Notes:</h2>
              <p className="text-gray-300 bg-gray-800 p-4 rounded-md whitespace-pre-wrap max-w-full break-words">
                {invoice.notes}
              </p>
            </div>
          )}

          {invoice.paymentLink && invoice.status === 'Payment Link Ready' && (
            <div className="mb-8 p-4 bg-blue-900/30 border border-blue-700 rounded-md">
              <h2 className="text-lg font-semibold text-[#e6e9ef] mb-2">Payment Link:</h2>
              <a
                href={invoice.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4f8cff] hover:underline font-mono break-all"
              >
                {invoice.paymentLink}
              </a>
              <p className="text-gray-400 text-sm mt-2">
                This invoice is ready for payment. Click the link above to proceed.
              </p>
            </div>
          )}

          <div className="text-center text-gray-500 text-sm mt-8 pt-4 border-t border-gray-800">
            <p>Generated by Freelance Invoice Lite</p>
            <p className="font-mono">Invoice ID: {invoice.id}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
