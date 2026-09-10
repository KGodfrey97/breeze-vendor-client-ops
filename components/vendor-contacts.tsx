"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Edit,
  Mail,
  Phone,
  Plus,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { InfoCard } from "@/components/ui/info-card"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type VendorContact = {
  id: string
  vendor_id: string
  first_name: string | null
  last_name: string | null
  title: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

type ContactForm = {
  firstName: string
  lastName: string
  title: string
  email: string
  phone: string
  isPrimary: boolean
  notes: string
}

type VendorContactsProps = {
  vendorId: string
}

const EMPTY_FORM: ContactForm = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  isPrimary: false,
  notes: "",
}

export function VendorContacts({
  vendorId,
}: VendorContactsProps) {
  const [contacts, setContacts] = useState<VendorContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingContact, setAddingContact] = useState(false)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)

  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<VendorContact | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)

  const fetchContacts = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contacts`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load vendor contacts"
        )
      }

      setContacts(data.contacts || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load vendor contacts"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [vendorId])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setAddingContact(false)
    setEditingContactId(null)
  }

  const startAdd = () => {
    setEditingContactId(null)
    setForm(EMPTY_FORM)
    setAddingContact(true)
  }

  const startEdit = (contact: VendorContact) => {
    setAddingContact(false)

    setEditingContactId(contact.id)

    setForm({
      firstName: contact.first_name || "",
      lastName: contact.last_name || "",
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.is_primary,
      notes: contact.notes || "",
    })
  }

  const saveNewContact = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create contact"
        )
      }

      await fetchContacts()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create contact"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveEditedContact = async () => {
    if (!editingContactId) return

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contacts/${editingContactId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update contact"
        )
      }

      await fetchContacts()
      resetForm()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update contact"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteContact = async (
    contactId: string
  ) => {
    try {
      setDeletingContactId(contactId)
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contacts/${contactId}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete contact"
        )
      }

      await fetchContacts()

      if (editingContactId === contactId) {
        resetForm()
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete contact"
      )
    } finally {
      setDeletingContactId(null)
    }
  }

  const makePrimary = async (
    contact: VendorContact
  ) => {
    try {
      setError(null)

      const response = await fetch(
        `/api/vendors/${vendorId}/contacts/${contact.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isPrimary: true,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update primary contact"
        )
      }

      await fetchContacts()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update primary contact"
      )
    }
  }

  const contactName = (
    contact: VendorContact
  ) => {
    const name = [
      contact.first_name,
      contact.last_name,
    ]
      .filter(Boolean)
      .join(" ")

    return name || "Unnamed Contact"
  }

  const renderForm = () => (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactFirstName">
            First Name
          </Label>

          <Input
            id="contactFirstName"
            value={form.firstName}
            onChange={(e) =>
              setForm({
                ...form,
                firstName: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactLastName">
            Last Name
          </Label>

          <Input
            id="contactLastName"
            value={form.lastName}
            onChange={(e) =>
              setForm({
                ...form,
                lastName: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactTitle">
            Title
          </Label>

          <Input
            id="contactTitle"
            placeholder="Account Manager"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">
            Email
          </Label>

          <Input
            id="contactEmail"
            type="email"
            placeholder="name@vendor.com"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">
            Phone
          </Label>

          <Input
            id="contactPhone"
            placeholder="702-555-1234"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Primary Contact
          </Label>

          <Button
            type="button"
            variant={
              form.isPrimary
                ? "default"
                : "outline"
            }
            className="w-full justify-start"
            onClick={() =>
              setForm({
                ...form,
                isPrimary: !form.isPrimary,
              })
            }
          >
            <Star
              className={`mr-2 h-4 w-4 ${
                form.isPrimary
                  ? "fill-current"
                  : ""
              }`}
            />

            {form.isPrimary
              ? "Primary Contact"
              : "Set as Primary"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactNotes">
          Notes
        </Label>

        <Textarea
          id="contactNotes"
          placeholder="Notes about this contact..."
          value={form.notes}
          onChange={(e) =>
            setForm({
              ...form,
              notes: e.target.value,
            })
          }
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetForm}
          disabled={isSaving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>

        <Button
          size="sm"
          onClick={
            editingContactId
              ? saveEditedContact
              : saveNewContact
          }
          disabled={isSaving}
        >
          <Check className="mr-2 h-4 w-4" />

          {isSaving
            ? "Saving..."
            : editingContactId
            ? "Save Changes"
            : "Add Contact"}
        </Button>
      </div>
    </div>
  )

  return (
    <InfoCard
      title="Vendor Contacts"
      icon={UserRound}
      action={
        !addingContact &&
        !editingContactId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={startAdd}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {addingContact && renderForm()}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading contacts...
          </p>
        ) : contacts.length === 0 &&
          !addingContact ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

            <p className="font-medium">
              No vendor contacts yet
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add the main people your team works with at this vendor.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={startAdd}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
              >
                {editingContactId ===
                contact.id ? (
                  renderForm()
                ) : (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {contactName(contact)}
                          </p>

                          {contact.is_primary && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              Primary
                            </span>
                          )}
                        </div>

                        {contact.title && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {contact.title}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center text-muted-foreground hover:text-foreground"
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {contact.email}
                            </a>
                          )}

                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="mr-2 h-4 w-4" />
                              {contact.phone}
                            </a>
                          )}
                        </div>

                        {contact.notes && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {contact.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {!contact.is_primary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              makePrimary(contact)
                            }
                            title="Make primary contact"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            startEdit(contact)
                          }
                          title="Edit contact"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            setContactToDelete(contact)
                        }
                        disabled={
                            deletingContactId === contact.id
                        }
                        title="Delete contact"
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <AlertDialog
        open={Boolean(contactToDelete)}
        onOpenChange={(open) => {
            if (!open) {
            setContactToDelete(null)
            }
        }}
        >
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>
                Delete contact?
            </AlertDialogTitle>

            <AlertDialogDescription>
                {contactToDelete ? (
                <>
                    This will permanently delete{" "}
                    <span className="font-medium text-foreground">
                    {contactName(contactToDelete)}
                    </span>
                    {" "}from this vendor. This action cannot be undone.
                </>
                ) : (
                "This contact will be permanently deleted."
                )}
            </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
            <AlertDialogCancel>
                Cancel
            </AlertDialogCancel>

            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                if (!contactToDelete) return

                await deleteContact(
                    contactToDelete.id
                )

                setContactToDelete(null)
                }}
            >
                Delete Contact
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    </InfoCard>
  )
}