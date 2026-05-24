'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Old page — replaced by Google Auth + parent dashboard flow
export default function NameEntryPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/auth') }, [router])
  return null
}