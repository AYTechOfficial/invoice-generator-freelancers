"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function Dashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }
  ]);

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

  const persistInvoices = (newInvoices: Invoice[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newInvoices));
    setInvoices(newInvoices);
  };

  const handleCreate = () => {
    if (!clientName.trim()) return alert('Client name is required');
    
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      clientName,
      clientEmail,
      items,
      total,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    persistInvoices([newInvoice, ...invoices]);
    setClientName('');
    setClientEmail('');
    setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      persistInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  const handleEmail = (inv: Invoice) => {
    const subject = encodeURIComponent(`Invoice ${inv.id.slice(0, 8)} from Freelancer`);
    const body = encodeURIComponent(
      `Hi ${inv.clientName},\n\nPlease find your invoice details below.\n\nView Invoice: ${window.location.origin}/share/${inv.id}\n\nThank you!`
    );
    window.location.href = `mailto:${inv.clientEmail}?subject=${subject}&body=${body}`;
  };

  const handleGeneratePayment = (inv: Invoice) => {
    // Simulate Stripe Checkout session creation
    const mockPaymentLink = `https://checkout.stripe.com/pay/cs_test_${inv.id}`;
    const updatedInvoice = {
      ...inv,
      status: 'Payment Link Ready',
      paymentLink: mockPaymentLink,
      updatedAt: new Date().toISOString(),
    };
    persistInvoices(invoices.map(i => i.id === inv.id ? updatedInvoice : i));
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Freelance Invoice Lite</h1>
        <div className="text-xs text-gray-500 font-mono">v1.0.0 &bull; Local Storage</div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Invoice Form */}
        <section className="lg:col-span-1 bg-[#14171c] p-6 rounded-lg border border-gray-800 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-[#4f8cff]">New Invoice</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className="w-full bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Client Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs text-gray-400 mb-2">Line Items</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-grow bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="w-16 bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                    placeholder="Price"
                    className="w-20 bg-[#0b0d10] border border-gray-700 rounded p-2 text-sm focus:border-[#4f8cff] outline-none"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-400 p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="mt-2 text-xs text-[#4f8cff] hover:underline"
            >
              + Add Item
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="bg-[#4f8cff] text-black font-bold py-2 px-6 rounded hover:bg-blue-400 transition-colors text-sm"
            >
              Save Invoice
            </button>
          </div>
        </section>

        {/* Invoice List */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Recent Invoices</h2>
          
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-[#14171c] rounded-lg border border-gray-800">
              No invoices created yet. Start by filling out the form.
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-[#14171c] p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/invoice/${inv.id}`}
                        className="font-mono text-[#4f8cff] hover:underline truncate max-w-[150px]"
                      >
                        {inv.id.slice(0, 8)}...
                      </Link>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          inv.status === 'Paid'
                            ? 'bg-green-900/50 text-green-400 border border-green-800'
                            : inv.status === 'Payment Link Ready'
                            ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 truncate">
                      {inv.clientName} {inv.clientEmail && <span className="text-gray-500">&bull; {inv.clientEmail}</span>}
                    </div>
                    <div className="font-mono text-lg mt-1 text-[#e6e9ef]">
                      ${inv.total.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="px-3 py-1.5 bg-gray-800 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleCopyLink(inv.id)}
                      className="px-3 py-1.5 bg-gray-800 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleEmail(inv)}
                      className="px-3 py-1.5 bg-gray-800 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Email
                    </button>
                    {inv.status === 'Draft' && (
                      <button
                        onClick={() => handleGeneratePayment(inv)}
                        className="px-3 py-1.5 bg-[#4f8cff] text-black rounded text-xs font-bold hover:bg-blue-400 transition-colors"
                      >
                        Pay Link
                      </button>
                    )}
                    {inv.paymentLink && inv.status === 'Payment Link Ready' && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.paymentLink!);
                          alert('Payment link copied!');
                        }}
                        className="px-3 py-1.5 bg-[#4f8cff] text-black rounded text-xs font-bold hover:bg-blue-400 transition-colors"
                      >
                        Copy Pay Link
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="px-3 py-1.5 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}