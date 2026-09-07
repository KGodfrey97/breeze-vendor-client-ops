import { PatientsClientPage } from "./PatientsClientPage"

interface PatientsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const resolvedSearchParams = await searchParams
  
  return (
    <PatientsClientPage />
  )
}