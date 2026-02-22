'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function EnrollmentPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    branch: '',
  });
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEnrolling(true);

    // Simulate biometric enrollment
    setTimeout(() => {
      setIsEnrolling(false);
      toast.success('Biometric enrollment completed!');
      setFormData({ name: '', phone: '', email: '', branch: '' });
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Staff Enrollment</CardTitle>
          <CardDescription>
            Complete your biometric enrollment to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0241234567"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="Select your branch"
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isEnrolling}>
              {isEnrolling ? 'Enrolling...' : 'Start Biometric Enrollment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

