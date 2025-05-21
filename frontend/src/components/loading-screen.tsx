import React from 'react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-4">
        <img src="/tickets.gif" alt="Loading..." className="w-35 h-32" />
        <p className="text-lg font-medium text-gray-600">Loading Eventify...</p>
      </div>
    </div>
  )
} 