"use client";

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function PrintButton() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button onClick={handlePrint} variant="outline" className="gap-2 print:hidden">
      <Download className="h-4 w-4" />
      Download as PDF
    </Button>
  )
}
