import React from 'react'
import SnteEscuelas from './SnteEscuelas.jsx'

export const RESULTADOS = ['Sin contactar', 'Volver a llamar', 'No contestó', 'Número no existe', 'No le interesa', 'Interesado', 'Cita', 'Cotización']

// Mi cartera: las escuelas asignadas al asesor, filtrables por sección (51 estatal · 23 federal).
export default function SnteCartera({ onSeccion, soyAdmin }) {
  return (
    <div>
      <span className="snte-etiqueta">Cartera asignada</span>
      <h1 className="snte-h1">Mi cartera</h1>
      <SnteEscuelas soyAdmin={soyAdmin} onSeccion={onSeccion} />
    </div>
  )
}
