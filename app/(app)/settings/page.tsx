"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Database } from "@/lib/db-types"
import { AlertCircle, Bell, CheckCircle, CreditCard, Loader2, Save, Shield, User } from "lucide-react"

interface Profile {
  id: string | null
  email: string | null
  full_name: string | null
  organization: string | null
  role: string | null
}

type NotificationSettings = {
  emailNotifications: boolean
  claimUpdates: boolean
  letterGenerated: boolean
  statusChanges: boolean
  weeklyReports: boolean
  marketingEmails: boolean
}

type SecuritySettings = {
  twoFactorEnabled: boolean
  sessionTimeout: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type UserSettingRow = Database["public"]["Tables"]["user_settings"]["Row"]
type UserSettingInsert = Database["public"]["Tables"]["user_settings"]["Insert"]

const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  claimUpdates: true,
  letterGenerated: true,
  statusChanges: true,
  weeklyReports: false,
  marketingEmails: false,
}

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: "30",
}

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

const USER_SETTING_KEYS = {
  notifications: "notification_settings",
  security: "security_settings",
} as const

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  //const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [notificationSaving, setNotificationSaving] = useState(false)
  const [securitySaving, setSecuritySaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    organization: "",
    role: "staff",
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPasswordForm)

  const fetchUserData = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/account/profile", {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load profile")
      }
      
      const profile = payload

      setProfile(profile)
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        organization: profile.organization || "",
        role: profile.role || "staff",
      })

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : "An unexpected error occurred"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/account/settings", {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load settings")
      }
 
      const settingsByKey = new Map(
        payload.map((setting) => [setting.setting_key, setting])
      )

      const notificationSetting = settingsByKey.get(USER_SETTING_KEYS.notifications)
      const securitySetting = settingsByKey.get(USER_SETTING_KEYS.security)

      setNotificationSettings({
        ...defaultNotificationSettings,
        ...readSettingsValue<NotificationSettings>(notificationSetting as any),
      })

      setSecuritySettings({
        ...defaultSecuritySettings,
        ...readSettingsValue<SecuritySettings>(securitySetting as any),
      })

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : "An unexpected error occurred"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
    fetchUserSettings()
  }, [])

  const readSettingsValue = <T extends Record<string, unknown>>(setting: UserSettingRow | undefined): Partial<T> => {
    if (!setting || typeof setting.setting_value !== "object" || setting.setting_value === null || Array.isArray(setting.setting_value)) {
      return {}
    }

    return setting.setting_value as Partial<T>
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          organization: profileForm.organization,
          role: profileForm.role,
        }),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error)
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: profileForm.full_name,
              organization: profileForm.organization,
              role: profileForm.role,
            }
          : null,
      )
      setMessage({ type: "success", text: "Profile updated." })
    } catch (updateError) {
      setMessage({
        type: "error",
        text: updateError instanceof Error ? updateError.message : "Failed to update profile.",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setNotificationSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setting_key: USER_SETTING_KEYS.notifications,
          setting_value: notificationSettings,
        }),
      })
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error)
      }
      setMessage({ type: "success", text: "Notification preferences updated." })
    } catch (updateError) {
      setMessage({
        type: "error",
        text: updateError instanceof Error ? updateError.message : "Failed to save notification preferences.",
      })
    } finally {
      setNotificationSaving(false)
    }
  }

  const handleSecurityUpdate = async () => {
    setSecuritySaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setting_key: USER_SETTING_KEYS.security,
          setting_value: securitySettings,
        }),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error)
      }
      setMessage({ type: "success", text: "Security preferences updated." })
    } catch (updateError) {
      setMessage({
        type: "error",
        text: updateError instanceof Error ? updateError.message : "Failed to save security settings.",
      })
    } finally {
      setSecuritySaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setPasswordSaving(true)
    setMessage(null)

    try {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        throw new Error("Please complete all password fields.")
      }

      if (passwordForm.newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters long.")
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("New password and confirmation do not match.")
      }

      if (passwordForm.currentPassword === passwordForm.newPassword) {
        throw new Error("New password must be different from your current password.")
      }

      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error)
      }

      setPasswordForm(initialPasswordForm)
      setMessage({ type: "success", text: "Password updated successfully." })
    } catch (updateError) {
      setMessage({
        type: "error",
        text: updateError instanceof Error ? updateError.message : "Failed to update password.",
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
        </div>
        <div className="text-center py-4 text-destructive">
          <p>Error loading settings: {error}</p>
          <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page">

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={profileForm.email} disabled className="bg-muted" />
                    <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={profileForm.organization}
                      onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })}
                      placeholder="Enter your organization"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={profileForm.role} onValueChange={(value) => setProfileForm({ ...profileForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="provider">Healthcare Provider</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="claimUpdates">Claim Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified when claim status changes</p>
                  </div>
                  <Switch
                    id="claimUpdates"
                    checked={notificationSettings.claimUpdates}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, claimUpdates: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="letterGenerated">Letter Generated</Label>
                    <p className="text-sm text-muted-foreground">Notify when AI generates appeal letters</p>
                  </div>
                  <Switch
                    id="letterGenerated"
                    checked={notificationSettings.letterGenerated}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, letterGenerated: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="statusChanges">Status Changes</Label>
                    <p className="text-sm text-muted-foreground">Receive updates for important account status changes</p>
                  </div>
                  <Switch
                    id="statusChanges"
                    checked={notificationSettings.statusChanges}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, statusChanges: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyReports">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly analytics summaries</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={notificationSettings.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Product updates and feature announcements</p>
                  </div>
                  <Switch
                    id="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, marketingEmails: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleNotificationUpdate} disabled={notificationSaving}>
                {notificationSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notification Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    id="twoFactor"
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({ ...securitySettings, twoFactorEnabled: checked })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout</Label>
                  <Select
                    value={securitySettings.sessionTimeout}
                    onValueChange={(value) => setSecuritySettings({ ...securitySettings, sessionTimeout: value })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select timeout duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-sm text-muted-foreground">Automatically log out after period of inactivity</p>
                </div>

                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePasswordUpdate} disabled={passwordSaving}>
                    {passwordSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={handleSecurityUpdate} disabled={securitySaving}>
                {securitySaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Security Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <p className="text-sm text-muted-foreground">Professional Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$49/month</p>
                    <p className="text-sm text-muted-foreground">Billed monthly</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Change Plan
                  </Button>
                  <Button variant="outline" size="sm">
                    Cancel Subscription
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Payment Method</h4>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-8 items-center justify-center rounded bg-blue-600 text-xs text-white">VISA</div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Billing History</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">January 2024</p>
                      <p className="text-sm text-muted-foreground">Professional Plan</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$49.00</p>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">December 2023</p>
                      <p className="text-sm text-muted-foreground">Professional Plan</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$49.00</p>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
