'use client';

import { Award, User, TrendingUp } from 'lucide-react';
import { PRICING_CONFIG } from '@/config/pricing';

// Mock customer data
const mockCustomers = [
  { id: '1', name: 'John Mensah', phone: '0241234567', washCount: 12, points: 120, nextReward: 3 },
  { id: '2', name: 'Ama Osei', phone: '0551234567', washCount: 8, points: 80, nextReward: 7 },
  { id: '3', name: 'Kofi Asante', phone: '0271234567', washCount: 25, points: 250, nextReward: 0 },
  { id: '4', name: 'Grace Appiah', phone: '0201234567', washCount: 5, points: 50, nextReward: 10 },
];

/**
 * Loyalty Page
 * Track customer loyalty points and rewards
 */
const Loyalty = () => {
  const { washesForFreeWash } = PRICING_CONFIG.loyalty;

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
          Loyalty Program
        </h1>
        <p className='text-sm sm:text-base text-muted-foreground mt-1'>
          {washesForFreeWash} washes = 1 free wash
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='bg-card rounded-xl border border-border p-6'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center'>
              <User className='w-6 h-6 text-purple-600' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total Members</p>
              <p className='text-2xl font-bold text-foreground'>
                {mockCustomers.length}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-card rounded-xl border border-border p-6'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center'>
              <Award className='w-6 h-6 text-amber-600' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Rewards Earned</p>
              <p className='text-2xl font-bold text-foreground'>
                {
                  mockCustomers.filter((c) => c.washCount >= washesForFreeWash)
                    .length
                }
              </p>
            </div>
          </div>
        </div>
        <div className='bg-card rounded-xl border border-border p-6'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center'>
              <TrendingUp className='w-6 h-6 text-green-600' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total Washes</p>
              <p className='text-2xl font-bold text-foreground'>
                {mockCustomers.reduce((sum, c) => sum + c.washCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className='bg-card rounded-xl border border-border overflow-hidden'>
        <div className='p-4 border-b border-border'>
          <h3 className='font-semibold text-foreground'>Loyalty Members</h3>
        </div>
        <table className='w-full'>
          <thead className='bg-muted/50'>
            <tr>
              <th className='text-left p-4 font-semibold text-foreground'>
                Customer
              </th>
              <th className='text-left p-4 font-semibold text-foreground'>
                Phone
              </th>
              <th className='text-left p-4 font-semibold text-foreground'>
                Washes
              </th>
              <th className='text-left p-4 font-semibold text-foreground'>
                Points
              </th>
              <th className='text-left p-4 font-semibold text-foreground'>
                Next Reward
              </th>
            </tr>
          </thead>
          <tbody>
            {mockCustomers.map((customer) => (
              <tr key={customer.id} className='border-t border-border'>
                <td className='p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center'>
                      <User className='w-5 h-5 text-primary-foreground' />
                    </div>
                    <span className='font-semibold text-foreground'>
                      {customer.name}
                    </span>
                  </div>
                </td>
                <td className='p-4 text-muted-foreground'>{customer.phone}</td>
                <td className='p-4 text-foreground font-semibold'>
                  {customer.washCount}
                </td>
                <td className='p-4'>
                  <span className='text-primary font-semibold'>
                    {customer.points} pts
                  </span>
                </td>
                <td className='p-4'>
                  {customer.nextReward === 0 ? (
                    <span className='px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold'>
                      🎉 Free wash available!
                    </span>
                  ) : (
                    <span className='text-muted-foreground'>
                      {customer.nextReward} more washes
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
};

export default Loyalty;
