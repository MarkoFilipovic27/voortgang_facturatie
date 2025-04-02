"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface Phase {
  phaseDescription: string
  phaseCode: string
  contractSum: number
  actualCosts: number
  actualWorkTypes: number
  invoiced: number
  progress: number
  newProgress: number | null
  toInvoice: number
}

interface Project {
  projectCode: string
  projectDescription: string
  phases: Phase[]
}

interface ProjectTableProps {
  project: Project
  onProgressChange: (projectCode: string, phaseCode: string, value: number) => void
  onSubmitProgress: (projectCode: string) => void
}

export function ProjectTable({ project, onProgressChange, onSubmitProgress }: ProjectTableProps) {
  return (
    <div className="rounded-md border bg-white shadow-sm">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            {project.projectCode} - {project.projectDescription}
          </h2>
          <Button
            onClick={() => onSubmitProgress(project.projectCode)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Verwerken voortgang
          </Button>
        </div>
      </div>
      <div className="p-0">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[200px]">Fase</TableHead>
              <TableHead className="text-right">Aanneemsom</TableHead>
              <TableHead className="text-right">Nacalculatie Kosten</TableHead>
              <TableHead className="text-right">Nacalculatie Werksoorten</TableHead>
              <TableHead className="text-right">Gefactureerd</TableHead>
              <TableHead className="text-right">Voortgang</TableHead>
              <TableHead className="text-right">Nieuwe voortgang</TableHead>
              <TableHead className="text-right">Te factureren</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.phases.map((phase) => (
              <TableRow key={phase.phaseCode} className="hover:bg-slate-50">
                <TableCell className="font-medium">{phase.phaseDescription}</TableCell>
                <TableCell className="text-right">€ {phase.contractSum.toLocaleString()}</TableCell>
                <TableCell className="text-right">€ {phase.actualCosts.toLocaleString()}</TableCell>
                <TableCell className="text-right">€ {phase.actualWorkTypes.toLocaleString()}</TableCell>
                <TableCell className="text-right">€ {phase.invoiced.toLocaleString()}</TableCell>
                <TableCell className="text-right">{phase.progress}%</TableCell>
                <TableCell className="text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={phase.newProgress === null ? '' : phase.newProgress}
                    onChange={(e) => onProgressChange(project.projectCode, phase.phaseCode, Number(e.target.value))}
                    className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right"
                  />
                </TableCell>
                <TableCell className={`text-right font-medium ${phase.toInvoice < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  € {phase.toInvoice.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 