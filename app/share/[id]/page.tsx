"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  total: number;
  status: 'Draft' | 'Payment Link Ready' | 'Paid';
  createdAt: string;
  updatedAt: string;
  paymentLink?: string;
}

const STORAGE_KEY = 'freelance_invoice_lite_data';

export default function ShareInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setError('No data found');
      setLoading(false);
      return;
    }

    try {
      const invoices: Invoice[] = JSON.parse(stored);
      const found = invoices.find((i) => i.id === id);

      if (!found) {
        setError('Invoice not found');
      } else {
        setInvoice(found);
      }
    } catch (e) {
      setError('Failed to load invoice data');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] flex items-center justify-center">
        Loading invoice...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Invoice not found'}</p>
          <Link href="/" className="text-[#4f8cff] hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-sans p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-[#14171c] p-6 md:p-10 rounded-lg border border-gray-800 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">INVOICE</h1>
            <div className="font-mono text-sm text-gray-400">#{invoice.id.slice(0, 8)}</div>
          </div>
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                invoice.status === 'Paid'
                  ? 'text-green-400'
                  : invoice.status === 'Payment Link Ready'
                  ? 'text-yellow-400'
                  : 'text-gray-400'
              }`}
            >
              {invoice.status}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(invoice.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mb-8 pb-6 border-b border-gray-800">
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Bill To</h2>
          <div className="text-lg font-semibold">{invoice.clientName}</div>
          {invoice.clientEmail && (
            <div className="text-gray-400 text-sm">{invoice.clientEmail}</div>
          )}
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-3 font-normal">Description</th>
              <th className="pb-3 font-normal text-right">Qty</th>
              <th className="pb-3 font-normal text-right">Price</th>
              <th className="pb-3 font-normal text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-800/50">
                <td className="py-3 text-sm">{item.description}</td>
                <td className="py-3 text-right font-mono text-sm">{item.quantity}</td>
                <td className="py-3 text-right font-mono text-sm">
                  ${item.unitPrice.toFixed(2)}
                </td>
                <td className="py-3 text-right font-mono text-sm">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
              Total Amount
            </div>
            <div className="text-3xl font-mono font-bold text-[#4f8cff]">
              ${invoice.total.toFixed(2)}
            </div>
          </div>
        </div>

        {invoice.paymentLink && (
          <div className="bg-[#0b0d10] p-6 rounded-lg border border-gray-700 text-center">
            <p className="text-gray-400 mb-4 text-sm">
              Pay securely via Stripe Checkout
            </p>
            <a
              href={invoice.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#4f8cff] text-black font-bold py-3 px-8 rounded hover:bg-blue-400 transition-colors text-sm"
            >
              Pay Now
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <div className="text-xs text-gray-600">
            Generated by Freelance Invoice Lite
          </div>
        </div>
      </div>
    </div>
  );
}