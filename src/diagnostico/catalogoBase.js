// Catálogo base del módulo Diagnóstico y propuesta.
// Los datos salen de los folletos, CTP, condiciones y guías de cada aseguradora (2023-2026).
// Ningún documento trae primas: el costo se captura desde la cotización de cada propuesta.
// Para sumar productos: Diagnóstico > Catálogo > Agregar producto (o importar un JSON con este mismo formato).

export const RAMOS = [
  { id: "ppr", label: "Retiro (PPR)" },
  { id: "vida", label: "Vida" },
  { id: "educacion", label: "Educación" },
  { id: "gmm", label: "Gastos médicos" },
];

const D_GNP = [21000, 32000, 45000, 56000, 68000, 87000, 111000, 128000, 175000, 233000];
const C_GNP = [10, 15, 20, 25, 30];
const T_GNP = { 10: 75000, 15: 112000, 20: 150000, 25: 187000, 30: 224000 };

export const CATALOGO_BASE = [
  // ---------------- AXA ----------------
  {
    id: "axa-protgt", aseguradora: "AXA", ramo: "vida", tipo: "temporal", nombre: "Vida ProTGT",
    descripcion: "Seguro de vida Temporal, Ordinario de Vida o Pagos Limitados, en pesos, dólares o UDI.",
    moneda: ["MXN", "USD", "UDI"], edadMin: 18, edadMax: 70, sumaMin: 300000,
    plazos: "Temporal 5, 10, 15, 20 y E.A. 65 · Ordinario y Pagos Limitados hasta 99 años",
    coberturas: ["Fallecimiento", "Anticipo 30% por fallecimiento y por enfermedad terminal", "Exención de pago por invalidez (BI)", "Invalidez total y permanente (PAI)", "Muerte accidental y colectiva", "Enfermedades graves (PAE)", "Cáncer (IAC)", "Cobertura conyugal", "Gastos funerarios", "Protección por desempleo"],
    notas: "Suma mínima $300,000 (Temporal $500,000; USD 30,000; 60,000 UDI). Descuentos por volumen de suma. Ingreso propio recomendado mayor a $25,000 al mes. Fuente: folleto VI-423 y CTP VI-427.",
  },
  {
    id: "axa-kids", aseguradora: "AXA", ramo: "educacion", tipo: "educacion", nombre: "Aliados+ Kids",
    descripcion: "Seguro de vida con ahorro para pagar la educación profesional del hijo (a los 18 o 22 años).",
    moneda: ["UDI"], edadMin: 18, edadMax: 70, edadHijoMax: 10, sumaMin: 25000, sumaMax: 500000, sumaEnUdi: true,
    plazos: "Hijo a los 18 años (acepta 0 a 8) o a los 22 años (acepta 0 a 10)",
    coberturas: ["Sobrevivencia del menor: entrega el ahorro elegido", "Fallecimiento del titular: paga el monto elegido", "Exención de primas por fallecimiento o invalidez (EFI)", "Pago adicional por invalidez (PAI)", "Anticipo 30% por enfermedad terminal"],
    notas: "Suma de 25,000 a 500,000 UDI. Titular de 18 a 70 años. Fuente: CTP VI-620.",
  },
  {
    id: "axa-mpr", aseguradora: "AXA", ramo: "ppr", tipo: "retiro", nombre: "Mi Proyecto R",
    descripcion: "Plan personal de retiro con seguro de vida; aportaciones deducibles (art. 151 LISR) y retiro a los 65 años.",
    moneda: ["MXN", "USD"], edadMin: 18, edadMax: 70, retiroEdad: 65, fiscal: "151",
    plazos: "Ahorro hasta los 65 años",
    fondos: [
      { nombre: "Dinámico MX (hasta 39 años)", tasa: 0.07 },
      { nombre: "Creciente (40 a 49 años)", tasa: 0.06 },
      { nombre: "Balanceado (50 a 59 años)", tasa: 0.05 },
      { nombre: "Conservador (60 años o más)", tasa: 0.03 },
    ],
    coberturas: ["Ahorro para el retiro con beneficios fiscales", "Seguro de vida", "Invalidez, cáncer, muerte accidental, gastos funerarios (adicionales)", "Anticipo 30% por fallecimiento y enfermedad terminal"],
    notas: "Tasas de proyección de la guía de inversión de AXA (pesos). El folleto es de 2020: usa el tope de deducción vigente (5 UMA anuales), no el monto impreso.",
  },
  {
    id: "axa-flexplus", aseguradora: "AXA", ramo: "gmm", tipo: "gmm", nombre: "Flex Plus",
    descripcion: "Gastos Médicos Mayores individual con elección de tabulador médico, gama hospitalaria y periodo de pago de siniestros.",
    moneda: ["MXN"], edadMin: 0, edadMax: 99,
    sumas: [750000, 1400000, 2800000, 4500000, 6500000, 9000000, 16000000, 23500000, 37500000, 69500000, 96500000, 134000000, 180000000],
    deducibles: [20500, 27500, 39500, 56500, 72500, 87500, 136000, 184000, 250000],
    coaseguros: [10, 15, 20, 30], topesCoaseguro: { 10: 64000, 15: 92000, 20: 115000, 30: 130000 },
    plazos: "Periodo de pago de siniestros: 4 meses, 2, 20 o 100 años",
    coberturas: ["Tabuladores Roble, Roble +50%, Roble +100%, Caoba, Cedro, Fresno, Olivo", "Gamas hospitalarias Diamante, Esmeralda, Zafiro", "Maternidad, medicamentos fuera del hospital, cobertura en el extranjero", "Programa +Care (oncología y ortopedia)", "Consultas Keralty sin deducible ni coaseguro"],
    notas: "Valores económicos 2026. Contratable desde el primer día de nacido y sin límite de edad (65 años o más con reglas especiales). Fuente: CTP AI-284, reglas de negocio y valores económicos 2026.",
  },

  // ---------------- GNP ----------------
  {
    id: "gnp-vidamas", aseguradora: "GNP", ramo: "vida", tipo: "temporal", nombre: "Vida Más",
    descripcion: "Seguro de vida con paquetes Esencial, Salud, Accidentes e Integral; versión Constante o con incremento.",
    moneda: ["MXN"], edadMin: 15, edadMax: 70,
    plazos: "Protección con opción de ahorro a 5, 10 o 15 años",
    coberturas: ["Fallecimiento", "Anticipo 30% por enfermedad terminal", "Asistencia funeraria para ti y un familiar", "Invalidez total y permanente / exención de primas", "Accidentes y pérdida de miembros", "Cáncer y enfermedades graves", "Indemnización diaria por hospitalización (hasta 40 días al año)", "Asistencia médica, psicológica, nutricional y dental"],
    notas: "Esencial acepta de 15 a 70 años; Salud, Accidentes e Integral de 15 a 60. Asistencia dental con suma mayor a $500,000. Suma mínima: confirmar en cotización.",
  },
  {
    id: "gnp-trasciende", aseguradora: "GNP", ramo: "vida", tipo: "vitalicio", nombre: "Trasciende",
    descripcion: "Vida vitalicia (hasta los 100 años) con pago de primas a plazo elegido y retiros parciales del valor en efectivo.",
    moneda: ["MXN", "USD"], edadMin: 0, edadMax: 70, sumaMin: 400000,
    plazos: "Pago de primas: 1, 5, 10, 15, 20 años o a edad alcanzada 65",
    coberturas: ["Protección vitalicia por fallecimiento", "Retiros parciales del valor en efectivo", "Vidas conjuntas (cónyuge)", "Invalidez y beneficios adicionales", "Cobertura Mujer", "Descuentos por volumen"],
    notas: "Suma mínima $400,000 (estándar) o $2,500,000 (selecto); USD 20,000. Sin prima mínima. De $10 a $20 millones se cotiza con Negocios Especiales. Edad máxima de aceptación: confirmar en cotización. Fuente: Conozca de Trasciende, oct 2026.",
  },
  {
    id: "gnp-consolida", aseguradora: "GNP", ramo: "ppr", tipo: "retiro", nombre: "Consolida",
    descripcion: "Mi plan ideal de retiro: ahorro con seguro, con estrategia fiscal en los artículos 93, 151 y 185 de la LISR.",
    moneda: ["MXN", "USD"], edadMin: 18, edadMax: 70, sumaMin: 400000, primaMinAnual: 8000, retiroEdades: [55, 60, 65, 70], fiscal: "93, 151 y 185",
    plazos: "Ahorro a edad alcanzada 55, 60, 65 o 70, o pago fijo de 5, 10, 15 o 20 años",
    coberturas: ["Ahorro garantizado para el retiro", "Fondo PPR (art. 151): deducible hasta 10% del ingreso y 5 UMA anuales", "Fondo art. 185: hasta $152,000 al año", "Suma asegurada por fallecimiento (Cobertura I o II)", "Invalidez y beneficios adicionales", "Rentas vitalicias, pago único o fideicomiso"],
    notas: "Suma mínima $400,000 y prima mínima $8,000 al año (en pesos). Asegurado y contratante deben ser la misma persona. Fuente: Conozca de Consolida abril 2026 y Visión Competitiva Retiro.",
  },
  ...[
    ["gnp-personaliza", "GNP Personaliza", [583000, 1166000, 2332000, 17490000, 40810000, 58300000, 93280000, 116600000, 174900000], true],
    ["gnp-versatil", "Línea Azul Versátil", [741000, 1472000, 2245000, 4143000, 8138000, 12207000, 19974000, 35063000, 43288000, 89208000], false],
    ["gnp-premium", "Línea Azul Premium", [891000, 1595000, 2065000, 2501000, 4985000, 7434000, 9745000, 24686000, 35558000, 46998000, 57573000, 70868000, 89790000], false],
    ["gnp-platino", "Línea Azul Platino", [891000, 1595000, 2065000, 2501000, 4985000, 7434000, 9745000, 24686000, 35558000, 46998000, 57573000, 70868000, 89790000], false],
    ["gnp-flexible", "Línea Azul Flexible", [891000, 1595000, 2065000, 2501000, 4985000, 7434000, 9745000, 12275000, 24686000, 35558000, 46998000, 57573000, 70868000, 89790000], false],
    ["gnp-esencial", "Línea Azul Esencial", [5689000], false],
  ].map(([id, nombre, sumas, conDed]) => ({
    id, aseguradora: "GNP", ramo: "gmm", tipo: "gmm", nombre,
    descripcion: "Gastos Médicos Mayores individual (guía de productos 2026).",
    moneda: ["MXN"], edadMin: 0, edadMax: 70, sumas,
    ...(conDed ? { deducibles: D_GNP, coaseguros: C_GNP, topesCoaseguro: T_GNP } : {}),
    plazos: "",
    coberturas: ["Tabulador médico y acceso hospitalario a elegir", "Participación fija o variable", "Deducible reinstalable anual"],
    notas: conDed
      ? "Deducibles y coaseguro de la opción de participación fija. De 65 a 70 años solo con participación variable. Confirmar montos en la cotización."
      : "Sumas aseguradas de la guía 2026 (confirmar la tabla de su producto). Deducibles y coaseguro: tomar de la cotización.",
  })),
];

export const TASA_FONDO_POR_EDAD = (edad) => (edad < 40 ? 0.07 : edad < 50 ? 0.06 : edad < 60 ? 0.05 : 0.03);
