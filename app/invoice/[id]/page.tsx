'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'Draft' | 'Payment Link Ready' | 'Paid'>('Draft');
  const [paymentLink, setPaymentLink] = useState<string | undefined>();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const invoices: Invoice[] = JSON.parse(stored);
        const found = invoices.find((inv) => inv.id === id);
        if (found) {
          setInvoice(found);
          setClientName(found.clientName);
          setClientEmail(found.clientEmail);
          setItems(found.items);
          setTotal(found.total);
          setStatus(found.status);
          setPaymentLink(found.paymentLink);
          
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('success') && found.status !== 'Paid') {
            const updated = { ...found, status: 'Paid', updatedAt: new Date().toISOString() };
            const updatedList = invoices.map((inv) => inv.id === id ? updated : inv);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
            setInvoice(updated);
            setStatus('Paid');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          alert('Invoice not found.');
          router.push('/');
        }
      } catch (e) {
        console.error('Failed to load invoice', e);
        router.push('/');
      }
    }
    setLoading(false);
  }, [id, router]);

  const calculateTotal = () => {
    const t = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    setTotal(t);
  };

  useEffect(() => {
    calculateTotal();
  }, [items]);

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)));
  };

  const handleUpdate = () => {
    if (!invoice) return;
    const updatedInvoice: Invoice = {
      ...invoice,
      clientName,
      clientEmail,
      items,
      total,
      status,
      paymentLink,
      updatedAt: new Date().toISOString(),
    };
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const invoices: Invoice[] = JSON.parse(stored);
      const updatedList = invoices.map((inv) => (inv.id === id ? updatedInvoice : inv));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setInvoice(updatedInvoice);
      alert('Invoice updated successfully.');
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const invoices: Invoice[] = JSON.parse(stored);
        const updatedList = invoices.filter((inv) => inv.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        router.push('/');
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
    alert('Share link copied to clipboard!');
  };

  const sendEmail = () => {
    const shareUrl = `${window.location.origin}/share/${id}`;
    const subject = encodeURIComponent(`Invoice ${id.slice(0, 8)} from Freelance Invoice Lite`);
    const body = encodeURIComponent(`Please find your invoice attached.\nView it here: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const generatePaymentLink = async () => {
    if (status !== 'Draft') {
      alert('Only Draft invoices can have a payment link generated.');
      return;
    }
    const mockSessionId = crypto.randomUUID();
    const stripeUrl = `https://checkout.stripe.com/pay/cs_test_${mockSessionId.substring(0, 16)}#view_within_one_click`;
    
    const updatedInvoice: Invoice = {
      ...invoice!,
      status: 'Payment Link Ready',
      paymentLink: stripeUrl,
      updatedAt: new Date().toISOString(),
    };
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const invoices: Invoice[] = JSON.parse(stored);
      const updatedList = invoices.map((inv) => (inv.id === id ? updatedInvoice : inv));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setInvoice(updatedInvoice);
      setStatus('Payment Link Ready');
      setPaymentLink(stripeUrl);
      alert('Payment link generated!');
    }
  };

  const exportPDF = () => {
    if (!invoice) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('INVOICE', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`ID: ${invoice.id}`, 14, 30);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 36);
    doc.text(`Status: ${invoice.status}`, 14, 42);
    
    doc.text(`Bill To:`, 14, 55);
    doc.text(invoice.clientName, 14, 61);
    doc.text(invoice.clientEmail, 14, 67);
    
    const tableData = invoice.items.map(item => [
      item.description || 'Untitled Item',
      item.quantity.toString(),
      `$${item.rate.toFixed(2)}`,
      `$${(item.quantity * item.rate).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Qty', 'Rate', 'Total']],
      body: tableData,
      theme: 'grid',
      styles: { font: 'monospace', fontSize: 10 },
      headStyles: { fillColor: [79, 140, 255], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [20, 23, 28] }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY ?? 75;
    doc.setFontSize(14);
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 14, finalY + 10);
    
    doc.save(`invoice-${invoice.id}.pdf`);
  };

  if (loading) return <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-8">Loading...</div>;
  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-4 md:p-8 font-sans">
      <header className="mb-6 flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e6e9ef]">Edit Invoice</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{invoice.id}</p>
        </div>
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white">Back to Dashboard</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-[#14171c] p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-[#4f8cff]">Client Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-[#0b0d10] border border-gray-700 rounded px-3 py-2 text-sm focus:border-[#4f8cff] outline-none"
                placeholder="Client Name"
              />
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="bg-[#0b0d10] border border-gray-700 rounded px-3 py-2 text-sm focus:border-[#4f8cff] outline-none"
                placeholder="Client Email"
              />
            </div>
          </section>

          <section className="bg-[#14171c] p-4 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#4f8cff]">Line Items</h2>
              <button onClick={addItem} className="text-xs bg-[#4f8cff] hover:bg-[#3a7bd5] text-white px-3 py-1 rounded transition-colors">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[#0b0d10] p-2 rounded border border-gray-800">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="col-span-6 bg-transparent border-none text-sm focus:ring-0 p-0"
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="col-span-2 bg-transparent border-none text-sm font-mono focus:ring-0 p-0 text-right"
                    min="0"
                  />
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-2 bg-transparent border-none text-sm font-mono focus:ring-0 p-0 text-right"
                    min="0"
                    step="0.01"
                  />
                  <span className="col-span-1 font-mono text-sm text-right">${(item.quantity * item.rate).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.id)} className="col-span-1 text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              ))}
              {items.length === 0 && <p className="text-gray-500 text-sm italic py-2">No items added yet.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-[#14171c] p-4 rounded-lg border border-gray-800 sticky top-4">
            <h2 className="text-lg font-semibold mb-4 text-[#4f8cff]">Actions & Summary</h2>
            
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-1">Total Amount</p>
              <p className="text-3xl font-mono font-bold text-[#e6e9ef]">${total.toFixed(2)}</p>
            </div>

            <div className="space-y-3 mb-6">
              <button onClick={handleUpdate} className="w-full bg-[#4f8cff] hover:bg-[#3a7bd5] text-white font-medium py-2 px-4 rounded transition-colors">Update Invoice</button>
              <button onClick={copyLink} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors">Copy Share Link</button>
              <button onClick={sendEmail} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors">Send via Email</button>
              <button onClick={generatePaymentLink} disabled={status !== 'Draft'} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded transition-colors">Generate Payment Link</button>
              <button onClick={exportPDF} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors">Export PDF</button>
              <button onClick={handleDelete} className="w-full bg-red-900/50 hover:bg-red-900 text-red-300 py-2 px-4 rounded transition-colors">Delete Invoice</button>
            </div>

            {paymentLink && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-400 mb-1">Payment Link:</p>
                <p className="text-xs font-mono break-all text-[#4f8cff]">{paymentLink}</p>
                <button 
                  onClick={() => { navigator.clipboard.writeText(paymentLink!); alert('Copied!'); }}
                  className="mt-2 text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded w-full"
                >
                  Copy Payment Link
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}