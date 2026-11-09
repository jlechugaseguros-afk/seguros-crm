// Base de conocimiento del chat de ayuda flotante.
// Cada tema: id, tab (pestaña a la que lleva; null si es general), titulo, palabras (para el buscador) y pasos.
// Para agregar ayuda nueva basta con sumar un objeto a esta lista.

export const AYUDA_TEMAS = [
  {
    id: "poliza-nueva",
    tab: "clientes",
    titulo: "Agregar una póliza a un cliente",
    palabras: "poliza polizas agregar segunda nueva otra cliente aseguradora ramo vigencia",
    pasos: [
      "Entra a Clientes y abre al cliente.",
      "Ve a la pestaña Pólizas.",
      "Toca Agregar póliza y llena aseguradora, ramo, número de póliza, prima anual y vigencia.",
      "Si tu aseguradora o ramo no está en la lista, elige \"Otra\"/\"Otro\" y escríbelo a mano.",
    ],
  },
  {
    id: "cliente-nuevo",
    tab: "clientes",
    titulo: "Dar de alta un cliente",
    palabras: "cliente nuevo alta registrar crear agregar prima anual prospecto",
    pasos: [
      "En Clientes toca el botón +.",
      "Captura los datos personales y los de la póliza (las fechas se escriben dd/mm/aaaa).",
      "La prima anual es obligatoria: si falta, el sistema te ofrece corregirla o guardar a la persona como prospecto.",
    ],
  },
  {
    id: "cliente-editar",
    tab: "clientes",
    titulo: "Editar los datos de un cliente",
    palabras: "editar modificar corregir cambiar datos cliente telefono correo",
    pasos: [
      "Abre al cliente desde Clientes.",
      "Toca Editar: se abre toda la información capturada en el alta.",
      "Cambia uno o varios datos y guarda.",
    ],
  },
  {
    id: "cliente-buscar",
    tab: "clientes",
    titulo: "Buscar un cliente",
    palabras: "buscar busqueda barra nombre apellido telefono numero poliza encontrar",
    pasos: [
      "En Clientes usa la barra de búsqueda de arriba.",
      "Puedes buscar por nombre, apellido, teléfono o número de póliza.",
    ],
  },
  {
    id: "documentos",
    tab: "clientes",
    titulo: "Subir documentos y facturas de un cliente",
    palabras: "documentos documento articulo 492 factura facturas subir pdf foto ine comprobante",
    pasos: [
      "Abre al cliente y entra a Documentos Artículo 492 para subir INE, comprobante de domicilio y demás (PDF o foto).",
      "En Facturas Agente puedes guardar varias facturas por cliente con el botón Agregar factura.",
      "En cada póliza también puedes subir la foto o PDF de la póliza.",
    ],
  },
  {
    id: "importar",
    tab: "clientes",
    titulo: "Importar mi cartera desde Excel",
    palabras: "importar cartera excel csv plantilla exportar subir masivo",
    pasos: [
      "En el menú lateral toca Importar cartera.",
      "Descarga la plantilla, llénala con tus clientes y pólizas, y súbela (Excel o CSV).",
      "El sistema evita duplicados por teléfono/nombre y por número de póliza.",
      "Para sacar tu cartera usa Exportar a Excel, junto a ese botón.",
    ],
  },
  {
    id: "prospecto-nuevo",
    tab: "prospectos",
    titulo: "Registrar un prospecto",
    palabras: "prospecto nuevo registrar agregar origen referido seguimiento",
    pasos: [
      "En Prospectos toca el botón de nuevo prospecto.",
      "Captura nombre, teléfono, correo y el Origen del prospecto (si es Referido, elige al cliente que lo recomendó).",
      "Marca \"Requiere seguimiento\" si quieres agendar acción, fecha y horario: se crea una actividad en el Planificador.",
    ],
  },
  {
    id: "prospecto-etapas",
    tab: "prospectos",
    titulo: "Etapas del embudo y seguimiento",
    palabras: "etapas embudo pipeline seguimiento cotizacion perdido nuevo prospecto acciones historial comentario",
    pasos: [
      "Las etapas son: Nuevo prospecto, Seguimiento, Cotización, Cliente y Perdido.",
      "En Seguimiento eliges una acción (reagendar cita, cotizar, hacer solicitud, pedir referidos, etc.).",
      "Cada acción queda en el historial y pide un comentario obligatorio.",
      "Al marcar Perdido se abre una ventana para indicar el motivo.",
    ],
  },
  {
    id: "cotizaciones",
    tab: "prospectos",
    titulo: "Subir cotizaciones a un prospecto",
    palabras: "cotizacion cotizaciones subir pdf foto descargar prospecto enviada",
    pasos: [
      "Abre al prospecto y pásalo a la etapa Cotización.",
      "Sube una o varias cotizaciones (PDF o foto).",
      "Puedes descargarlas después desde el mismo prospecto.",
    ],
  },
  {
    id: "convertir",
    tab: "prospectos",
    titulo: "Convertir un prospecto en cliente",
    palabras: "convertir cliente prospecto cierre venta primera poliza prima",
    pasos: [
      "Abre al prospecto y elige Convertir a cliente.",
      "Indica aseguradora, ramo y prima anual: se crea la primera póliza.",
      "Se conserva el historial y las cotizaciones. Si aún no cierra, elige Seguir como prospecto.",
    ],
  },
  {
    id: "cobranza",
    tab: "cartera",
    titulo: "Cobranza: pagos vencidos y por cobrar",
    palabras: "cobranza cobrar cobro pagado pendiente vencido pago recibo dinero riesgo domiciliado",
    pasos: [
      "En Cobranza y renovaciones, pestaña Cobranza, ves cuánto está vencido, por cobrar en 30 días y cobrado este mes.",
      "Toca Cobrado cuando el cliente pague (puedes Deshacer).",
      "Con WhatsApp o Llamar le recuerdas el pago con un mensaje ya escrito.",
      "Los pagos se calculan de la fecha de pago, prima y pago fraccionado de cada póliza.",
    ],
  },
  {
    id: "renovaciones",
    tab: "cartera",
    titulo: "Renovaciones: 15, 30, 60 y 90 días",
    palabras: "renovacion renovaciones renovar vence vencimiento vencidas embudo estatus contactado cotizado renovado",
    pasos: [
      "En la pestaña Renovaciones las pólizas se ordenan por cuántos días faltan para vencer.",
      "Cambia el estatus: Por contactar, Contactado, Cotizado, Renovado o No renueva.",
      "Al marcar Renovado, el CRM puede mover la póliza al siguiente año automáticamente.",
      "Necesitas fecha de renovación o fin de vigencia en la póliza.",
    ],
  },
  {
    id: "venta-cruzada",
    tab: "cartera",
    titulo: "Venta cruzada: qué ofrecerle a mis clientes",
    palabras: "venta cruzada ofrecer cruzar oportunidad vida gmm ppr hogar cliente falta complementaria",
    pasos: [
      "En la pestaña Venta cruzada ves clientes a los que les falta una protección (por ejemplo, tiene Auto pero no Vida).",
      "Toca WhatsApp para enviar un mensaje sugerido, luego marca Ya ofrecí o No aplica.",
    ],
  },
  {
    id: "recordatorios",
    tab: "recordatorios",
    titulo: "Recordatorios de pagos, renovaciones y cumpleaños",
    palabras: "recordatorio recordatorios pago pagos renovacion renovaciones cumpleanos whatsapp mensaje avisos",
    pasos: [
      "Entra a Recordatorios: están agrupados por pagos, renovaciones y cumpleaños.",
      "Cada uno trae un mensaje de WhatsApp listo que puedes editar antes de enviar.",
      "Si la póliza es de pago fraccionado, el aviso se repite según la periodicidad y muestra el monto de cada pago.",
    ],
  },
  {
    id: "campanita",
    tab: "recordatorios",
    titulo: "Campanita y notificaciones push",
    palabras: "campanita notificaciones notificacion push avisos activar alerta",
    pasos: [
      "La campanita (arriba) muestra los avisos del día. Al abrir uno, desaparece.",
      "Dentro de la campanita hay un botón para activar las notificaciones push en tu dispositivo.",
      "Recibes el resumen de pagos, renovaciones y cumpleaños a las 8 AM, y los seguimientos y actividades 15 minutos antes.",
    ],
  },
  {
    id: "planificador",
    tab: "planificador",
    titulo: "Planificador y calendario",
    palabras: "planificador calendario actividad actividades agenda semana mes cita reunion llamada semaforo google",
    pasos: [
      "En Planificador ves tu calendario en vista Mes o Semana.",
      "Toca una fecha para agregar una actividad (llamada, cita, reunión, mensaje).",
      "El semáforo clasifica: verde = venta, amarillo = te acerca a vender, rojo = administrativa.",
      "Las actividades generan campanita y notificación push.",
    ],
  },
  {
    id: "dashboard",
    tab: "dashboard",
    titulo: "Qué muestra el Dashboard",
    palabras: "dashboard inicio panel para hoy proximos 7 dias comisiones cartera ramo",
    pasos: [
      "Para hoy: lo que tienes pendiente. Al tocar un prospecto ves su historial y el botón Siguiente acción.",
      "Próximos 7 días: tus siguientes citas y seguimientos.",
      "También ves comisiones del mes y tu cartera por ramo y por aseguradora.",
    ],
  },
  {
    id: "meta",
    tab: "actividad",
    titulo: "Mi meta y actividad",
    palabras: "meta actividad objetivo economica avance prospeccion llamadas citas ventas tiempo",
    pasos: [
      "En Mi meta y actividad fijas tu meta económica.",
      "Registra tu actividad diaria (prospección, llamadas, citas, ventas).",
      "Ves tu avance real hacia la meta y en qué inviertes más tiempo.",
    ],
  },
  {
    id: "comisiones",
    tab: "comisiones",
    titulo: "Comisiones y metas mensuales",
    palabras: "comisiones comision porcentaje meta mensual semaforo ramo prima neta ppr",
    pasos: [
      "En Comisiones ves lo que generas por ramo, calculado sobre la prima anual.",
      "El semáforo muestra dónde se concentra tu venta.",
      "Captura tu meta mensual (número de pólizas y prima neta) por ramo.",
    ],
  },
  {
    id: "factura",
    tab: "factura",
    titulo: "Calculadora de factura (RESICO)",
    palabras: "factura calculadora resico iva retencion isr subtotal total",
    pasos: [
      "Abre Calculadora de factura.",
      "Escribe el total que vas a cobrar.",
      "Obtienes subtotal, IVA 16%, retención de IVA 10.6667% y retención de ISR 1.25%.",
    ],
  },
  {
    id: "deducible",
    tab: "deducible",
    titulo: "Deducible y coaseguro (GMM)",
    palabras: "deducible coaseguro gmm gastos medicos calculo tope siniestro hospital",
    pasos: [
      "Abre Deducible y coaseguro.",
      "Puedes calcular de forma manual o ligar el cálculo a un cliente en especial.",
    ],
  },
  {
    id: "siniestro-cliente",
    tab: "clientes",
    titulo: "Dar seguimiento a un siniestro de un cliente",
    palabras: "siniestro siniestros seguimiento reclamo choque robo estatus historial reportado pagado rechazado cliente",
    pasos: [
      "Abre al cliente y entra a su pestaña Siniestros.",
      "Toca Registrar siniestro: fecha (dd/mm/aaaa), póliza, tipo y, si lo tienes, número de reporte y monto reclamado.",
      "Cambia el estatus (Reportado, En proceso, Documentos pendientes, Pagado, Rechazado, Cerrado) y agrega notas: todo queda en el historial.",
      "Los teléfonos para reportar por aseguradora están en la pestaña Siniestros del menú.",
    ],
  },
  {
    id: "siniestros",
    tab: "siniestros",
    titulo: "Siniestros: teléfonos e instrucciones por aseguradora",
    palabras: "siniestro siniestros reporte telefono instrucciones aseguradora portal clientes accidente",
    pasos: [
      "En Siniestros cargas por aseguradora los teléfonos, instrucciones y archivos para reportar.",
      "Esa información se muestra a tus clientes en el portal.",
    ],
  },
  {
    id: "portal",
    tab: "dashboard",
    titulo: "Portal de clientes",
    palabras: "portal clientes enlace activar contrasena biometria face id huella compartir",
    pasos: [
      "En el Dashboard está la tarjeta del portal con tu enlace para compartir.",
      "Con \"Enviar a un cliente\" generas el enlace de activación para que cree su contraseña.",
      "Después puede entrar con Face ID o huella si lo activa.",
    ],
  },
  {
    id: "diagnostico",
    tab: "diagnostico",
    titulo: "Diagnóstico patrimonial",
    palabras: "diagnostico patrimonial entrevista propuesta presentacion pdf vida gmm ppr sobre mi qr",
    pasos: [
      "Abre Diagnóstico patrimonial y realiza la entrevista con el prospecto.",
      "Se genera el entregable visual con gráficas, tu logo y QR; puedes descargar el PDF desde el CRM.",
      "Con Mis datos de asesor y Editar última hoja personalizas tu foto, Sobre mí, QR y datos de contacto.",
    ],
  },
  {
    id: "multicotizador",
    tab: "multicotizador",
    titulo: "Multicotizador y Comparativo",
    palabras: "multicotizador cotizador cotizar comparativo comparar polizas pdf privados gnp axa qualitas",
    pasos: [
      "Multicotizador reúne los accesos a los portales de cada aseguradora.",
      "En la pestaña Comparativo subes hasta 4 pólizas en PDF.",
      "Se genera una tabla comparativa de precios y coberturas y puedes descargarla en PDF con tus datos arriba.",
    ],
  },
  {
    id: "condiciones",
    tab: "condiciones",
    titulo: "Condiciones generales y Material de apoyo",
    palabras: "condiciones generales material apoyo formatos publicidad compartido descargar",
    pasos: [
      "Condiciones generales y Material de apoyo son compartidos: todos los agentes agregan, ven y descargan.",
      "En Material de apoyo hay dos rubros: Formatos y Publicidad.",
    ],
  },
  {
    id: "tarjeta",
    tab: "tarjeta",
    titulo: "Tarjeta digital",
    palabras: "tarjeta digital presentacion qr foto whatsapp compartir enlace catalogo",
    pasos: [
      "Abre Tarjeta digital y captura tu foto, nombre, WhatsApp, correo, enlace web y QR.",
      "Puedes compartir el enlace web o la imagen de la tarjeta.",
    ],
  },
  {
    id: "directorios",
    tab: "directorios",
    titulo: "Directorios médicos",
    palabras: "directorio directorios medicos hospital medico gnp axa plan seguro buscador",
    pasos: [
      "En Herramientas abre Directorios médicos y elige la aseguradora (GNP, AXA, Plan Seguro).",
      "Se abre el buscador oficial de médicos y hospitales de esa aseguradora.",
    ],
  },
  {
    id: "ajustes",
    tab: null,
    titulo: "Ajustes: apariencia, correo y contraseña",
    palabras: "ajustes apariencia transparencia colores correo contrasena cambiar clave perfil nombre",
    pasos: [
      "Toca tu nombre (arriba a la derecha) para abrir Ajustes.",
      "Ahí cambias transparencia, colores, correo y lo relevante de tu cuenta.",
      "Las preferencias de apariencia se guardan en el dispositivo que estés usando.",
    ],
  },
  {
    id: "instalar",
    tab: null,
    titulo: "Instalar la app en el celular o iPad",
    palabras: "instalar app pantalla inicio icono celular ipad iphone android agregar",
    pasos: [
      "En iPhone/iPad: abre el CRM en Safari, toca Compartir y elige Agregar a pantalla de inicio.",
      "En Android: abre el CRM en Chrome, toca los tres puntos y elige Instalar app o Agregar a pantalla de inicio.",
    ],
  },
  {
    id: "menu",
    tab: null,
    titulo: "Moverme por el CRM",
    palabras: "menu lateral pestanas navegar donde encontrar tres rayitas grupos trabajo herramientas formacion",
    pasos: [
      "Abre el menú lateral con las 3 rayitas (arriba a la izquierda).",
      "Está agrupado en Trabajo, Herramientas y Formación; toca el título de un grupo para abrirlo o cerrarlo.",
      "En el celular tienes accesos rápidos abajo: Inicio, Clientes, Avisos y Prospectos.",
    ],
  },
];

// Preguntas sugeridas según la pestaña donde está el agente (ids de AYUDA_TEMAS).
export const SUGERIDOS_POR_TAB = {
  cartera: ["cobranza", "renovaciones", "venta-cruzada"],
  clientes: ["poliza-nueva", "cliente-buscar", "documentos", "importar"],
  prospectos: ["prospecto-nuevo", "prospecto-etapas", "cotizaciones", "convertir"],
  recordatorios: ["recordatorios", "campanita"],
  planificador: ["planificador", "campanita"],
  dashboard: ["dashboard", "portal"],
  actividad: ["meta"],
  comisiones: ["comisiones"],
  factura: ["factura"],
  deducible: ["deducible"],
  siniestros: ["siniestros", "portal"],
  diagnostico: ["diagnostico"],
  multicotizador: ["multicotizador"],
  condiciones: ["condiciones"],
  material: ["condiciones"],
  tarjeta: ["tarjeta"],
};

export const SUGERIDOS_GENERALES = ["menu", "cliente-nuevo", "prospecto-nuevo", "recordatorios", "instalar"];

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

const PALABRAS_VACIAS = new Set([
  "como", "que", "para", "por", "una", "uno", "unos", "unas", "los", "las", "del", "con", "mis", "mi", "el", "la", "en", "de",
  "y", "a", "al", "se", "es", "lo", "puedo", "quiero", "hacer", "donde", "cuando", "esta", "este", "hola", "ayuda", "necesito",
]);

// Devuelve los temas más relacionados con el texto escrito (hasta 3), ordenados por relevancia.
export function buscarAyuda(texto, temasVisibles) {
  const tokens = norm(texto).split(/\s+/).filter((t) => t.length > 1 && !PALABRAS_VACIAS.has(t));
  if (!tokens.length) return [];
  const puntuados = temasVisibles.map((t) => {
    const titulo = norm(t.titulo);
    const claves = norm(t.palabras).split(/\s+/);
    const cuerpo = norm(t.pasos.join(" "));
    let puntos = 0;
    for (const tk of tokens) {
      const raiz = tk.length > 4 ? tk.slice(0, -1) : tk;
      if (claves.some((c) => c === tk)) puntos += 4;
      else if (claves.some((c) => c.startsWith(raiz) || (raiz.length > 3 && tk.startsWith(c) && c.length > 3))) puntos += 3;
      if (titulo.includes(raiz)) puntos += 3;
      if (cuerpo.includes(raiz)) puntos += 1;
    }
    return { t, puntos };
  });
  return puntuados.filter((x) => x.puntos >= 3).sort((a, b) => b.puntos - a.puntos).slice(0, 3).map((x) => x.t);
}
