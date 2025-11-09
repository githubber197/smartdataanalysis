import React from 'react'
import { SparklesIcon } from '@heroicons/react/24/solid'

export default function Header(){
  return (
    <header className="bg-white rounded-xl p-6 shadow-sm border mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🚀 Integrated Data Analytics Platform</h1>
          <p className="text-sm text-gray-500">Database → Cleaning → Analytics → AI Insights → ML Predictions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn px-4 py-2 rounded-md bg-teal-600 text-white">Connect</button>
          <SparklesIcon className="w-6 h-6 text-amber-500" />
        </div>
      </div>
    </header>
  )
}
