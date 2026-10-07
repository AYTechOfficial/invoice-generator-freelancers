"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Card, Button, EmptyState } from "@/components/ui";

// Shared record type from brief, extended for invoice details
type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type Invoice = {
  id: string;
  title: string; // Used for client name or invoice title
  notes: string; // General notes
  createdAt: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  status: "Draft" | "Payment Link Ready" | "Paid";
  paymentLink?: string;
  sharedLink?: string; // For read-only view, though the current page is for editing.
};

// Local storage key
const LOCAL_STORAGE_KEY = "lastmile:invoice-generator-freelancers:invoices";

const InvoiceDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [isNewInvoice, setIsNewInvoice] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<Partial<Invoice>>({});
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);

  const invoiceRef = useRef<HTMLDivElement>(null); // Ref for PDF export

  // Load invoices from localStorage
  useEffect(() => {
    const storedInvoices = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
    }
    setIsLoading(false);
  }, []);

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
    }
  }, [invoices, isLoading]);

  // Find current invoice based on ID from URL
  useEffect(() => {
    if (!isLoading && invoices.length > 0) {
      const foundInvoice = invoices.find((inv) => inv.id === invoiceId);
      if (foundInvoice) {
        setCurrentInvoice(foundInvoice);
        setFormState(foundInvoice);
        setFormItems(foundInvoice.items);
        setIsEditing(false); // Start in view mode
        setIsNewInvoice(false);
      } else if (invoiceId === "new") {
        // Handle new invoice creation
        const newInvoice: Invoice = {
          id: uuidv4(),
          title: "",
          notes: "",
          createdAt: new Date().toISOString(),
          clientName: "",
          clientEmail: "",
          items: [{ id: uuidv4(), description: "Service/Product", quantity: 1, unitPrice: 0 }],
          status: "Draft",
        };
        setCurrentInvoice(newInvoice);
        setFormState(newInvoice);
        setFormItems(newInvoice.items);
        setIsNewInvoice(true);
        setIsEditing(true); // New invoices start in edit mode
      } else {
        setError("Invoice not found.");
        setCurrentInvoice(null);
      }
    } else if (!isLoading && invoiceId === "new") {
      // Handle new invoice creation when no invoices exist yet
      const newInvoice: Invoice = {
        id: uuidv4(),
        title: "",
        notes: "",
        createdAt: new Date().toISOString(),
        clientName: "",
        clientEmail: "",
        items: [{ id: uuidv4(), description: "Service/Product", quantity: 1, unitPrice: 0 }],
        status: "Draft",
      };
      setCurrentInvoice(newInvoice);
      setFormState(newInvoice);
      setFormItems(newInvoice.items);
      setIsNewInvoice(true);
      setIsEditing(true);
    }
  }, [invoiceId, invoices, isLoading]);

  // Handle Stripe success redirect
  useEffect(() => {
    if (searchParams.get("success") === "true" && currentInvoice && currentInvoice.status === "Payment Link Ready") {
      const updatedInvoice: Invoice = { ...currentInvoice, status: "Paid" };
      setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
      setCurrentInvoice(updatedInvoice);
      router.replace(`/invoice/${updatedInvoice.id}`); // Clean up URL
    }
  }, [searchParams, currentInvoice, setInvoices, router]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "quantity" || field === "unitPrice" ? parseFloat(value as string) || 0 : value,
            }
          : item
      )
    );
  };

  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotal = useCallback(() => {
    return formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [formItems]);

  const handleSave = () => {
    if (!formState.clientName || !formState.title || formItems.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      setError("Please fill in all required fields and ensure item quantities/prices are valid.");
      return;
    }
    setError(null);

    const updatedInvoice: Invoice = {
      ...currentInvoice!, // currentInvoice is guaranteed to exist here
      ...formState,
      items: formItems,
      status: currentInvoice?.status || "Draft", // Preserve status if editing, default to Draft for new
      createdAt: currentInvoice?.createdAt || new Date().toISOString(),
    } as Invoice; // Cast to Invoice to ensure all fields are present

    if (isNewInvoice) {
      setInvoices((prev) => [...prev, updatedInvoice]);
      router.push(`/invoice/${updatedInvoice.id}`);
    } else {
      setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    }
    setCurrentInvoice(updatedInvoice);
    setIsEditing(false);
    setIsNewInvoice(false); // No longer a new invoice after saving
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== currentInvoice?.id));
      router.push("/"); // Redirect to home/list page
    }
  };

  const handleCopyLink = () => {
    if (currentInvoice) {
      const shareableUrl = `${window.location.origin}/invoice/view/${currentInvoice.id}`; // A hypothetical read-only view
      navigator.clipboard.writeText(shareableUrl);
      alert("Shareable link copied to clipboard!");
    }
  };

  const handleEmail = () => {
    if (currentInvoice) {
      const shareableUrl = `${window.location.origin}/invoice/view/${currentInvoice.id}`;
      const subject = encodeURIComponent(`Invoice from Freelance Invoice Lite - ${currentInvoice.title}`);
      const body = encodeURIComponent(
        `Dear ${currentInvoice.clientName},\n\nPlease find your invoice here: ${shareableUrl}\n\nBest regards,\nYour Name`
      );
      window.location.href = `mailto:${currentInvoice.clientEmail}?subject=${subject}&body=${body}`;
    }
  };

  const handleGeneratePaymentLink = () => {
    if (currentInvoice && currentInvoice.status === "Draft") {
      // Simulate Stripe Checkout session creation
      // In a real app, this would be an API call to your backend which then calls Stripe.
      // For this client-side demo, we'll generate a dummy link.
      const dummyPaymentLink = `https://checkout.stripe.com/pay/cs_test_dummy_${uuidv4().replace(/-/g, "")}`;
      const updatedInvoice: Invoice = {
        ...currentInvoice,
        status: "Payment Link Ready",
        paymentLink: dummyPaymentLink,
      };
      setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
      setCurrentInvoice(updatedInvoice);
      alert("Payment link generated (simulated)!");
    }
  };

  const handleCopyPaymentLink = () => {
    if (currentInvoice?.paymentLink) {
      navigator.clipboard.writeText(currentInvoice.paymentLink);
      alert("Payment link copied to clipboard!");
    }
  };

  const handleExportPdf = async () => {
    if (!invoiceRef.current) {
      setError("Could not find invoice content to export.");
      return;
    }
    setError(null);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Increase scale for better quality
        useCORS: true, // If you have images from other origins
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Add a margin
      const margin = 20;
      const contentWidth = pdfWidth - 2 * margin;
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      let position = margin;
      let heightLeft = pdfHeight;

      pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
      heightLeft -= pdfHeight;

      // If content overflows, add new pages
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`invoice-${currentInvoice?.id || "export"}.pdf`);
      alert("PDF exported successfully!");
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to export PDF. Please try again or use a different browser.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-8 flex items-center justify-center">
        <p className="font-mono text-lg">Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-8 flex items-center justify-center">
        <Card className="bg-[#14171c] p-6 rounded-lg shadow-lg max-w-md text-center">
          <p className="text-red-500 font-mono text-lg mb-4">{error}</p>
          <Button onClick={() => router.push("/")} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
            Go to Invoices List
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentInvoice && invoiceId !== "new") {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-8 flex items-center justify-center">
        <EmptyState
          title="Invoice Not Found"
          message="The invoice you are looking for does not exist or has been deleted."
          action={<Button onClick={() => router.push("/")} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">Go to Invoices List</Button>}
        />
      </div>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef] p-4 sm:p-8 font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#e6e9ef] font-['JetBrains_Mono']">
            {isNewInvoice ? "New Invoice" : `Invoice #${currentInvoice?.id.substring(0, 8)}`}
          </h1>
          <div className="flex space-x-2">
            {!isEditing && currentInvoice && (
              <Button onClick={() => setIsEditing(true)} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={handleSave} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
                  {isNewInvoice ? "Save Invoice" : "Update Invoice"}
                </Button>
                <Button onClick={() => {
                  if (!isNewInvoice) {
                    setIsEditing(false);
                    setFormState(currentInvoice!); // Revert changes
                    setFormItems(currentInvoice!.items);
                  } else {
                    router.push("/"); // Go back to list if cancelling new invoice
                  }
                }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  Cancel
                </Button>
              </>
            )}
            {!isNewInvoice && (
              <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded">
                Delete
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="bg-red-900/30 border border-red-700 p-4 rounded-lg mb-6 font-mono text-red-300">
            {error}
          </Card>
        )}

        <Card className="bg-[#14171c] p-6 rounded-lg shadow-lg mb-6" ref={invoiceRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Invoice Title / Project Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="title"
                  value={formState.title || ""}
                  onChange={handleFormChange}
                  className="w-full p-2 bg-[#0b0d10] border border-gray-700 rounded-md text-[#e6e9ef] font-mono focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  placeholder="e.g., Website Redesign Project"
                  maxLength={200}
                />
              ) : (
                <p className="text-lg text-[#e6e9ef] font-mono">{currentInvoice?.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Client Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="clientName"
                  value={formState.clientName || ""}
                  onChange={handleFormChange}
                  className="w-full p-2 bg-[#0b0d10] border border-gray-700 rounded-md text-[#e6e9ef] font-mono focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  placeholder="e.g., Acme Corp."
                  maxLength={200}
                />
              ) : (
                <p className="text-lg text-[#e6e9ef] font-mono">{currentInvoice?.clientName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Client Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="clientEmail"
                  value={formState.clientEmail || ""}
                  onChange={handleFormChange}
                  className="w-full p-2 bg-[#0b0d10] border border-gray-700 rounded-md text-[#e6e9ef] font-mono focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                  placeholder="e.g., client@example.com"
                  maxLength={200}
                />
              ) : (
                <p className="text-lg text-[#e6e9ef] font-mono">{currentInvoice?.clientEmail || "N/A"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <p className={`text-lg font-mono flex items-center ${currentInvoice?.status === "Paid" ? "text-green-500" : currentInvoice?.status === "Payment Link Ready" ? "text-[#4f8cff]" : "text-gray-400"}`}>
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${currentInvoice?.status === "Paid" ? "bg-green-500" : currentInvoice?.status === "Payment Link Ready" ? "bg-[#4f8cff]" : "bg-gray-500"}`}></span>
                {currentInvoice?.status}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            {isEditing ? (
              <textarea
                name="notes"
                value={formState.notes || ""}
                onChange={handleFormChange}
                rows={4}
                className="w-full p-2 bg-[#0b0d10] border border-gray-700 rounded-md text-[#e6e9ef] font-mono focus:ring-[#4f8cff] focus:border-[#4f8cff]"
                placeholder="Any additional notes for the client..."
                maxLength={500}
              ></textarea>
            ) : (
              <p className="text-lg text-[#e6e9ef] font-mono whitespace-pre-wrap">{currentInvoice?.notes || "No notes."}</p>
            )}
          </div>

          <h3 className="text-xl font-bold text-[#e6e9ef] mb-4 font-['JetBrains_Mono']">Invoice Items</h3>
          <div className="space-y-4 mb-6">
            {formItems.length === 0 && !isEditing && (
              <p className="text-gray-500 font-mono">No items added to this invoice.</p>
            )}
            {formItems.map((item) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center bg-[#0b0d10] p-4 rounded-md border border-gray-700">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      className="w-full p-2 bg-[#14171c] border border-gray-600 rounded-md text-[#e6e9ef] font-mono text-sm"
                      placeholder="Service or product"
                      maxLength={200}
                    />
                  ) : (
                    <p className="text-sm text-[#e6e9ef] font-mono">{item.description}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      className="w-full p-2 bg-[#14171c] border border-gray-600 rounded-md text-[#e6e9ef] font-mono text-sm"
                      min="1"
                    />
                  ) : (
                    <p className="text-sm text-[#e6e9ef] font-mono">{item.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                      className="w-full p-2 bg-[#14171c] border border-gray-600 rounded-md text-[#e6e9ef] font-mono text-sm"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <p className="text-sm text-[#e6e9ef] font-mono">${item.unitPrice.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <label className="block text-xs font-medium text-gray-500 mr-2 sm:hidden">Total:</label>
                  <p className="text-sm text-[#e6e9ef] font-mono">${(item.quantity * item.unitPrice).toFixed(2)}</p>
                  {isEditing && (
                    <Button onClick={() => handleRemoveItem(item.id)} className="ml-4 p-1 bg-red-700 hover:bg-red-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      X
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {isEditing && (
              <Button onClick={handleAddItem} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                + Add Item
              </Button>
            )}
          </div>

          <div className="flex justify-end items-center border-t border-gray-700 pt-4">
            <span className="text-xl font-bold text-[#e6e9ef] mr-4 font-['JetBrains_Mono']">Total:</span>
            <span className="text-2xl font-bold text-[#4f8cff] font-['JetBrains_Mono']">${totalAmount.toFixed(2)}</span>
          </div>
        </Card>

        <Card className="bg-[#14171c] p-6 rounded-lg shadow-lg flex flex-wrap gap-4 justify-center md:justify-start">
          <Button onClick={handleCopyLink} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Copy Share Link
          </Button>
          <Button onClick={handleEmail} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Email Invoice
          </Button>
          {currentInvoice?.status === "Draft" && (
            <Button onClick={handleGeneratePaymentLink} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
              Generate Payment Link
            </Button>
          )}
          {currentInvoice?.status === "Payment Link Ready" && currentInvoice.paymentLink && (
            <Button onClick={handleCopyPaymentLink} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
              Copy Payment Link
            </Button>
          )}
          {currentInvoice?.status === "Payment Link Ready" && (
            <Button onClick={() => router.push(`${currentInvoice.paymentLink}?success_url=${window.location.origin}/invoice/${currentInvoice.id}?success=true`)} className="bg-[#4f8cff] hover:bg-[#3a70d1] text-white font-bold py-2 px-4 rounded">
              Go to Payment (Simulated)
            </Button>
          )}
          <Button onClick={handleExportPdf} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Export PDF
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
