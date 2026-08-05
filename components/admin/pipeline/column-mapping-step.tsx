"use client"

import { useState, useEffect, useMemo } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { ColumnMapping, ImportLeadRow } from "@/app/actions/leads"
import { ParsedSheet, applyMapping, guessColumnMapping } from "@/lib/leads/import-parser"

interface ColumnMappingStepProps {
  sheet: ParsedSheet
  onMappingChange: (mapping: ColumnMapping, validCount: number) => void
}

const REQUIRED_FIELDS = ["phone"]
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: "Nome",
  phone: "Telefone*",
  email: "Email",
  source: "Origem",
  notes: "Observações",
  state: "Estado (UF)",
  ies: "IES (Universidade)",
}

export function ColumnMappingStep({ sheet, onMappingChange }: ColumnMappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: "",
    phone: "",
    email: "",
    source: "",
    notes: "",
    state: "",
    ies: "",
  })

  // Auto-detect mapping quando sheet muda (ajuste de estado durante o render)
  const [prevSheet, setPrevSheet] = useState(sheet)
  if (prevSheet !== sheet) {
    setPrevSheet(sheet)
    setMapping(prev => ({ ...prev, ...guessColumnMapping(sheet.headers) }))
  }

  // Calculate preview and valid count
  const { previewRows, validCount } = useMemo(() => {
    const mapped = applyMapping(sheet.rows, mapping)
    return {
      previewRows: mapped.slice(0, 10), // Show first 10
      validCount: mapped.length
    }
  }, [sheet, mapping])

  // Notify parent of changes
  useEffect(() => {
    onMappingChange(mapping, validCount)
  }, [mapping, validCount, onMappingChange])

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value === "_none" ? "" : value }))
  }

  const getUnmappedColumns = () => {
    const mappedCols = Object.values(mapping).filter(Boolean)
    return sheet.headers.filter(h => !mappedCols.includes(h))
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-200 mb-4">Mapeamento de Colunas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(FIELD_LABELS) as Array<keyof ColumnMapping>).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                {FIELD_LABELS[field]}
              </Label>
              <Select
                value={mapping[field] || "_none"}
                onValueChange={(value) => handleFieldChange(field, value)}
              >
                <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs">
                  <SelectValue placeholder="Selecione a coluna..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="_none" className="text-slate-400">
                    -- Ignorar --
                  </SelectItem>
                  {sheet.headers.map((header) => (
                    <SelectItem key={header} value={header} className="text-xs">
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Pré-visualização ({validCount} leads válidos)</h3>
          {!mapping.phone && (
            <span className="text-xs text-red-400 font-medium">
              * Coluna de telefone é obrigatória
            </span>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader className="bg-slate-800/80 sticky top-0">
                <TableRow className="border-slate-700 hover:bg-slate-800/80">
                  <TableHead className="text-xs font-medium text-slate-300 h-8">Nome</TableHead>
                  <TableHead className="text-xs font-medium text-slate-300 h-8">Telefone</TableHead>
                  <TableHead className="text-xs font-medium text-slate-300 h-8">Email</TableHead>
                  <TableHead className="text-xs font-medium text-slate-300 h-8">Estado</TableHead>
                  <TableHead className="text-xs font-medium text-slate-300 h-8">IES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      Nenhum lead válido encontrado com o mapeamento atual.
                    </TableCell>
                  </TableRow>
                ) : (
                  previewRows.map((row, idx) => (
                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="text-xs py-2 font-medium text-slate-300">{row.Nome || "-"}</TableCell>
                      <TableCell className="text-xs py-2 text-slate-400 font-mono">{row.Telefone}</TableCell>
                      <TableCell className="text-xs py-2 text-slate-400">{row.Email || "-"}</TableCell>
                      <TableCell className="text-xs py-2 text-slate-400">{row.Estado || "-"}</TableCell>
                      <TableCell className="text-xs py-2 text-slate-400">{row.IES || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Leads sem número de telefone válido serão ignorados. O telefone deve conter DDD.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}



