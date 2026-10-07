"use client";

import React from 'react';

// Shared record type, extended to support product flows
export type InvoiceRecord = {
  id: string;
  title: string; // Used for Client Name
  notes: string; // Invoice notes/description
  createdAt: string; // Date created
  status: 'Draft' | 'Payment Link Ready' | 'Paid';
  totalAmount: number;
  paymentLink?: string; // URL for Stripe Checkout session
  // Other fields like invoice items, client details, etc., would be here in a full implementation
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={`bg-[#14171c] text-[#e6e9ef] p-4 rounded-lg shadow-md ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseStyles = 'font-sans rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0d10]';
  const variantStyles = {
    primary: 'bg-[#4f8cff] text-[#e6e9ef] hover:bg-blue-600 focus:ring-[#4f8cff]',
    secondary: 'bg-gray-700 text-[#e6e9ef] hover:bg-gray-600 focus:ring-gray-500',
    danger: 'bg-red-700 text-[#e6e9ef] hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-[#4f8cff] hover:bg-[#14171c] focus:ring-[#4f8cff]',
  };
  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};

interface EmptyStateProps {
  message: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, actionButton }) => {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-700">
      <p className="text-lg text-gray-400 mb-4 font-sans">{message}</p>
      {actionButton && <div>{actionButton}</div>}
    </Card>
  );
};

interface ListRowProps {
  invoice: InvoiceRecord;
  children?: React.ReactNode; // For action buttons
}

export const ListRow: React.FC<ListRowProps> = ({ invoice, children }) => {
  const statusColors = {
    'Draft': 'text-gray-500 bg-gray-800',
    'Payment Link Ready': 'text-yellow-500 bg-yellow-900',
    'Paid': 'text-green-500 bg-green-900',
  };

  return (
    <Card className="flex items-center justify-between p-4 mb-2">
      <div className="flex-grow min-w-0">
        <div className="flex items-center mb-1 flex-wrap">
          <h3 className="text-lg font-semibold text-[#e6e9ef] mr-2 font-sans truncate max-w-full sm:max-w-[calc(100%-100px)]">{invoice.title}</h3>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusColors[invoice.status]} flex-shrink-0`}>
            {invoice.status}
          </span>
        </div>
        <p className="text-sm text-gray-400 font-mono mb-1 truncate">ID: {invoice.id}</p>
        <p className="text-sm text-gray-400 font-mono mb-1">Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
        <p className="text-xl font-mono text-[#4f8cff] mt-2">
          ${invoice.totalAmount.toFixed(2)}
        </p>
      </div>
      {children && <div className="flex-shrink-0 flex space-x-2 ml-4">{children}</div>}
    </Card>
  );
};
