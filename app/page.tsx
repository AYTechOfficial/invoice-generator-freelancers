'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
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

export default function Dashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setInvoices(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse invoices', e);
      }
    }
  }, []);

  const saveToStorage = (data: Invoice[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setInvoices(data);
  };

  const handleCreate = () => {
    if (!clientName.trim()) return;
    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      clientName,
      clientEmail,
      items: [],
      total: 0,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newInvoice, ...invoices];
    saveToStorage(updated);
    setClientName('');
    setClientEmail('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const updated = invoices.filter((inv) => inv.id !== id);
      saveToStorage(updated);
    }
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
    alert('Share link copied to clipboard!');
  };

  const sendEmail = (id: string) => {
    const shareUrl = `${window.location.origin}/share/${id}`;
    const subject = encodeURIComponent(`Invoice ${id.slice(0, 8)} from Freelance Invoice Lite`);
    const body = encodeURIComponent(`Please find your invoice attached.\nView it here: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#e6e9ef]">Freelance Invoice Lite</h1>
        <p className="text-sm text-gray-500 mt-1">Mobile-first client-side invoicing</p>
      </header>

      <section className="mb-8 bg-[#14171c] p-4 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-[#4f8cff]">New Invoice</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="bg-[#0b0d10] border border-gray-700 rounded px-3 py-2 text-sm focus:border-[#4f8cff] outline-none"
          />
          <input
            type="email"
            placeholder="Client Email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="bg-[#0b0d10] border border-gray-700 rounded px-3 py-2 text-sm focus:border-[#4f8cff] outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!clientName.trim()}
            className="bg-[#4f8cff] hover:bg-[#3a7bd5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Create Invoice
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-[#4f8cff]">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-500 italic">No invoices yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-[#14171c] p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-gray-500">{inv.id.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      inv.status === 'Paid' ? 'bg-green-900 text-green-300' :
                      inv.status === 'Payment Link Ready' ? 'bg-blue-900 text-blue-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base">{inv.clientName}</h3>
                  <p className="text-sm text-gray-400">{inv.clientEmail}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-lg font-bold text-[#e6e9ef]">${inv.total.toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/invoice/${inv.id}`)} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded transition-colors">Edit</button>
                    <button onClick={() => copyLink(inv.id)} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded transition-colors">Copy Link</button>
                    <button onClick={() => sendEmail(inv.id)} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded transition-colors">Email</button>
                    <button onClick={() => handleDelete(inv.id)} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-3 py-1 rounded transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}