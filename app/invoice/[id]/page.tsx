"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);

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
        setLoading(false);
        return;
      }

      let currentInvoice = { ...found };

      // Handle Stripe redirect success parameter
      if (searchParams.get('success') === 'true' && currentInvoice.status !== 'Paid') {
        currentInvoice = {
          ...currentInvoice,
          status: 'Paid',
          updatedAt: new Date().toISOString(),
        };
        
        // Update localStorage immediately
        const updatedInvoices = invoices.map((i) =>
          i.id === id ? currentInvoice : i
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      }

      setInvoice(currentInvoice);
      setClientName(currentInvoice.clientName);
      setClientEmail(currentInvoice.clientEmail);
      setItems(currentInvoice.items);
    } catch (e) {
      setError('Failed to load invoice data');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  const calculateTotal = () =>
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleUpdate = () => {
    if (!invoice) return;

    const updatedInvoice: Invoice = {
      ...invoice,
      clientName,
      clientEmail,
      items,
      total: calculateTotal(),
      updatedAt: new Date().toISOString(),
    };

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const invoices: Invoice[] = JSON.parse(stored);
      const updatedInvoices = invoices.map((i) =>
        i.id === id ? updatedInvoice : i
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setInvoice(updatedInvoice);
      alert('Invoice updated successfully!');
    }
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const invoices: Invoice[] = JSON.parse(stored);
      const updatedInvoices = invoices.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      router.push('/');
    }
  };

  const handleExportPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        backgroundColor: '#0b0d10',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice?.id}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Failed to generate PDF. Ensure html2canvas and jspdf are installed.');
    }
  };

  const handleGeneratePayment = () => {
    if (!invoice) return;

    // Simulate Stripe Checkout session creation
    const mockPaymentLink = `https://checkout.stripe.com/pay/cs_test_${invoice.id}`;
    const updatedInvoice = {
      ...invoice,
      status: 'Payment Link Ready',
      paymentLink: mockPaymentLink,
      updatedAt: new Date().toISOString(),
    };

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const invoices: Invoice[] = JSON.parse(stored);
      const updatedInvoices = invoices.map((i) =>
        i.id === id ? updatedInvoice : i
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setInvoice(updatedInvoice);
      alert('Payment link generated!');
    }
  };

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
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">Edit Invoice</h1>
          <Link href="/" className="text-[#4f8cff] hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div ref={invoiceRef} className="bg-[#14171c] p-6 md:p-8 rounded-lg border border-gray-800 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Line Items</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].description = e.target.value;
                      setItems(newItems);
                    }}
                    placeholder="Description"
                    className="flex-grow bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].quantity = Number(e.target.value);
                      setItems(newItems);
                    }}
                    placeholder="Qty"
                    className="w-20 bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].unitPrice = Number(e.target.value);
                      setItems(newItems);
                    }}
                    placeholder="Price"
                    className="w-24 bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-6 border-t border-gray-800 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Amount</div>
              <div className="text-2xl font-mono font-bold text-[#4f8cff]">
                ${calculateTotal().toFixed(2)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleUpdate}
                className="bg-[#4f8cff] text-black font-bold py-2 px-6 rounded hover:bg-blue-400 transition-colors text-sm"
              >
                Update Invoice
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-gray-800 py-2 px-4 rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Export PDF
              </button>
              {invoice.status === 'Draft' && (
                <button
                  onClick={handleGeneratePayment}
                  className="bg-[#4f8cff] text-black py-2 px-4 rounded hover:bg-blue-400 transition-colors text-sm font-bold"
                >
                  Generate Payment Link
                </button>
              )}
              {invoice.paymentLink && invoice.status === 'Payment Link Ready' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.paymentLink!);
                    alert('Payment link copied!');
                  }}
                  className="bg-[#4f8cff] text-black py-2 px-4 rounded hover:bg-blue-400 transition-colors text-sm font-bold"
                >
                  Copy Payment Link
                </button>
              )}
              <button
                onClick={handleDelete}
                className="bg-red-900/30 text-red-400 py-2 px-4 rounded hover:bg-red-900/50 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-mono space-y-1">
          <div>ID: {invoice.id}</div>
          <div>Status: {invoice.status}</div>
          <div>Created: {new Date(invoice.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(invoice.updatedAt).toLocaleString()}</div>
          {invoice.paymentLink && <div>Payment Link: {invoice.paymentLink}</div>}
        </div>
      </div>
    </div>
  );
}