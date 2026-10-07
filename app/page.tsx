"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Card, Button, EmptyState, ListRow } from '@/components/ui';

// External libraries for PDF export
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Shared record type from the brief
type BaseRecord = { id: string; title: string; notes: string; createdAt: string };

// Extended Invoice type for the product's specific needs
type InvoiceStatus = "Draft" | "Payment Link Ready" | "Paid";

interface InvoiceRecord extends BaseRecord {
  clientName: string;
  totalAmount: number;
  status: InvoiceStatus;
  paymentLink?: string;
  shareLink?: string; // Generated on the fly, but useful to have a field
}

const LOCAL_STORAGE_KEY = "lastmile:invoice-generator-freelancers:invoices";

const loadInvoices = (): InvoiceRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load invoices from localStorage:", error);
    return [];
  }
};

const saveInvoices = (invoices: InvoiceRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  } catch (error) {
    console.error("Failed to save invoices to localStorage:", error);
  }
};

const DashboardPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);

  // Load invoices on initial render
  useEffect(() => {
    let initialInvoices = loadInvoices();
    if (initialInvoices.length === 0) {
      // Pre-populate with sample data if empty
      initialInvoices = [
        {
          id: uuidv4(),
          title: "Web Development Project - Acme Corp",
          notes: "Full-stack development for their new e-commerce platform. Includes frontend UI/UX and backend API integration.",
          createdAt: new Date().toISOString(),
          clientName: "Acme Corp",
          totalAmount: 5500.00,
          status: "Draft",
        },
        {
          id: uuidv4(),
          title: "Mobile App UI Design - Globex Inc.",
          notes: "Designed user interface and user experience for their upcoming iOS and Android applications. Delivered high-fidelity mockups and prototypes.",
          createdAt: new new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          clientName: "Globex Inc.",
          totalAmount: 3200.00,
          status: "Payment Link Ready",
          paymentLink: "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
        },
        {
          id: uuidv4(),
          title: "Consulting Services - Initech",
          notes: "Provided strategic consulting on cloud infrastructure migration and DevOps best practices. Conducted workshops and provided documentation.",
          createdAt: new new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
          clientName: "Initech",
          totalAmount: 1800.00,
          status: "Paid",
        },
      ];
      saveInvoices(initialInvoices);
    }
    setInvoices(initialInvoices);
  }, []);

  // Save invoices whenever they change
  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  // Handle Stripe payment success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoiceId');
    const paymentSuccess = params.get('payment_success');

    if (invoiceId && paymentSuccess === 'true') {
      setInvoices(prevInvoices => {
        const updatedInvoices = prevInvoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: "Paid" } : inv
        );
        return updatedInvoices;
      });
      // Clean up URL to prevent re-triggering on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('invoiceId');
      newUrl.searchParams.delete('payment_success');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    }
  }, []);

  const handleCreateOrUpdateInvoice = (invoiceData: Omit<InvoiceRecord, 'id' | 'createdAt' | 'status'>) => {
    if (editingInvoice) {
      setInvoices(prevInvoices =>
        prevInvoices.map(inv =>
          inv.id === editingInvoice.id
            ? { ...inv, ...invoiceData, totalAmount: Number(invoiceData.totalAmount) } // Ensure totalAmount is number
            : inv
        )
      );
      setEditingInvoice(null);
    } else {
      const newInvoice: InvoiceRecord = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: "Draft",
        ...invoiceData,
        totalAmount: Number(invoiceData.totalAmount), // Ensure totalAmount is number
      };
      setInvoices(prevInvoices => [newInvoice, ...prevInvoices]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteInvoice = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== id));
    }
  };

  const handleCopyLink = async (invoiceId: string) => {
    const shareUrl = `${window.location.origin}/invoice?id=${invoiceId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Invoice link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("Failed to copy link. Please try again.");
    }
  };

  const handleSendEmail = (invoice: InvoiceRecord) => {
    const shareUrl = `${window.location.origin}/invoice?id=${invoice.id}`;
    const subject = `Invoice from ${invoice.clientName} - #${invoice.id.substring(0, 8)}`;
    const body = `Dear ${invoice.clientName},

Please find your invoice for ${invoice.title} attached/linked below.

Invoice Amount: $${invoice.totalAmount.toFixed(2)}
View Invoice: ${shareUrl}

Thank you for your business!

Best regards,
Your Name/Company`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleGeneratePaymentLink = (invoiceId: string) => {
    setInvoices(prevInvoices =>
      prevInvoices.map(inv =>
        inv.id === invoiceId && inv.status === "Draft"
          ? {
              ...inv,
              status: "Payment Link Ready",
              paymentLink: `https://checkout.stripe.com/pay/cs_test_1234567890abcdefghijklmnopqrstuvwxyz?invoiceId=${invoiceId}`,
            }
          : inv
      )
    );
    alert("Payment link generated! (Simulated Stripe Checkout URL)");
  };

  const handleCopyPaymentLink = async (paymentLink: string) => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      alert("Payment link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy payment link: ", err);
      alert("Failed to copy payment link. Please try again.");
    }
  };

  const handleExportPdf = useCallback(async (invoice: InvoiceRecord) => {
    try {
      // Create a temporary div to render the invoice content for PDF
      const printContent = document.createElement('div');
      printContent.style.padding = '20px';
      printContent.style.fontFamily = 'Inter, sans-serif';
      printContent.style.color = '#e6e9ef';
      printContent.style.backgroundColor = '#14171c';
      printContent.style.width = '800px'; // A reasonable width for PDF

      printContent.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #4f8cff;">Invoice #${invoice.id.substring(0, 8)}</h1>
        <p style="margin-bottom: 10px;"><strong>Client:</strong> ${invoice.clientName}</p>
        <p style="margin-bottom: 10px;"><strong>Title:</strong> ${invoice.title}</p>
        <p style="margin-bottom: 10px;"><strong>Notes:</strong> ${invoice.notes}</p>
        <p style="margin-bottom: 10px;"><strong>Created:</strong> ${format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</p>
        <p style="margin-bottom: 10px;"><strong>Status:</strong> <span style="color: ${invoice.status === 'Paid' ? '#28a745' : invoice.status === 'Payment Link Ready' ? '#ffc107' : '#6c757d'}; font-weight: bold;">${invoice.status}</span></p>
        <h2 style="font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Total Amount: <span style="font-family: 'JetBrains Mono', monospace; color: #4f8cff;">$${invoice.totalAmount.toFixed(2)}</span></h2>
      `;

      document.body.appendChild(printContent);

      const canvas = await html2canvas(printContent, {
        scale: 2, // Increase scale for better resolution
        useCORS: true,
        backgroundColor: '#14171c', // Match surface color
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height], // Use canvas dimensions for PDF
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`invoice-${invoice.clientName.replace(/\s/g, '-')}-${invoice.id.substring(0, 8)}.pdf`);

      document.body.removeChild(printContent);
      alert("Invoice PDF exported successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again or check console for details. This feature might not work on older mobile browsers.");
    }
  }, []);

  const openCreateModal = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const openEditModal = (invoice: InvoiceRecord) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] font-inter p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-[#e6e9ef]">Dashboard</h1>

        <div className="flex justify-end mb-6">
          <Button onClick={openCreateModal} className="bg-[#4f8cff] hover:bg-[#3a7ae0] text-white">
            + Create New Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            title="No Invoices Yet"
            description="Start by creating your first freelance invoice."
            action={<Button onClick={openCreateModal} className="bg-[#4f8cff] hover:bg-[#3a7ae0] text-white">Create Invoice</Button>}
          />
        ) : (
          <Card className="p-0 bg-[#14171c] border border-[#2a2e35]">
            <ul className="divide-y divide-[#2a2e35]">
              {invoices.map(invoice => (
                <ListRow
                  key={invoice.id}
                  id={invoice.id}
                  title={
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-lg text-[#e6e9ef]">{invoice.clientName} - {invoice.title}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${invoice.status === 'Paid' ? 'bg-green-600 text-white' : invoice.status === 'Payment Link Ready' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'}`}>
                        {invoice.status}
                      </span>
                    </div>
                  }
                  notes={
                    <div className="text-sm text-[#aeb3bb] mt-1">
                      <p className="truncate max-w-full">{invoice.notes}</p>
                      <p className="mt-1 text-xs text-[#8a8f98] font-jetbrains-mono">Created: {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</p>
                      <p className="mt-1 text-lg font-bold text-[#4f8cff] font-jetbrains-mono">Total: ${invoice.totalAmount.toFixed(2)}</p>
                    </div>
                  }
                  actions={
                    <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                      <Button onClick={() => openEditModal(invoice)} className="bg-[#2a2e35] hover:bg-[#3a404a] text-[#e6e9ef] text-xs px-3 py-1">Edit</Button>
                      <Button onClick={() => handleCopyLink(invoice.id)} className="bg-[#2a2e35] hover:bg-[#3a404a] text-[#e6e9ef] text-xs px-3 py-1">Copy Link</Button>
                      <Button onClick={() => handleSendEmail(invoice)} className="bg-[#2a2e35] hover:bg-[#3a404a] text-[#e6e9ef] text-xs px-3 py-1">Email</Button>
                      {invoice.status === "Draft" && (
                        <Button onClick={() => handleGeneratePaymentLink(invoice.id)} className="bg-[#4f8cff] hover:bg-[#3a7ae0] text-white text-xs px-3 py-1">Generate Payment</Button>
                      )}
                      {invoice.status === "Payment Link Ready" && invoice.paymentLink && (
                        <Button onClick={() => handleCopyPaymentLink(invoice.paymentLink!)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1">Copy Payment Link</Button>
                      )}
                      <Button onClick={() => handleExportPdf(invoice)} className="bg-[#2a2e35] hover:bg-[#3a404a] text-[#e6e9ef] text-xs px-3 py-1">Export PDF</Button>
                      <Button onClick={() => handleDeleteInvoice(invoice.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1">Delete</Button>
                    </div>
                  }
                />
              ))}
            </ul>
          </Card>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#14171c] p-6 w-full max-w-md border border-[#2a2e35]">
              <h2 className="text-2xl font-bold mb-4 text-[#e6e9ef]">{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateOrUpdateInvoice({
                    clientName: formData.get('clientName') as string,
                    title: formData.get('title') as string,
                    notes: formData.get('notes') as string,
                    totalAmount: parseFloat(formData.get('totalAmount') as string),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="clientName" className="block text-sm font-medium text-[#e6e9ef] mb-1">Client Name</label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    defaultValue={editingInvoice?.clientName || ''}
                    required
                    className="w-full p-2 bg-[#0b0d10] border border-[#2a2e35] rounded-md text-[#e6e9ef] focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  />
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-[#e6e9ef] mb-1">Invoice Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    defaultValue={editingInvoice?.title || ''}
                    required
                    className="w-full p-2 bg-[#0b0d10] border border-[#2a2e35] rounded-md text-[#e6e9ef] focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-[#e6e9ef] mb-1">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingInvoice?.notes || ''}
                    rows={4}
                    className="w-full p-2 bg-[#0b0d10] border border-[#2a2e35] rounded-md text-[#e6e9ef] focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-[#e6e9ef] mb-1">Total Amount ($)</label>
                  <input
                    type="number"
                    id="totalAmount"
                    name="totalAmount"
                    defaultValue={editingInvoice?.totalAmount || ''}
                    step="0.01"
                    required
                    className="w-full p-2 bg-[#0b0d10] border border-[#2a2e35] rounded-md text-[#e6e9ef] font-jetbrains-mono focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-[#2a2e35] hover:bg-[#3a404a] text-[#e6e9ef]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#4f8cff] hover:bg-[#3a7ae0] text-white"
                  >
                    {editingInvoice ? 'Update Invoice' : 'Save Invoice'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
