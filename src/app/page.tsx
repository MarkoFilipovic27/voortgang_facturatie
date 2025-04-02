"use client"

import * as React from "react"
import { ProjectTable } from "@/components/project-table"

export default function Home() {
  // Example data
  const project = {
    projectCode: "2024-001",
    projectDescription: "Voorbeeld Project",
    phases: [
      {
        phaseCode: "01",
        phaseDescription: "Fase 1",
        contractSum: 50000,
        actualCosts: 30000,
        actualWorkTypes: 25000,
        invoiced: 20000,
        progress: 40,
        newProgress: null,
        toInvoice: 0,
      },
      {
        phaseCode: "02",
        phaseDescription: "Fase 2",
        contractSum: 75000,
        actualCosts: 45000,
        actualWorkTypes: 40000,
        invoiced: 35000,
        progress: 60,
        newProgress: null,
        toInvoice: -3000,
      },
    ],
  }

  const handleProgressChange = (projectCode: string, phaseCode: string, value: number) => {
    console.log(`Progress changed for ${projectCode} - ${phaseCode}: ${value}`)
  }

  const handleSubmitProgress = (projectCode: string) => {
    console.log(`Submit progress for ${projectCode}`)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Project voortgang</h1>
        </div>
        <ProjectTable
          project={project}
          onProgressChange={handleProgressChange}
          onSubmitProgress={handleSubmitProgress}
        />
      </div>
    </main>
  )
} 