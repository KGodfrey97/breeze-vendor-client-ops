import { ClaimsClientPage} from "./ClaimsClientPage"

interface ClaimsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ClaimsPage({ searchParams }: ClaimsPageProps) {
  const resolvedSearchParams = await searchParams
  
  return (
    <ClaimsClientPage />
  )
}