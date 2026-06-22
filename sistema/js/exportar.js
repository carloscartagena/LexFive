// ============================================================
//  LexFive — Exportación y formato (descargas, calendario .ics,
//  CSV, dinero). Funciones autocontenidas, sin estado del panel.
//  Se separan de app.js para aligerarlo.
// ============================================================

// Descarga un contenido como archivo (sin servidor).
export function descargarArchivo(nombre, contenido, mime = 'text/plain;charset=utf-8') {
  const blob = (contenido instanceof Blob) ? contenido : new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Devuelve la fuente de una imagen de galería: la URL de Storage (nuevo) o el
// data URL antiguo en base64 (compatibilidad). Así conviven los dos formatos.
export function srcDe(item) { return (item && (item.url || item.img)) || ''; }

export function pad2(n) { return String(n).padStart(2, '0'); }

// Convierte una fecha a formato UTC para iCalendar (AAAAMMDDTHHMMSSZ).
export function icsFecha(d) {
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
    'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}

export function icsEscape(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Genera el contenido .ics de la audiencia/plazo de un proceso (1 hora de duración).
export function buildICS(proc) {
  if (!proc.proxima_audiencia) return null;
  const inicio = new Date(proc.proxima_audiencia);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const resumen = 'Audiencia: ' + (proc.caratula || 'Proceso');
  const partes = [];
  if (proc.numero) partes.push('Nº ' + proc.numero);
  if (proc.juzgado) partes.push(proc.juzgado);
  if (proc.materia) partes.push(proc.materia);
  const desc = partes.join(' · ');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema de Gestion//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:lexfive-' + proc.id + '@lexfive',
    'DTSTAMP:' + icsFecha(new Date()),
    'DTSTART:' + icsFecha(inicio),
    'DTEND:' + icsFecha(fin),
    'SUMMARY:' + icsEscape(resumen),
    'DESCRIPTION:' + icsEscape(desc),
    proc.juzgado ? 'LOCATION:' + icsEscape(proc.juzgado) : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(resumen), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

// Genera un enlace para agregar el evento a Google Calendar en UN CLIC
// (abre el formulario de nuevo evento ya pre-rellenado). Dura 1 hora.
export function googleCalURL(inicio, resumen, detalles, lugar) {
  if (!inicio || isNaN(inicio)) return '';
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const fechas = icsFecha(inicio) + '/' + icsFecha(fin); // formato UTC AAAAMMDDTHHMMSSZ
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(resumen || 'Evento')
    + '&dates=' + fechas
    + '&details=' + encodeURIComponent(detalles || '')
    + (lugar ? '&location=' + encodeURIComponent(lugar) : '');
}

// Suma "n" días HÁBILES a una fecha (omite sábados y domingos).
// Nota: no contempla feriados (varían por año y por departamento).
export function sumarDiasHabiles(fechaBase, n) {
  const d = new Date(fechaBase);
  if (isNaN(d)) return null;
  let restantes = Math.max(0, parseInt(n, 10) || 0);
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

// Formato de dinero (Bolivianos por defecto).
export function fmtMoneda(monto, moneda = 'Bs') {
  const n = Number(monto || 0);
  return (moneda || 'Bs') + ' ' + n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convierte filas de clientes a CSV (compatible con Excel).
export function clientesToCSV(rows) {
  const cab = ['Nombre', 'Documento', 'Teléfono', 'Correo', 'Dirección', 'Notas'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  rows.forEach(c => lineas.push([c.nombre, c.documento, c.telefono, c.email, c.direccion, c.notas].map(celda).join(';')));
  return '\ufeff' + lineas.join('\r\n');
}

// Convierte filas de honorarios + pagos a CSV.
export function honorariosToCSV(honorarios, pagos) {
  const cab = ['Tipo', 'Proceso', 'Cliente', 'Monto', 'Fecha', 'Descripción'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  (honorarios || []).forEach(h => lineas.push(['Honorario', h.proceso || '', h.cliente || '', h.monto, h.fecha || '', h.descripcion || ''].map(celda).join(';')));
  (pagos || []).forEach(p => lineas.push(['Pago', p.proceso || '', p.cliente || '', p.monto, p.fecha || '', p.descripcion || ''].map(celda).join(';')));
  return '\ufeff' + lineas.join('\r\n');
}

// Convierte un monto a su importe en letras para los recibos.
// Ej: 1500.50 -> "MIL QUINIENTOS 50/100 BOLIVIANOS".
export function montoEnLetras(monto, moneda) {
  const NUM = Number(monto || 0);
  const entero = Math.floor(Math.abs(NUM));
  const centavos = Math.round((Math.abs(NUM) - entero) * 100);
  const UNI = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const tresCifras = (n) => {
    if (n === 100) return 'CIEN';
    let txt = '';
    const c = Math.floor(n / 100), resto = n % 100;
    if (c) txt += CEN[c] + ' ';
    if (resto <= 29) txt += UNI[resto];
    else { const d = Math.floor(resto / 10), u = resto % 10; txt += DEC[d] + (u ? ' Y ' + UNI[u] : ''); }
    return txt.trim();
  };
  const enteroALetras = (n) => {
    if (n === 0) return 'CERO';
    let txt = '';
    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;
    if (millones) txt += (millones === 1 ? 'UN MILLÓN' : tresCifras(millones) + ' MILLONES') + ' ';
    if (miles) txt += (miles === 1 ? 'MIL' : tresCifras(miles) + ' MIL') + ' ';
    if (resto) txt += tresCifras(resto);
    return txt.trim();
  };
  const m = (moneda || 'Bs').toUpperCase();
  const esDolar = m.includes('USD') || m.includes('$');
  const nombre = esDolar
    ? (entero === 1 ? 'DÓLAR AMERICANO' : 'DÓLARES AMERICANOS')
    : (entero === 1 ? 'BOLIVIANO' : 'BOLIVIANOS');
  return `${enteroALetras(entero)} ${String(centavos).padStart(2, '0')}/100 ${nombre}`;
}
