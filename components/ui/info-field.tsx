// components/ui/info-field.tsx

interface InfoFieldProps {
  label: string
  value?: React.ReactNode
  colSpan?: number
}

export function InfoField({ label, value, colSpan }: InfoFieldProps) {
  return (
    <div className={`col-span-${colSpan ?? 1}`}>
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">
        {value ?? "—"}
      </p>
    </div>
  )
}