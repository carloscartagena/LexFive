const fs = require('fs');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

const clientes = [
  { nombre: "Empresa Constructora El Cóndor S.A.", doc: "NIT 345678029", tel: "77711223", email: "legal@condorsa.com.bo", dir: "Av. Blanco Galindo Km 4, Cochabamba" },
  { nombre: "María Isabel Rojas Zenteno", doc: "5544332 CB", tel: "69988776", email: "maria.rojas@gmail.com", dir: "Calle Ecuador #443, Cochabamba" },
  { nombre: "Juan Pérez Montaño", doc: "2233445 LP", tel: "71544332", email: "juan.perez@hotmail.com", dir: "Av. Busch #120, La Paz" },
  { nombre: "Sindicato de Transportistas 14 de Septiembre", doc: "NIT 102938475", tel: "79332211", email: "contacto@sindicato14.org", dir: "Av. Aroma esq. San Martín, Cochabamba" },
  { nombre: "Inmobiliaria Los Pinos SRL", doc: "NIT 887766554", tel: "67812345", email: "gerencia@lospinos.com.bo", dir: "Equipetrol Calle 5, Santa Cruz" },
  { nombre: "Banco Mercantil del Sur (BMS)", doc: "NIT 112233445", tel: "70011223", email: "legales@bms.com.bo", dir: "Plaza 14 de Septiembre, Cochabamba" },
  { nombre: "Ana López Torrez", doc: "4455667 SC", tel: "76655443", email: "alopez.torrez@yahoo.com", dir: "Av. Banzer 3er Anillo, Santa Cruz" },
  { nombre: "Carlos Eduardo Salvatierra", doc: "8899001 BN", tel: "72112233", email: "csalvatierra@gmail.com", dir: "Calle Sucre #22, Beni" },
  { nombre: "Asociación de Productores de Quinua", doc: "NIT 998877665", tel: "69887766", email: "productores.q@gmail.com", dir: "Oruro, Zona Norte" },
  { nombre: "Ferretería Industrial La Tuerca", doc: "NIT 554433221", tel: "78912345", email: "ventas@latuerca.com.bo", dir: "Calle Uruguay #112, Santa Cruz" }
].map(c => ({ id: uuid(), ...c }));

const materias = ['Civil', 'Penal', 'Laboral', 'Familia', 'Administrativo', 'Comercial'];
const estados = ['en_tramite', 'con_resolucion', 'suspendido', 'archivado', 'concluido'];

const procesos = [];
for (let i = 1; i <= 20; i++) {
  const cliente = clientes[Math.floor(Math.random() * clientes.length)];
  const materia = materias[Math.floor(Math.random() * materias.length)];
  const estado = estados[Math.floor(Math.random() * estados.length)];
  
  let caratula = "";
  let juzgado = "";
  let descripcion = "";
  
  if (materia === 'Civil') {
    caratula = `${cliente.nombre.split(' ')[0]} c/ Terceros - Acción Civil`;
    juzgado = `Juzgado Público Civil Nro ${Math.floor(Math.random() * 10) + 1}`;
    descripcion = "Demanda civil ordinaria por incumplimiento de obligaciones y resarcimiento de daños.";
  } else if (materia === 'Penal') {
    caratula = `Ministerio Público c/ ${cliente.nombre.split(' ')[0]} - Estafa`;
    juzgado = `Juzgado de Instrucción Penal Nro ${Math.floor(Math.random() * 10) + 1}`;
    descripcion = "Proceso penal por supuesta comisión del delito de estafa agravada.";
  } else if (materia === 'Laboral') {
    caratula = `${cliente.nombre.split(' ')[0]} c/ Empleador - Beneficios Sociales`;
    juzgado = `Juzgado de Trabajo Nro ${Math.floor(Math.random() * 5) + 1}`;
    descripcion = "Demanda por pago de desahucio e indemnización tras despido injustificado.";
  } else if (materia === 'Familia') {
    caratula = `${cliente.nombre.split(' ')[0]} c/ Cónyuge - Divorcio`;
    juzgado = `Juzgado Público de Familia Nro ${Math.floor(Math.random() * 8) + 1}`;
    descripcion = "Demanda de divorcio y división de bienes gananciales.";
  } else {
    caratula = `${cliente.nombre.split(' ')[0]} - Trámite ${materia}`;
    juzgado = `Tribunal Departamental de Justicia`;
    descripcion = `Trámite de naturaleza ${materia} ante instancias competentes.`;
  }
  
  procesos.push({
    id: uuid(),
    caratula,
    numero: `NUREJ-${Math.floor(Math.random() * 9000000) + 1000000}`,
    materia,
    juzgado,
    cliente_id: cliente.id,
    estado,
    fecha_inicio: `202${Math.floor(Math.random() * 3) + 3}-0${Math.floor(Math.random() * 9) + 1}-1${Math.floor(Math.random() * 9)}`,
    descripcion
  });
}

const actuaciones = [];
const tipos_actuaciones = ['notificacion', 'memorial', 'resolucion', 'audiencia', 'oficio'];
const textos_largos = [
  `Por recibido el memorial que antecede. Se tiene presente la prueba documental adjunta. Trasládese a la parte contraria para que responda en el plazo improrrogable de 5 días hábiles, bajo apercibimiento de proseguir el trámite en su rebeldía. Notifíquese mediante cédula.`,
  `En audiencia pública, el Juez dispuso la apertura de término probatorio por 10 días calendario. Las partes quedan debidamente notificadas en sala. Así mismo se señala fecha de audiencia de inspección para el día 15 del mes en curso a horas 10:00 am.`,
  `Sentencia Constitucional: Se REVOCA la resolución del tribunal inferior y se declara PROBADA la acción. Se ordena el cese inmediato de la vulneración de derechos, otorgando a la entidad demandada el plazo de 48 horas para cumplir con el presente fallo constitucional.`,
  `El oficial de diligencias representa que no pudo citar a la parte demandada por no encontrarla en su domicilio. La parte actora solicita se proceda con la notificación por edicto de prensa, a lo que el juez provee: Cítese y emplácese por edicto, otorgando un plazo de 30 días para su comparecencia.`,
  `Se rechaza el recurso de reposición planteado por carecer de asidero legal. Manténgase firme el auto recurrido. Se otorga a la parte un plazo perentorio de 3 días para presentar recurso de apelación, si así conviene a sus intereses.`
];

for (const p of procesos) {
  const num_actuaciones = Math.floor(Math.random() * 4) + 2; // 2 to 5 actuaciones per process
  for (let i = 0; i < num_actuaciones; i++) {
    actuaciones.push({
      proceso_id: p.id,
      fecha: `2025-0${Math.floor(Math.random() * 8) + 1}-1${Math.floor(Math.random() * 9)}`,
      tipo: tipos_actuaciones[Math.floor(Math.random() * tipos_actuaciones.length)],
      descripcion: textos_largos[Math.floor(Math.random() * textos_largos.length)]
    });
  }
}

let sql = `DO $$
DECLARE
  v_abogado uuid;
  v_procurador uuid;
BEGIN
  -- 1. Obtener IDs de abogado y procurador
  SELECT id INTO v_abogado FROM public.profiles WHERE rol IN ('abogado', 'admin') LIMIT 1;
  SELECT id INTO v_procurador FROM public.profiles WHERE rol IN ('procurador', 'abogado', 'admin') LIMIT 1;

  -- 2. Clientes
  INSERT INTO public.clientes (id, nombre, documento, telefono, email, direccion) VALUES
`;

sql += clientes.map(c => `  ('${c.id}', '${c.nombre}', '${c.doc}', '${c.tel}', '${c.email}', '${c.dir}')`).join(',\n') + ';\n\n';

sql += `  -- 3. Procesos
  INSERT INTO public.procesos (id, caratula, numero, materia, juzgado, cliente_id, abogado_id, procurador_id, estado, fecha_inicio, descripcion) VALUES
`;
sql += procesos.map(p => `  ('${p.id}', '${p.caratula}', '${p.numero}', '${p.materia}', '${p.juzgado}', '${p.cliente_id}', v_abogado, v_procurador, '${p.estado}', '${p.fecha_inicio}', '${p.descripcion}')`).join(',\n') + ';\n\n';

sql += `  -- 4. Actuaciones
  INSERT INTO public.actuaciones (proceso_id, fecha, tipo, descripcion, created_by) VALUES
`;
sql += actuaciones.map(a => `  ('${a.proceso_id}', '${a.fecha}', '${a.tipo}', '${a.descripcion}', v_abogado)`).join(',\n') + ';\n\n';

sql += `END $$;`;

fs.writeFileSync('db/seed_masivo.sql', sql);
console.log('SQL generated.');
