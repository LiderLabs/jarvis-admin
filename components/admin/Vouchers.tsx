'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Ticket, Plus, Copy, Trash2 } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_wash';
  discountValue: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

const mockVouchers: Voucher[] = [
  { id: '1', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, usageLimit: 100, usedCount: 45, isActive: true },
  { id: '2', code: 'FREEWASH', discountType: 'free_wash', discountValue: 1, usageLimit: 50, usedCount: 23, isActive: true },
  { id: '3', code: 'SAVE5', discountType: 'fixed', discountValue: 5, usageLimit: 200, usedCount: 89, isActive: false },
];

/**
 * Vouchers Page
 * Manage discount vouchers and promo codes
 */
const Vouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>(mockVouchers);
  const [showAddForm, setShowAddForm] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const toggleVoucher = (id: string) => {
    setVouchers(vouchers.map(v => 
      v.id === id ? { ...v, isActive: !v.isActive } : v
    ));
  };

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
            Vouchers
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>
            Manage promo codes and discounts
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className='gap-2 w-full sm:w-auto'
        >
          <Plus className='w-4 h-4 shrink-0' />
          <span>Create Voucher</span>
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {vouchers.map((voucher) => (
          <div
            key={voucher.id}
            className={`bg-card rounded-xl border p-6 ${
              voucher.isActive ? "border-border" : "border-border/50 opacity-60"
            }`}
          >
            <div className='flex items-start justify-between mb-4'>
              <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center'>
                <Ticket className='w-6 h-6 text-primary' />
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  voucher.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {voucher.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className='flex items-center gap-2 mb-2'>
              <code className='text-lg font-bold text-foreground bg-muted px-2 py-1 rounded'>
                {voucher.code}
              </code>
              <button onClick={() => copyCode(voucher.code)}>
                <Copy className='w-4 h-4 text-muted-foreground hover:text-foreground' />
              </button>
            </div>

            <p className='text-sm text-muted-foreground mb-4'>
              {voucher.discountType === "percentage" &&
                `${voucher.discountValue}% off`}
              {voucher.discountType === "fixed" &&
                `₵${voucher.discountValue} off`}
              {voucher.discountType === "free_wash" &&
                `${voucher.discountValue} free wash`}
            </p>

            <div className='flex items-center justify-between pt-4 border-t border-border'>
              <span className='text-sm text-muted-foreground'>
                {voucher.usedCount} / {voucher.usageLimit} used
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => toggleVoucher(voucher.id)}
                className={
                  voucher.isActive ? "text-destructive" : "text-green-600"
                }
              >
                {voucher.isActive ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
};

export default Vouchers;
