// ============================================================
//  LexFive - Arancel Mínimo de Honorarios Profesionales
//  Basado en la Resolución Ministerial Nº 210/2025
// ============================================================

export const ARANCELES = {
  // Ejemplos de departamentos, el usuario o el sistema puede seleccionar por defecto
  departamentos: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando'],
  
  // Categorías principales y sus procesos correspondientes
  categorias: {
    'Materia Civil y Comercial': [
      { id: 'civ_1', proceso: 'Procesos Ordinarios (Cuantía Inestimable)', costo_bs: 6000 },
      { id: 'civ_2', proceso: 'Procesos Ordinarios (Con Cuantía)', costo_bs: '10% sobre la cuantía' },
      { id: 'civ_3', proceso: 'Procesos Extraordinarios (Desalojo, Interdictos)', costo_bs: 4500 },
      { id: 'civ_4', proceso: 'Procesos de Ejecución / Ejecutivos', costo_bs: 4000 },
      { id: 'civ_5', proceso: 'Procesos Voluntarios (Declaratoria de Herederos, etc)', costo_bs: 3000 },
      { id: 'civ_6', proceso: 'Redacción de Contratos (Simples)', costo_bs: 500 },
      { id: 'civ_7', proceso: 'Redacción de Contratos (Complejos)', costo_bs: 1500 }
    ],
    'Materia Familiar': [
      { id: 'fam_1', proceso: 'Asistencia Familiar (Fijación, Incremento, Cesación)', costo_bs: 2500 },
      { id: 'fam_2', proceso: 'Divorcio de Mutuo Acuerdo', costo_bs: 3500 },
      { id: 'fam_3', proceso: 'Divorcio Contencioso', costo_bs: 6000 },
      { id: 'fam_4', proceso: 'Guarda, Tutela y Régimen de Visitas', costo_bs: 3000 },
      { id: 'fam_5', proceso: 'Reconocimiento de Unión Libre', costo_bs: 4000 }
    ],
    'Materia Penal': [
      { id: 'pen_1', proceso: 'Etapa Preliminar / Querella', costo_bs: 4000 },
      { id: 'pen_2', proceso: 'Etapa Preparatoria (hasta Acusación)', costo_bs: 6000 },
      { id: 'pen_3', proceso: 'Juicio Oral', costo_bs: 10000 },
      { id: 'pen_4', proceso: 'Asistencia a Declaración (Sindicado/Víctima)', costo_bs: 1000 },
      { id: 'pen_5', proceso: 'Incidentes y Excepciones', costo_bs: 2500 }
    ],
    'Materia Laboral': [
      { id: 'lab_1', proceso: 'Beneficios Sociales (Acuerdo Conciliatorio)', costo_bs: '10% del monto recuperado' },
      { id: 'lab_2', proceso: 'Proceso Laboral por Beneficios (Contencioso)', costo_bs: '15% del monto recuperado' },
      { id: 'lab_3', proceso: 'Reincorporación Laboral', costo_bs: 4000 }
    ],
    'Consultas y Otros': [
      { id: 'con_1', proceso: 'Consulta Verbal Simple en Oficina', costo_bs: 200 },
      { id: 'con_2', proceso: 'Consulta Escrita / Informe Legal', costo_bs: 1000 },
      { id: 'con_3', proceso: 'Asistencia a Audiencia de Conciliación', costo_bs: 1500 }
    ]
  }
};

/**
 * Busca un arancel por ID
 */
export function getArancelById(id) {
  for (const [categoria, procesos] of Object.entries(ARANCELES.categorias)) {
    const proceso = procesos.find(p => p.id === id);
    if (proceso) {
      return { categoria, ...proceso };
    }
  }
  return null;
}

/**
 * Retorna todos los procesos en un arreglo plano para facilitar la búsqueda.
 */
export function getAllAranceles() {
  const all = [];
  for (const [categoria, procesos] of Object.entries(ARANCELES.categorias)) {
    for (const p of procesos) {
      all.push({ categoria, ...p });
    }
  }
  return all;
}
