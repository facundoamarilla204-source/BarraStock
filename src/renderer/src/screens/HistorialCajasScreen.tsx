import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function HistorialCajasScreen() {
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistorial = async () => {
    try {
      setLoading(true)
      const data = await (window as any).api.getHistorialCajas()
      setHistorial(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistorial()
  }, [])

  const exportPDF = async (cajaResumen: any) => {
    try {
      const caja = await (window as any).api.getCajaConVentas(cajaResumen.id)
      if (!caja) throw new Error('No se pudo obtener el detalle de la caja')
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text(`Resumen de Caja #${caja.numero}`, 14, 22)
    
    doc.setFontSize(11)
    doc.text(`Fecha de Apertura: ${new Date(caja.fechaApertura).toLocaleString()}`, 14, 32)
    doc.text(`Fecha de Cierre: ${new Date(caja.fechaCierre).toLocaleString()}`, 14, 38)
    
    const tableData = [
      ['Fondo Inicial', `$${caja.fondoInicial.toFixed(2)}`],
      ['Total Efectivo (Ventas)', `$${caja.totalEfectivo.toFixed(2)}`],
      ['Total Transferencia (Ventas)', `$${caja.totalTransferencia.toFixed(2)}`],
      ['Ventas Activas (Cant)', caja.cantidadVentas.toString()],
      ['Ventas Anuladas (Cant)', caja.cantidadAnuladas.toString()],
      ['Total Ventas', `$${caja.totalVentas.toFixed(2)}`],
      ['TOTAL ESPERADO EN CAJA (Efectivo)', `$${caja.totalEsperadoCaja.toFixed(2)}`]
    ]

    autoTable(doc, {
      startY: 45,
      head: [['Concepto', 'Monto / Cantidad']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    })

    // Nueva sección: Listado de Ventas
    const finalYResumen = (doc as any).lastAutoTable.finalY || 100
    
    doc.setFontSize(14)
    doc.text('Listado de Ventas', 14, finalYResumen + 10)

    const ventasData: string[][] = []
    
    caja.ventas.forEach((v: any) => {
      // Filtrar anuladas si el usuario quiere, o mostrarlas (vamos a mostrar todas marcando las anuladas)
      const estado = v.estado === 'anulada' ? 'ANULADA' : 'Ok'
      const hora = new Date(v.fecha).toLocaleTimeString()
      
      // Resumen de detalles de la venta (ej: "2x Cerveza, 1x Fernet")
      const detalleTexto = v.detalles.map((d: any) => {
        const nombre = d.tipo === 'producto' ? d.producto?.nombre : d.receta?.nombre
        return `${d.cantidad}x ${nombre}`
      }).join(', ')

      ventasData.push([
        `#${v.numero}`,
        hora,
        detalleTexto,
        v.medioPago,
        `$${v.total.toFixed(2)}`,
        estado
      ])
    })

    autoTable(doc, {
      startY: finalYResumen + 15,
      head: [['Nro', 'Hora', 'Detalle', 'Medio', 'Total', 'Estado']],
      body: ventasData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94] },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { cellWidth: 70 } // Darle más ancho a la columna de detalle
      }
    })

    doc.save(`Cierre_Caja_${caja.numero}.pdf`)
    } catch (error: any) {
      alert(error.message || 'Error al exportar PDF')
    }
  }

  if (loading) {
    return <div className="text-gray-400 p-6">Cargando historial...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Historial de Cajas</h2>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Caja Nro</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Apertura</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Cierre</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Fondo Inicial</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Total Vendido</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Total Esperado</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {historial.map((caja) => (
                <tr key={caja.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-200">
                    #{caja.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(caja.fechaApertura).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {caja.fechaCierre ? new Date(caja.fechaCierre).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">
                    ${caja.fondoInicial.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 text-right">
                    ${(caja.totalVentas || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-400 text-right">
                    ${(caja.totalEsperadoCaja || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      onClick={() => exportPDF(caja)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-md transition-colors"
                      title="Exportar a PDF"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No hay cajas cerradas en el historial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
