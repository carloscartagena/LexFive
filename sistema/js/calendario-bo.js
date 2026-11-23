// ============================================================
//  LexFive — Calendario de Días Hábiles (Bolivia y La Paz)
//  Calcula días hábiles (lunes a viernes) descartando feriados nacionales,
//  efeméride de La Paz (16 de julio) y feriados móviles de Pascua.
//  Aplica la regla de traslado de feriado dominical a lunes (D.S. 2750).
// ============================================================

// Calcula el domingo de Pascua según el cómputo gregoriano (algoritmo anónimo Butcher/Meeus)
export function calcularPascua(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes - 1, dia);
}

// Devuelve un mapa { 'YYYY-MM-DD': 'Nombre del Feriado' } para el año indicado
export function obtenerFeriadosBolivia(year) {
  const feriados = {};

  const add = (d, nombre) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    feriados[iso] = nombre;
  };

  // Feriados fijos de Bolivia y La Paz
  const fijos = [
    { m: 1, d: 1, nombre: 'Año Nuevo' },
    { m: 1, d: 22, nombre: 'Día del Estado Plurinacional' },
    { m: 5, d: 1, nombre: 'Día del Trabajo' },
    { m: 6, d: 21, nombre: 'Año Nuevo Andino Amazónico' },
    { m: 7, d: 16, nombre: 'Efeméride Departamental de La Paz' },
    { m: 8, d: 6, nombre: 'Día de la Independencia de Bolivia' },
    { m: 11, d: 2, nombre: 'Día de Todos los Difuntos' },
    { m: 12, d: 25, nombre: 'Navidad' }
  ];

  for (const f of fijos) {
    const fecha = new Date(year, f.m - 1, f.d);
    add(fecha, f.nombre);
    // Regla D.S. 2750: si cae domingo, se traslada al lunes siguiente
    if (fecha.getDay() === 0) {
      const lunes = new Date(year, f.m - 1, f.d + 1);
      add(lunes, `${f.nombre} (Traslado D.S. 2750)`);
    }
  }

  // Feriados móviles calculados a partir de Pascua
  const pascua = calcularPascua(year);
  const sumarDias = (base, dias) => {
    const res = new Date(base.getTime());
    res.setDate(res.getDate() + dias);
    return res;
  };

  add(sumarDias(pascua, -48), 'Lunes de Carnaval');
  add(sumarDias(pascua, -47), 'Martes de Carnaval');
  add(sumarDias(pascua, -2), 'Viernes Santo');
  add(sumarDias(pascua, 60), 'Corpus Christi');

  return feriados;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Calcula las jornadas hábiles exactas de una pasantía
 * @param {string} fechaInicioISO 'YYYY-MM-DD'
 * @param {number} cantidadDias 20 (4 semanas) o 10 (2 semanas)
 * @param {string|Array} feriadosExtra Fechas 'YYYY-MM-DD' adicionales separadas por coma o array
 * @returns {{ jornadas: Array, feriadosOmitidos: Array, fechaFin: string, fechaFinLarga: string }}
 */
export function calcularJornadasHabilesBolivia(fechaInicioISO, cantidadDias = 20, feriadosExtra = '') {
  if (!fechaInicioISO) {
    return {
      jornadas: [],
      feriadosOmitidos: [],
      fechaFin: '',
      fechaFinLarga: ''
    };
  }

  const partes = fechaInicioISO.split('-');
  let cur = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const startYear = cur.getFullYear();

  // Feriados de este año y el siguiente si cruza de año
  const feriadosCache = {
    [startYear]: obtenerFeriadosBolivia(startYear),
    [startYear + 1]: obtenerFeriadosBolivia(startYear + 1)
  };

  const extras = new Set();
  if (typeof feriadosExtra === 'string') {
    feriadosExtra.split(',').map(s => s.trim()).filter(Boolean).forEach(f => extras.add(f));
  } else if (Array.isArray(feriadosExtra)) {
    feriadosExtra.forEach(f => extras.add(String(f).trim()));
  }

  const jornadas = [];
  const feriadosOmitidos = [];
  let iter = 0;

  while (jornadas.length < cantidadDias && iter < 120) {
    iter++;
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = cur.getDay(); // 0 = Domingo, 6 = Sábado

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Fin de semana
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    if (!feriadosCache[yyyy]) feriadosCache[yyyy] = obtenerFeriadosBolivia(yyyy);
    const nombreFeriado = feriadosCache[yyyy][iso] || (extras.has(iso) ? 'Feriado adicional / tolerancia' : null);

    if (nombreFeriado) {
      feriadosOmitidos.push({
        iso,
        fechaCorta: `${dd}/${mm}/${yyyy}`,
        nombre: nombreFeriado
      });
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    // Día hábil efectivo
    const semanaIdx = Math.floor(jornadas.length / 5) + 1;
    const diaSemana = DIAS_SEMANA[dayOfWeek];
    const fechaCorta = `${dd}/${mm}/${yyyy}`;
    const fechaLargaStr = `${diaSemana}, ${cur.getDate()} de ${MESES[cur.getMonth()]} de ${yyyy}`;

    jornadas.push({
      num: jornadas.length + 1,
      iso,
      fechaCorta,
      fechaLarga: fechaLargaStr,
      diaSemana,
      semanaIdx
    });

    cur.setDate(cur.getDate() + 1);
  }

  const ultimaJornada = jornadas[jornadas.length - 1];
  const fechaFin = ultimaJornada ? ultimaJornada.iso : '';
  const fechaFinLarga = ultimaJornada
    ? `${ultimaJornada.num === 1 ? '' : ''}${ultimaJornada.jornadaDate ? '' : ''}`
    : '';

  return {
    jornadas,
    feriadosOmitidos,
    fechaFin,
    fechaFinLarga: ultimaJornada ? `${partes[2]} de ${MESES[Number(partes[1]) - 1]} de ${partes[0]}` : ''
  };
}
