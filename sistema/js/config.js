// ============================================================
//  Configuración de conexión con Supabase
//  (Estos dos valores son PÚBLICOS y seguros para el navegador.
//   La seguridad real la imponen las reglas RLS de la base de datos.)
// ============================================================
export const SUPABASE_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';

// Etiquetas legibles para roles, estados y materias
export const ROLES = {
  admin:      'Administrador',
  procurador: 'Procurador',
  abogado:    'Abogado',
  cliente:    'Cliente'
};

// Número de WhatsApp del bufete (para consultas y recordatorios)
export const WHATSAPP = '59178360469';

// Los 5 abogados del bufete (para recordatorios por WhatsApp a todos)
export const ABOGADOS = [
  { nombre: 'Abg. Carlos Cartagena', wa: '59178360469' },
  { nombre: 'Abg. Jose Corwin',      wa: '59169915219' },
  { nombre: 'Abg. Jose Antonio',     wa: '59175216613' },
  { nombre: 'Abg. Douglas Yamil',    wa: '59168173978' },
  { nombre: 'Abg. Henry Iván',       wa: '59179145231' }
];

export const ESTADOS = {
  en_tramite: 'En trámite',
  con_resolucion: 'Con resolución',
  suspendido: 'Suspendido',
  archivado: 'Archivado',
  concluido: 'Concluido'
};

export const MATERIAS = [
  'Laboral', 'Civil', 'Penal', 'Familia',
  'Informático', 'Minero', 'Agrario', 'Deportivo', 'Otro'
];
