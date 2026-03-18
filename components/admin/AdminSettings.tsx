"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@jordan6699/washlab-backend/api"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  User, Lock, Bell, Palette, Shield, ExternalLink,
  Save, Moon, Sun, Loader2, CheckCircle, Mail, Crown
} from "lucide-react"

const AdminSettings = () => {
  const { user: clerkUser } = useUser()
  
  const adminProfile = useQuery(api.admin.getCurrentUser)
  const updateProfile = useMutation((api as any).admin.updateAdminProfile)
  const updateSystemSettings = useMutation(api.admin.updateSystemSettings)
  const systemSettings = useQuery(api.admin.getSystemSettings)

  const [name, setName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const [notifications, setNotifications] = useState({
    notifyNewOrders: true,
    notifyCompletedOrders: true,
  })

  const [security, setSecurity] = useState({
    requireBiometricPayment: true,
    autoLogoutMinutes: 30,
  })

  useEffect(() => {
    if (adminProfile) setName(adminProfile.name || "")
  }, [adminProfile])

  useEffect(() => {
    if (systemSettings && typeof systemSettings === "object" && !("error" in systemSettings)) {
      setNotifications({
        notifyNewOrders: systemSettings.notifyNewOrders ?? true,
        notifyCompletedOrders: systemSettings.notifyCompletedOrders ?? true,
      })
      setSecurity({
        requireBiometricPayment: systemSettings.requireBiometricPayment ?? true,
        autoLogoutMinutes: systemSettings.autoLogoutMinutes ?? 30,
      })
    }
  }, [systemSettings])

  useEffect(() => {
    const saved = localStorage.getItem("washlab-theme")
    const dark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("washlab-theme", next ? "dark" : "light")
  }

  const saveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters")
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim() })
      toast.success("Profile updated!")
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await updateSystemSettings({
        businessName: (systemSettings as any)?.businessName || "WashLab",
        contactPhone: (systemSettings as any)?.contactPhone || "",
        contactEmail: (systemSettings as any)?.contactEmail || "",
        ...notifications,
        ...security,
      })
      toast.success("Settings saved!")
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings")
    } finally {
      setSavingSettings(false)
    }
  }

  if (!adminProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and app preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-primary" />
            Profile
          </CardTitle>
          <CardDescription className="text-xs">Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(adminProfile.name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{adminProfile.name}</p>
              <p className="text-xs text-muted-foreground truncate">{adminProfile.email}</p>
            </div>
            <Badge variant="secondary" className="text-xs capitalize flex items-center gap-1 shrink-0">
              {adminProfile.role === "super_admin" && <Crown className="w-3 h-3" />}
              {adminProfile.role === "super_admin" ? "Super Admin" : "Admin"}
            </Badge>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Email Address</Label>
            <div className="flex items-center gap-2">
              <Input
                value={adminProfile.email}
                disabled
                className="h-9 text-sm bg-muted/50"
              />
              <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                <Mail className="w-3 h-3 mr-1" />
                Clerk
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Email is managed via Clerk. Change it in account settings.</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open("https://accounts.washlab.app/user", "_blank", "noopener,noreferrer")}>
              <ExternalLink className="w-3 h-3" />
              Manage Clerk Account
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-primary" />
            Password & Security
          </CardTitle>
          <CardDescription className="text-xs">Manage your login credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Password is managed securely via Clerk</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0" onClick={() => window.open("https://accounts.washlab.app/user", "_blank", "noopener,noreferrer")}>
              <ExternalLink className="w-3 h-3" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription className="text-xs">Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {isDark ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-yellow-500" />}
              </div>
              <div>
                <p className="text-sm font-medium">{isDark ? "Dark Mode" : "Light Mode"}</p>
                <p className="text-xs text-muted-foreground">Toggle the app theme</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription className="text-xs">Control which events trigger alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New Orders</p>
              <p className="text-xs text-muted-foreground">Alert when a new order is created</p>
            </div>
            <Switch
              checked={notifications.notifyNewOrders}
              onCheckedChange={(v) => setNotifications(n => ({ ...n, notifyNewOrders: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Completed Orders</p>
              <p className="text-xs text-muted-foreground">Alert when an order is completed</p>
            </div>
            <Switch
              checked={notifications.notifyCompletedOrders}
              onCheckedChange={(v) => setNotifications(n => ({ ...n, notifyCompletedOrders: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security/System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" />
            System Security
          </CardTitle>
          <CardDescription className="text-xs">Station and payment security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Biometric for Payments</p>
              <p className="text-xs text-muted-foreground">Staff must verify identity before processing</p>
            </div>
            <Switch
              checked={security.requireBiometricPayment}
              onCheckedChange={(v) => setSecurity(s => ({ ...s, requireBiometricPayment: v }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Auto-logout after (minutes)</Label>
            <Input
              type="number"
              value={security.autoLogoutMinutes}
              onChange={(e) => setSecurity(s => ({ ...s, autoLogoutMinutes: parseInt(e.target.value) || 30 }))}
              min={5}
              max={120}
              className="h-9 text-sm w-32"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={savingSettings} className="gap-2">
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save All Settings
        </Button>
      </div>
    </div>
  )
}

export default AdminSettings
