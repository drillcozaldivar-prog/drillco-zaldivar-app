-- ============================================================================
-- SEED DATA INICIAL PARA PRUEBAS Y ENTORNO DE DESARROLLO
-- ============================================================================

-- Roles base
INSERT INTO roles (code, name, description) VALUES
('operator', 'Operador de Perforación', 'Ingresa datos en terreno, registra mediciones y fotos.'),
('supervisor', 'Supervisor de Faena', 'Revisa, aprueba, solicita cambios y cierra procedimientos.'),
('admin', 'Administrador del Sistema', 'Administra usuarios, faenas, equipos y configuraciones.'),
('auditor', 'Auditor de Operaciones', 'Consulta historial, exporta reportes e inspecciona bitácora.');

-- Organización demo
INSERT INTO organizations (id, code, name) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ZALDIVAR_MINING', 'Compañía Minera Zaldívar S.A.');

-- Faenas demo
INSERT INTO sites (id, organization_id, code, name, location) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SITE_ZALDIVAR', 'Faena Zaldívar', 'Región de Antofagasta, Chile'),
('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SITE_CENTINELA', 'Faena Centinela', 'Región de Antofagasta, Chile');

-- Áreas
INSERT INTO areas (id, site_id, code, name) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'AREA_RIZO', 'Mina Rizo Patrón'),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'AREA_FASE5', 'Mina Principal Fase 5');

-- Modelos de Perforadoras
INSERT INTO drill_rig_models (id, manufacturer, model_name, drilling_type, max_depth_meters) VALUES
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Epiroc', 'Pit Viper 271', 'rotary', 65.00),
('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'Sandvik', 'DR412i', 'rotary', 75.00);

-- Equipos de Perforación
INSERT INTO drill_rigs (id, site_id, model_id, code, serial_number, current_horometer, status) VALUES
('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'PERF-01', 'PV271-2023-089', 4250.50, 'operational'),
('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a56', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'PERF-02', 'DR412-2024-102', 1890.00, 'operational');

-- Turnos
INSERT INTO shifts (id, site_id, code, name, start_time, end_time) VALUES
('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'DAY_SHIFT', 'Turno Día (08:00 - 20:00)', '08:00:00', '20:00:00'),
('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a67', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'NIGHT_SHIFT', 'Turno Noche (20:00 - 08:00)', '20:00:00', '08:00:00');

-- Pozos de Prueba
INSERT INTO drill_holes (id, site_id, area_id, hole_code, pattern_code, target_depth_meters, diameter_inches, status) VALUES
('g1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'PZ-1042', 'MALLA-F5-04', 16.50, 10.62, 'planned'),
('g2eebc99-9c0b-4ef8-bb6d-6bb9bd380a78', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'PZ-1043', 'MALLA-F5-04', 16.50, 10.62, 'planned');

-- Tipo de Procedimiento
INSERT INTO procedure_types (id, code, name, description) VALUES
('h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'DRILLING_CONTROL', 'Control Técnico de Perforación', 'Registro de parámetros de perforación por pozo, metros y tiempos operacionales.');

-- Plantilla y Versión de Plantilla Dinámica
INSERT INTO procedure_templates (id, organization_id, type_id, code, name, description) VALUES
('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'TMPL_DRILL_01', 'Formulario Control Técnico Perforación Rotativa', 'Plantilla oficial para registro de parámetros de perforación en terreno.');

INSERT INTO procedure_template_versions (id, template_id, version_number, schema, is_published, published_at) VALUES
('j1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 1, '{
  "title": "Control Técnico de Perforación",
  "sections": [
    {
      "id": "header",
      "title": "1. Datos Generales de Operación",
      "fields": [
        {"id": "horometer_start", "type": "number", "label": "Horómetro Inicial (hrs)", "required": true, "min": 0},
        {"id": "horometer_end", "type": "number", "label": "Horómetro Final (hrs)", "required": true, "min": 0},
        {"id": "bit_type", "type": "select", "label": "Tipo de Broca / Tricono", "required": true, "options": ["Tricono 10-5/8 IADC 637", "Tricono 10-5/8 IADC 537", "Martillo DTH 8"]}
      ]
    },
    {
      "id": "drilling_parameters",
      "title": "2. Parámetros Técnicos de Perforación",
      "fields": [
        {"id": "wob_lbs", "type": "number", "label": "Peso Sobre la Broca - WOB (k-lbs)", "required": true, "min": 10, "max": 90, "unit": "k-lbs"},
        {"id": "rpm", "type": "number", "label": "Velocidad de Rotación - RPM", "required": true, "min": 20, "max": 120, "unit": "RPM"},
        {"id": "pulldown_pressure", "type": "number", "label": "Presión de Avanzo / Pulldown (psi)", "required": true, "min": 500, "max": 3500, "unit": "psi"},
        {"id": "flushing_pressure", "type": "number", "label": "Presión de Aire / Barrido (psi)", "required": true, "min": 30, "max": 150, "unit": "psi"},
        {"id": "rop_mhr", "type": "number", "label": "Velocidad de Penetración - ROP (m/hr)", "required": true, "min": 1, "max": 80, "unit": "m/hr"}
      ]
    },
    {
      "id": "evidence",
      "title": "3. Evidencias y Observaciones",
      "fields": [
        {"id": "observations_text", "type": "textarea", "label": "Observaciones o Detenciones", "required": false},
        {"id": "photo_evidence", "type": "photo", "label": "Fotografía del Pozo o Equipo", "required": false},
        {"id": "operator_signature", "type": "signature", "label": "Firma Digital del Operador", "required": true}
      ]
    }
  ]
}'::jsonb, true, NOW());

-- Catálogos de Estados y Motivos
INSERT INTO catalogs (id, code, name, description) VALUES
('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380c00', 'STOPPAGE_REASONS', 'Motivos de Detención de Perforadora', 'Catálogo de causas de detención operacional o mantenimiento.');

INSERT INTO catalog_items (catalog_id, code, label, sort_order) VALUES
('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380c00', 'CHANGE_BIT', 'Cambio de Broca / Tricono', 1),
('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380c00', 'BLASTING_WAIT', 'Espera por Tronadura', 2),
('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380c00', 'MECHANICAL_FAILURE', 'Falla Mecánica / Hidráulica', 3),
('k1eebc99-9c0b-4ef8-bb6d-6bb9bd380c00', 'CHANGE_SHIFT', 'Relevo de Turno', 4);
