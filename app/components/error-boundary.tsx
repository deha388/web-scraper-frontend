"use client"

import { useEffect } from "react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <button className="px-4 py-2 bg-primary text-primary-foreground rounded" onClick={() => reset()}>
        Try again
      </button>
    </div>
  )
}

