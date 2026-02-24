"use client";

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuery, useMutation } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { toast } from "sonner"
import {
  Settings,
  Bell,
  Shield,
  Save,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    businessName: "WashLab",
    contactPhone: "",
    contactEmail: "",
    notifyNewOrders: true,
    notifyCompletedOrders: true,
    requireBiometricPayment: true,
    autoLogoutMinutes: 30,
  })

  const systemSettings = useQuery(api.admin.getSystemSettings)
  const updateSettings = useMutation(api.admin.updateSystemSettings)

  useEffect(() => {
    if (systemSettings && typeof systemSettings === "object" && !("error" in systemSettings)) {
      setSettings({
        businessName: systemSettings.businessName || "WashLab",
        contactPhone: systemSettings.contactPhone || "",
        contactEmail: systemSettings.contactEmail || "",
        notifyNewOrders: systemSettings.notifyNewOrders ?? true,
        notifyCompletedOrders: systemSettings.notifyCompletedOrders ?? true,
        requireBiometricPayment: systemSettings.requireBiometricPayment ?? true,
        autoLogoutMinutes: systemSettings.autoLogoutMinutes || 30,
      })
    }
  }, [systemSettings])

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings)
      toast.success("Settings saved successfully!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    }
  }

  if (systemSettings === undefined) {
    return (
      <div>
        <div className='mb-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Settings</h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>Configure WashLab preferences</p>
        </div>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Settings</h1>
        <p className='text-sm sm:text-base text-muted-foreground mt-1'>
          Configure WashLab preferences
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='w-5 h-5 text-primary' />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label>Business Name</Label>
              <Input
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type='email'
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='w-5 h-5 text-primary' />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Notify on new orders</Label>
                <p className='text-xs text-muted-foreground mt-1'>Send notifications when new orders are created</p>
              </div>
              <Switch
                checked={settings.notifyNewOrders}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyNewOrders: checked })}
              />
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Notify on completed orders</Label>
                <p className='text-xs text-muted-foreground mt-1'>Send notifications when orders are completed</p>
              </div>
              <Switch
                checked={settings.notifyCompletedOrders}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyCompletedOrders: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='w-5 h-5 text-primary' />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>Require biometric for payments</Label>
                <p className='text-xs text-muted-foreground mt-1'>Staff must verify identity before processing payments</p>
              </div>
              <Switch
                checked={settings.requireBiometricPayment}
                onCheckedChange={(checked) => setSettings({ ...settings, requireBiometricPayment: checked })}
              />
            </div>
            <div>
              <Label>Auto-logout after (minutes)</Label>
              <Input
                type='number'
                value={settings.autoLogoutMinutes}
                onChange={(e) => setSettings({ ...settings, autoLogoutMinutes: parseInt(e.target.value) || 30 })}
                min={5}
                max={120}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 flex justify-end'>
        <Button onClick={handleSaveSettings} className='gap-2'>
          <Save className='w-4 h-4' />
          Save Settings
        </Button>
      </div>
    </div>
  )
}

export default AdminSettings;