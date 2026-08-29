-- ============================================================
--  Script de Prueba: 5 Clientes, 10 Procesos y Actuaciones
--  (Para probar la extracción de plazos y resúmenes con Inteligencia Artificial)
-- ============================================================

DO $$
DECLARE
  v_abogado uuid;
  v_procurador uuid;
  
  -- IDs para Clientes
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();
  
  -- IDs para Procesos
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();
  p8 uuid := gen_random_uuid();
  p9 uuid := gen_random_uuid();
  p10 uuid := gen_random_uuid();

BEGIN
  -- 1. Buscamos al menos 1 abogado existente para asignarle los procesos.
  SELECT id INTO v_abogado FROM public.profiles WHERE rol IN ('abogado', 'admin') LIMIT 1;
  SELECT id INTO v_procurador FROM public.profiles WHERE rol IN ('procurador', 'abogado', 'admin') LIMIT 1;

  -- 2. Insertar Clientes de prueba
  INSERT INTO public.clientes (id, nombre, documento, telefono, email, direccion) VALUES
  (c1, 'Carlos Mendoza', '4567891 LP', '77712345', 'carlos.mendoza@test.lexfive.app', 'Av. 16 de Julio Nro 123, La Paz'),
  (c2, 'Empresa Inversiones Sur SRL', 'NIT 102938475', '69923456', 'gerencia@inversur.test.com', 'Calle Sucre Nro 45, Santa Cruz'),
  (c3, 'Valeria Torrez', '8876543 SC', '75234567', 'valeria.torrez@test.lexfive.app', 'Av. Banzer 4to Anillo'),
  (c4, 'Sindicato de Transportes El Sol', 'NIT 899234001', '79111222', 'sindicato.sol@test.lexfive.app', 'Zona El Tejar, Cochabamba'),
  (c5, 'Roberto Fernández', '9988776 CB', '68199888', 'roberto.f@test.lexfive.app', 'Calle Uruguay, Edif. Torre');

  -- 3. Insertar Procesos
  INSERT INTO public.procesos (id, caratula, numero, materia, juzgado, cliente_id, abogado_id, procurador_id, estado, fecha_inicio, descripcion) VALUES
  (p1, 'Mendoza c/ Banco Nacional - Demanda Ordinaria', 'NUREJ-1029384', 'Civil', 'Juzgado 1ro Público Civil', c1, v_abogado, v_procurador, 'en_tramite', '2025-02-10', 'Demanda por incumplimiento de contrato hipotecario.'),
  (p2, 'Divorcio Mendoza', 'NUREJ-8822334', 'Familia', 'Juzgado 3ro de Familia', c1, v_abogado, v_procurador, 'en_tramite', '2025-05-15', 'Divorcio de mutuo acuerdo con división de bienes.'),
  (p3, 'Inversiones Sur c/ Gobierno Municipal', 'NUREJ-5566778', 'Administrativo', 'Tribunal Contencioso Administrativo', c2, v_abogado, v_procurador, 'en_tramite', '2025-08-01', 'Amparo constitucional por clausura indebida de local.'),
  (p4, 'Cobro Coactivo a Proveedores', 'NUREJ-9900112', 'Civil', 'Juzgado 2do Civil', c2, v_abogado, v_procurador, 'con_resolucion', '2024-11-10', 'Demanda de pago de facturas devengadas.'),
  (p5, 'Torrez c/ Pérez - Asistencia Familiar', 'NUREJ-3344556', 'Familia', 'Juzgado 5to de Familia', c3, v_abogado, v_procurador, 'en_tramite', '2026-01-20', 'Fijación de asistencia familiar.'),
  (p6, 'Torrez - Sucesión Intestada', 'NUREJ-1122334', 'Civil', 'Juzgado 6to Civil', c3, v_abogado, v_procurador, 'concluido', '2023-04-10', 'Declaratoria de herederos por fallecimiento de progenitor.'),
  (p7, 'Ministerio Público c/ Choferes Sindicato El Sol', 'NUREJ-7788990', 'Penal', 'Juzgado 1ro de Instrucción Penal', c4, v_abogado, v_procurador, 'en_tramite', '2026-03-05', 'Proceso penal por accidente de tránsito en carretera.'),
  (p8, 'Sindicato El Sol c/ Seguros ABC', 'NUREJ-2233445', 'Civil', 'Juzgado 4to Público Civil', c4, v_abogado, v_procurador, 'en_tramite', '2026-06-12', 'Cobro de póliza de seguro de automotores.'),
  (p9, 'Fernández c/ Constructora ANDES - Demanda Laboral', 'NUREJ-6655443', 'Laboral', 'Juzgado 2do de Trabajo', c5, v_abogado, v_procurador, 'en_tramite', '2025-10-30', 'Pago de beneficios sociales y sueldos devengados.'),
  (p10, 'Fernández - Reivindicación de Terreno', 'NUREJ-8899001', 'Civil', 'Juzgado 7mo Civil', c5, v_abogado, v_procurador, 'suspendido', '2024-02-14', 'Demanda de reivindicación de lote avasallado.');

  -- 4. Insertar Actuaciones (Con textos legales largos para la IA)
  INSERT INTO public.actuaciones (proceso_id, fecha, tipo, descripcion, created_by) VALUES
  
  -- P1: Textos largos para extraer plazos y resumir
  (p1, '2026-08-01', 'notificacion', 'El Oficial de Diligencias procedió a notificar a la parte demandada con la demanda y el auto admisorio de fecha 28 de julio de 2026. Según el artículo 125 del Código Procesal Civil, la parte demandada tiene un plazo improrrogable de treinta (30) días calendario contados a partir del día siguiente hábil de su legal notificación para contestar la demanda, reconvenir y plantear excepciones. Queda estrictamente establecido que el plazo vencerá el día 1 de septiembre de 2026 a horas 18:30 pm. En caso de no contestar, se declarará la rebeldía procesal.', v_abogado),
  (p1, '2026-08-15', 'memorial', 'Se presentó memorial solicitando la anotación preventiva de los bienes inmuebles de la parte demandada, argumentando peligro de insolvencia, adjuntando certificado de Derechos Reales actualizado a la fecha.', v_procurador),
  
  -- P3: Texto con fechas de audiencia
  (p3, '2026-08-20', 'resolucion', 'VISTOS: Habiéndose cumplido con la presentación de las pruebas de cargo y descargo correspondientes, y en estricta aplicación del principio de celeridad procesal, el Juez Contencioso Administrativo dispone SEÑALAR fecha de Audiencia de Inspección De Visu, misma que se llevará a cabo el día viernes 18 de septiembre de 2026 a horas 09:30 am en las instalaciones de la propiedad ubicada en el 4to anillo. Las partes deberán asistir acompañadas de sus peritos si corresponde. Quedan legalmente notificadas las partes con la lectura del presente auto.', v_abogado),
  
  -- P7: Jerga penal y plazos
  (p7, '2026-08-25', 'resolucion', 'AUTO INTERLOCUTORIO. Concediendo la cesación a la detención preventiva del imputado. Se impone fianza económica de Bs. 15,000 (Quince mil 00/100 Bolivianos), que deberá ser empozada en el plazo de 72 horas. Asimismo, el imputado deberá presentarse ante el Ministerio Público el primer día hábil de cada mes. Se convoca a Audiencia de Medidas Sustitutivas para revisión el día 10 de octubre de 2026 a las 14:00 horas en la sala 3 del juzgado.', v_abogado),
  
  -- P9: Demanda laboral (Resumen de texto largo)
  (p9, '2026-08-05', 'resolucion', 'El Juez del Trabajo y Seguridad Social emite SENTENCIA de primera instancia. FALLA declarando PROBADA EN PARTE la demanda principal instaurada por el Sr. Roberto Fernández contra la Constructora ANDES. Ordena el pago de desahucio, indemnización por tiempo de servicios de 5 años y 3 meses, aguinaldo duodécimo, vacación no gozada, sumando un total líquido pagable de Bs. 45,670 (Cuarenta y cinco mil seiscientos setenta Bolivianos). Se concede a la parte perdidosa el plazo de 3 días para plantear recurso de apelación de acuerdo a ley. Si no hay apelación, la sentencia quedará ejecutoriada.', v_abogado);

  -- 5. Insertar Honorarios y Pagos (Para probar el Estado de Cuenta PDF)
  INSERT INTO public.honorarios (proceso_id, concepto, monto, moneda) VALUES
  (p1, 'Honorarios profesionales pactados por demanda civil', 15000, 'Bs'),
  (p3, 'Patrocinio en Amparo Constitucional', 3000, 'USD'),
  (p7, 'Asesoría en proceso penal y defensa en audiencias', 20000, 'Bs'),
  (p9, '15% de la recuperación total del proceso laboral', 6850, 'Bs');

  INSERT INTO public.pagos (proceso_id, monto, moneda, metodo, nota, fecha) VALUES
  (p1, 5000, 'Bs', 'Transferencia', 'Adelanto al inicio del proceso', '2025-02-15'),
  (p1, 2000, 'Bs', 'Efectivo', 'Segundo pago tras admisión', '2025-08-20'),
  (p3, 1000, 'USD', 'Transferencia', 'Adelanto a la firma del iguala', '2025-08-02'),
  (p7, 10000, 'Bs', 'Cheque', 'Pago del 50%', '2026-03-10');

END $$;
