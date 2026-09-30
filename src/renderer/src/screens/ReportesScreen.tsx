import { useState, useEffect } from 'react'
import { BarChart, ArrowDownToLine, Calendar, DollarSign, CreditCard, Wallet, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function ReportesScreen() {
  const [desde, setDesde] = useState(() => {
    const d = new Date()
    d.setDate(1) // Primer día del mes
    return d.toISOString().split('T')[0]
  })
  
  const [hasta, setHasta] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [datos, setDatos] = useState<any>(null)
  const [tab, setTab] = useState<'ventas' | 'rentabilidad'>('ventas')

  const cargarReporte = async () => {
    try {
      setLoading(true)
      const res = await (window as any).api.getReporteAvanzado(desde, hasta)
      setDatos(res)
    } catch (error: any) {
      alert('Error cargando el reporte: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarReporte()
  }, [desde, hasta])

  const exportarPDF = () => {
    if (!datos || datos.ranking.length === 0) {
      alert('No hay datos para exportar en este periodo.')
      return
    }

    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('Reporte de Ventas', 14, 22)
    
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Desde: ${desde}`, 14, 30)
    doc.text(`Hasta: ${hasta}`, 14, 36)

    // Resumen
    autoTable(doc, {
      startY: 45,
      head: [['Resumen', 'Monto / Cantidad']],
      body: [
        ['Total Recaudado', `$${datos.totalRecaudado.toFixed(2)}`],
        ['Efectivo', `$${datos.totalEfectivo.toFixed(2)}`],
        ['Transferencia', `$${datos.totalTransferencia.toFixed(2)}`],
        ['Débito', `$${datos.totalDebito.toFixed(2)}`],
        ['Crédito', `$${datos.totalCredito.toFixed(2)}`],
        ['QR', `$${datos.totalQR.toFixed(2)}`],
        ['Cantidad Ventas', datos.cantidadVentas.toString()],
        ['Ticket Promedio', `$${datos.ticketPromedio.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    })

    const finalYResumen = (doc as any).lastAutoTable.finalY || 100

    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text('Ranking de Productos / Combos', 14, finalYResumen + 10)

    const rankingData = datos.ranking.map((item: any, i: number) => [
      i + 1,
      item.nombre,
      item.tipo,
      item.cantidad,
      `$${item.totalFacturado.toFixed(2)}`
    ])

    autoTable(doc, {
      startY: finalYResumen + 15,
      head: [['#', 'Nombre', 'Tipo', 'Cantidad', 'Generado']],
      body: rankingData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94] }
    })

    doc.save(`Reporte_Ventas_${desde}_al_${hasta}.pdf`)
  }

  // Helper para renderizar barras proporcionales
  const renderBarra = (valor: number, total: number, colorClass: string) => {
    const porcentaje = total > 0 ? (valor / total) * 100 : 0
    return (
      <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${porcentaje}%` }}></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100 flex items-center gap-2">
            <BarChart className="w-8 h-8 text-blue-500" />
            Reportes Avanzados
          </h1>
          <p className="text-gray-400 mt-1">Analiza el rendimiento de tus ventas y productos más vendidos.</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            <input 
              type="date" 
              className="bg-transparent text-sm text-gray-200 outline-none border-r border-gray-700 pr-4"
              value={desde}
              onChange={e => setDesde(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">a</span>
            <input 
              type="date" 
              className="bg-transparent text-sm text-gray-200 outline-none pr-2"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && !datos && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Cargando reporte...</div>
        </div>
      )}

      {!loading && datos && (
        <div className="space-y-6">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              onClick={() => setTab('ventas')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                tab === 'ventas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Ventas Generales
            </button>
            <button
              onClick={() => setTab('rentabilidad')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                tab === 'rentabilidad' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Rentabilidad
            </button>
          </div>

          {tab === 'ventas' ? (
            <>
              {/* Tarjetas de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-blue-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Total Recaudado</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalRecaudado.toFixed(2)}</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet className="w-5 h-5 text-emerald-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Efectivo</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalEfectivo.toFixed(2)}</p>
                  {renderBarra(datos.totalEfectivo, datos.totalRecaudado, 'bg-emerald-500')}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg"><CreditCard className="w-5 h-5 text-purple-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Transferencia</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalTransferencia.toFixed(2)}</p>
                  {renderBarra(datos.totalTransferencia, datos.totalRecaudado, 'bg-purple-500')}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><CreditCard className="w-5 h-5 text-blue-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Débito</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalDebito.toFixed(2)}</p>
                  {renderBarra(datos.totalDebito, datos.totalRecaudado, 'bg-blue-500')}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/10 rounded-lg"><CreditCard className="w-5 h-5 text-red-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Crédito</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalCredito.toFixed(2)}</p>
                  {renderBarra(datos.totalCredito, datos.totalRecaudado, 'bg-red-500')}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-500/10 rounded-lg"><CreditCard className="w-5 h-5 text-yellow-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">QR</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalQR.toFixed(2)}</p>
                  {renderBarra(datos.totalQR, datos.totalRecaudado, 'bg-yellow-500')}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg"><FileText className="w-5 h-5 text-orange-500" /></div>
                    <span className="text-gray-400 font-medium text-sm">Ventas y Ticket</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-100">{datos.cantidadVentas}</p>
                    <span className="text-gray-500 text-sm">tickets</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Promedio: <span className="text-gray-200">${datos.ticketPromedio.toFixed(2)}</span></p>
                </div>

              </div>

              {/* Ranking y Exportación */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-100">Ranking de Ventas (Top 10)</h2>
                  <button 
                    onClick={exportarPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors border border-gray-700"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-sm">
                        <th className="pb-3 px-4 font-medium w-16 text-center">#</th>
                        <th className="pb-3 px-4 font-medium">Producto / Combo</th>
                        <th className="pb-3 px-4 font-medium">Categoría</th>
                        <th className="pb-3 px-4 font-medium text-right">Cant. Vendida</th>
                        <th className="pb-3 px-4 font-medium text-right">Total Generado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.ranking.slice(0, 10).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                          <td className="py-3 px-4 text-center text-gray-500 font-mono">{i + 1}</td>
                          <td className="py-3 px-4 text-gray-200 font-medium">{item.nombre}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                              {item.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300 font-bold">{item.cantidad}</td>
                          <td className="py-3 px-4 text-right text-green-400 font-mono">${item.totalFacturado.toFixed(2)}</td>
                        </tr>
                      ))}
                      {datos.ranking.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No hay ventas registradas en este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {datos.ranking.length > 10 && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    Mostrando los 10 mejores. Exporta a PDF para ver el listado completo ({datos.ranking.length} items).
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Tarjetas de Rentabilidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-400 font-medium text-sm">Ventas Netas (Base Imponible)</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-100">${datos.totalNeto.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs mt-1">Suma de ventas descontando IVA</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-400 font-medium text-sm">Costo de Mercadería</span>
                  </div>
                  <p className="text-3xl font-bold text-red-400">
                    ${datos.totalCostoMercaderia.toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Sólo incluye productos con costo asignado</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-400 font-medium text-sm">Ganancia Bruta</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    ${datos.totalGananciaBruta.toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Rentabilidad acumulada</p>
                </div>
              </div>

              {datos.tieneCostosIncompletos && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 text-orange-200">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-orange-400">Datos Incompletos</h4>
                    <p className="text-sm mt-1">Existen ventas de productos que no tenían un costo informado en el momento de la venta. El cálculo de rentabilidad está incompleto.</p>
                  </div>
                </div>
              )}

              {/* Detalle por Producto */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-100">Rentabilidad por Producto</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-sm">
                        <th className="pb-3 px-4 font-medium">Producto / Combo</th>
                        <th className="pb-3 px-4 font-medium text-right">Cant.</th>
                        <th className="pb-3 px-4 font-medium text-right">Total Generado</th>
                        <th className="pb-3 px-4 font-medium text-right">Costo Total</th>
                        <th className="pb-3 px-4 font-medium text-right">Ganancia Bruta</th>
                        <th className="pb-3 px-4 font-medium text-right">Margen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.ranking.map((item: any, i: number) => {
                        const hasMargin = item.totalFacturado > 0 && item.totalCosto > 0 && !item.costoIncompleto;
                        const margin = hasMargin ? ((item.totalGanancia / item.totalFacturado) * 100).toFixed(1) + '%' : '-';
                        return (
                          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="text-gray-200 font-medium flex items-center gap-2">
                                {item.nombre}
                                {item.costoIncompleto && (
                                  <span className="text-orange-400" title="Costos incompletos">⚠️</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-300">{item.cantidad}</td>
                            <td className="py-3 px-4 text-right text-gray-300 font-mono">${item.totalFacturado.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-red-400 font-mono">
                              {item.totalCosto > 0 ? `$${item.totalCosto.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-green-400 font-mono font-bold">
                              {item.totalCosto > 0 ? `$${item.totalGanancia.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-300">
                              <span className={`px-2 py-1 rounded text-xs ${hasMargin ? 'bg-gray-800' : 'text-gray-600'}`}>
                                {margin}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {datos.ranking.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            No hay ventas registradas en este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  )
}
