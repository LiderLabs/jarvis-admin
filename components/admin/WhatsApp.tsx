'use client';

import { MessageSquare, Send, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WhatsApp() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
          WhatsApp Integration
        </h1>
        <p className='text-sm sm:text-base text-muted-foreground mt-2'>
          Manage WhatsApp messaging and notifications
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MessageSquare className='w-5 h-5' />
              Send Message
            </CardTitle>
            <CardDescription>
              Send WhatsApp messages to customers
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Phone Number
              </label>
              <Input placeholder='0241234567' />
            </div>
            <div>
              <label className='text-sm font-medium mb-2 block'>Message</label>
              <textarea
                className='w-full min-h-[100px] p-3 border rounded-lg resize-none'
                placeholder='Type your message...'
              />
            </div>
            <Button className='w-full gap-2'>
              <Send className='w-4 h-4' />
              Send Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Phone className='w-5 h-5' />
              Integration Status
            </CardTitle>
            <CardDescription>WhatsApp Business API connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
                <span className='text-sm'>Connection Status</span>
                <span className='px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold'>
                  Not Connected
                </span>
              </div>
              <Button variant='outline' className='w-full'>
                Configure Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

