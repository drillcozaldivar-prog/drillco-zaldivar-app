-- ============================================================================
-- MIGRACIÓN INICIAL: BASE DE DATOS DE CONTROL DE PERFORACIÓN MINERA PWA
-- ============================================================================

-- Habilitar extensión pgcrypto para UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLAS ORGANIZACIONALES Y USUARIOS
-- ----------------------------------------------------------------------------

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, code)
);

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(site_id, code)
);

CREATE TABLE users_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    rut_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- 'operator', 'supervisor', 'admin', 'auditor'
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE TABLE user_site_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, site_id)
);

-- ----------------------------------------------------------------------------
-- 2. TABLAS DE EQUIPOS, OPERADORES Y TURNOS
-- ----------------------------------------------------------------------------

CREATE TABLE drill_rig_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    model_name TEXT NOT NULL,
    drilling_type TEXT NOT NULL, -- 'rotary', 'dth', 'top_hammer'
    max_depth_meters NUMERIC(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drill_rigs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id),
    model_id UUID NOT NULL REFERENCES drill_rig_models(id),
    code TEXT NOT NULL UNIQUE, -- Ej. 'PERF-01', 'PV-271'
    serial_number TEXT,
    current_horometer NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'maintenance', 'out_of_service'
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_profiles(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    operator_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    license_category TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id),
    code TEXT NOT NULL, -- 'DAY_A', 'NIGHT_A', 'DAY_B', 'NIGHT_B'
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drill_holes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id),
    area_id UUID NOT NULL REFERENCES areas(id),
    hole_code TEXT NOT NULL, -- Ej. 'POZO-1042'
    pattern_code TEXT, -- Ej. 'MALLA-45'
    target_depth_meters NUMERIC(8,2) NOT NULL,
    diameter_inches NUMERIC(5,2),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'drilling', 'completed', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. PLANTILLAS Y FORMULARIOS DINÁMICOS
-- ----------------------------------------------------------------------------

CREATE TABLE procedure_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- 'PRE_SHIFT', 'DRILLING_CONTROL', 'MAINTENANCE_INSPECTION'
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE procedure_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    type_id UUID NOT NULL REFERENCES procedure_types(id),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE procedure_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES procedure_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    schema JSONB NOT NULL, -- Estructura de secciones, campos, validaciones y reglas
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

-- ----------------------------------------------------------------------------
-- 4. PROCEDIMIENTOS OPERACIONALES (TABLA PRINCIPAL)
-- ----------------------------------------------------------------------------

CREATE TABLE procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL UNIQUE, -- Identificador único local generado en el dispositivo
    organization_id UUID NOT NULL REFERENCES organizations(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    area_id UUID NOT NULL REFERENCES areas(id),
    procedure_type_id UUID NOT NULL REFERENCES procedure_types(id),
    template_version_id UUID NOT NULL REFERENCES procedure_template_versions(id),
    drill_rig_id UUID NOT NULL REFERENCES drill_rigs(id),
    drill_hole_id UUID REFERENCES drill_holes(id),
    shift_id UUID NOT NULL REFERENCES shifts(id),
    operator_id UUID NOT NULL REFERENCES operators(id),
    
    status TEXT NOT NULL DEFAULT 'draft',
    -- Estados: 'draft', 'in_progress', 'pending_sync', 'submitted', 'under_review', 
    -- 'changes_requested', 'approved', 'rejected', 'closed', 'cancelled', 'conflict'
    
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    created_offline BOOLEAN NOT NULL DEFAULT TRUE,
    device_id TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    location_accuracy NUMERIC(8,2),
    notes TEXT,
    
    version INT NOT NULL DEFAULT 1, -- Control de concurrencia optimista
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users_profiles(id),
    updated_by UUID NOT NULL REFERENCES users_profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE procedure_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    answer_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(procedure_id, field_id)
);

CREATE TABLE procedure_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    measurement_type TEXT NOT NULL, -- 'pressure', 'flow_rate', 'temperature', 'rpm', 'wob', 'rop', 'depth', 'drilled_meters', 'horometer', 'pull_down'
    value NUMERIC(12,4) NOT NULL,
    unit TEXT NOT NULL, -- 'psi', 'gpm', 'celsius', 'rpm', 'lbs', 'm_hr', 'meters', 'hours'
    sequence INT NOT NULL DEFAULT 1,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'sensor', 'calculated'
    notes TEXT,
    validation_status TEXT NOT NULL DEFAULT 'valid' -- 'valid', 'out_of_range', 'justified'
);

CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'safety', 'operational', 'maintenance', 'environmental'
    severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    corrective_action TEXT,
    reported_by UUID NOT NULL REFERENCES users_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    local_id UUID NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    file_hash TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    attachment_type TEXT NOT NULL DEFAULT 'photo', -- 'photo', 'signature', 'document'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users_profiles(id)
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users_profiles(id),
    action TEXT NOT NULL, -- 'submitted', 'approved', 'rejected', 'requested_changes', 'closed'
    comments TEXT,
    signature_attachment_id UUID REFERENCES attachments(id),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. AUDITORÍA, DISPOSITIVOS, SINCRONIZACIÓN Y CONFLICTOS
-- ----------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'SUBMIT', 'APPROVE', 'REJECT', 'CLOSE', 'CANCEL'
    previous_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    user_id UUID NOT NULL REFERENCES users_profiles(id),
    user_role TEXT,
    device_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    operation_id UUID,
    session_id TEXT
);

CREATE TABLE sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL UNIQUE, -- Operation ID proveniente de la cola outbox
    device_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users_profiles(id),
    entity_type TEXT NOT NULL,
    entity_local_id UUID NOT NULL,
    entity_server_id UUID,
    operation_type TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'conflict'
    response_payload JSONB,
    error_code TEXT,
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id),
    operation_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users_profiles(id),
    device_id TEXT NOT NULL,
    conflict_type TEXT NOT NULL, -- 'version_mismatch', 'record_closed', 'template_outdated'
    local_payload JSONB NOT NULL,
    server_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved_server', 'resolved_local', 'resolved_merged'
    resolved_by UUID REFERENCES users_profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    platform TEXT,
    browser TEXT,
    app_version TEXT NOT NULL,
    authorized BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(catalog_id, code)
);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------

CREATE INDEX idx_procedures_site_status ON procedures(site_id, status);
CREATE INDEX idx_procedures_operator ON procedures(operator_id);
CREATE INDEX idx_procedures_rig ON procedures(drill_rig_id);
CREATE INDEX idx_procedures_local_id ON procedures(local_id);
CREATE INDEX idx_measurements_procedure ON procedure_measurements(procedure_id, measurement_type);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_sync_events_op_id ON sync_events(operation_id);

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS AUTOMÁTICOS DE VERSIÓN Y UPDATED_AT
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp_and_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF TG_OP = 'UPDATE' THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_procedures_version
BEFORE UPDATE ON procedures
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_and_version();

-- Trigger de auditoría automática
CREATE OR REPLACE FUNCTION audit_procedure_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        entity_type,
        entity_id,
        action,
        previous_data,
        new_data,
        user_id,
        occurred_at
    ) VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        'procedure',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        COALESCE(NEW.updated_by, NEW.created_by, OLD.updated_by),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_procedure
AFTER INSERT OR UPDATE ON procedures
FOR EACH ROW
EXECUTE FUNCTION audit_procedure_changes();

-- ----------------------------------------------------------------------------
-- 8. FUNCIONES RPC PARA SINCRONIZACIÓN BATCH IDEMPOTENTE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION process_sync_batch(p_operations JSONB)
RETURNS JSONB AS $$
DECLARE
    v_op JSONB;
    v_results JSONB := '[]'::jsonb;
    v_op_id UUID;
    v_existing_event RECORD;
    v_local_id UUID;
    v_server_id UUID;
    v_entity_type TEXT;
    v_op_type TEXT;
    v_payload JSONB;
    v_user_id UUID;
    v_device_id TEXT;
    v_expected_version INT;
    v_current_version INT;
    v_current_status TEXT;
    v_procedure_id UUID;
    v_meas JSONB;
BEGIN
    FOR v_op IN SELECT * FROM jsonb_array_elements(p_operations)
    LOOP
        v_op_id := (v_op->>'operationId')::UUID;
        v_entity_type := v_op->>'entityType';
        v_op_type := v_op->>'operationType';
        v_payload := v_op->'payload';
        v_local_id := (v_op->>'entityLocalId')::UUID;
        v_user_id := (v_op->>'userId')::UUID;
        v_device_id := v_op->>'deviceId';
        v_expected_version := COALESCE((v_op->>'expectedServerVersion')::INT, 1);

        -- IDEMPOTENCIA: Verificar si la operación ya fue procesada antes
        SELECT * INTO v_existing_event FROM sync_events WHERE operation_id = v_op_id;
        IF FOUND THEN
            v_results := v_results || jsonb_build_object(
                'operationId', v_op_id,
                'success', true,
                'idempotent', true,
                'serverId', v_existing_event.entity_server_id,
                'status', 'completed'
            );
            CONTINUE;
        END IF;

        -- PROCESAMIENTO SEGÚN TIPO DE ENTIDAD
        IF v_entity_type = 'procedure' THEN
            IF v_op_type = 'CREATE' THEN
                -- Insertar nuevo procedimiento
                INSERT INTO procedures (
                    local_id, organization_id, site_id, area_id, procedure_type_id,
                    template_version_id, drill_rig_id, drill_hole_id, shift_id, operator_id,
                    status, started_at, completed_at, created_offline, device_id,
                    latitude, longitude, location_accuracy, notes, created_by, updated_by
                ) VALUES (
                    v_local_id,
                    (v_payload->>'organization_id')::UUID,
                    (v_payload->>'site_id')::UUID,
                    (v_payload->>'area_id')::UUID,
                    (v_payload->>'procedure_type_id')::UUID,
                    (v_payload->>'template_version_id')::UUID,
                    (v_payload->>'drill_rig_id')::UUID,
                    (v_payload->>'drill_hole_id')::UUID,
                    (v_payload->>'shift_id')::UUID,
                    (v_payload->>'operator_id')::UUID,
                    COALESCE(v_payload->>'status', 'submitted'),
                    (v_payload->>'started_at')::TIMESTAMPTZ,
                    (v_payload->>'completed_at')::TIMESTAMPTZ,
                    COALESCE((v_payload->>'created_offline')::BOOLEAN, true),
                    v_device_id,
                    (v_payload->>'latitude')::NUMERIC,
                    (v_payload->>'longitude')::NUMERIC,
                    (v_payload->>'location_accuracy')::NUMERIC,
                    v_payload->>'notes',
                    v_user_id,
                    v_user_id
                ) RETURNING id INTO v_server_id;

                -- Insertar mediciones asociadas si vienen en el payload
                IF v_payload->'measurements' IS NOT NULL THEN
                    FOR v_meas IN SELECT * FROM jsonb_array_elements(v_payload->'measurements')
                    LOOP
                        INSERT INTO procedure_measurements (
                            procedure_id, measurement_type, value, unit, sequence, notes
                        ) VALUES (
                            v_server_id,
                            v_meas->>'measurement_type',
                            (v_meas->>'value')::NUMERIC,
                            v_meas->>'unit',
                            COALESCE((v_meas->>'sequence')::INT, 1),
                            v_meas->>'notes'
                        );
                    END LOOP;
                END IF;

                -- Registrar sync event exitoso
                INSERT INTO sync_events (
                    operation_id, device_id, user_id, entity_type, entity_local_id,
                    entity_server_id, operation_type, status, response_payload
                ) VALUES (
                    v_op_id, v_device_id, v_user_id, v_entity_type, v_local_id,
                    v_server_id, v_op_type, 'success', jsonb_build_object('serverId', v_server_id)
                );

                v_results := v_results || jsonb_build_object(
                    'operationId', v_op_id,
                    'success', true,
                    'serverId', v_server_id,
                    'serverVersion', 1,
                    'status', 'completed'
                );

            ELSIF v_op_type = 'UPDATE' OR v_op_type = 'SUBMIT' THEN
                -- Obtener versión y estado actual
                SELECT id, version, status INTO v_procedure_id, v_current_version, v_current_status
                FROM procedures WHERE local_id = v_local_id;

                IF NOT FOUND THEN
                    v_results := v_results || jsonb_build_object(
                        'operationId', v_op_id,
                        'success', false,
                        'errorCode', 'RECORD_NOT_FOUND',
                        'errorMessage', 'El procedimiento no existe en el servidor'
                    );
                    CONTINUE;
                END IF;

                -- Regla de Negocio: No actualizar procedimientos cerrados
                IF v_current_status = 'closed' THEN
                    v_results := v_results || jsonb_build_object(
                        'operationId', v_op_id,
                        'success', false,
                        'errorCode', 'RECORD_CLOSED',
                        'errorMessage', 'El procedimiento está cerrado y no se puede modificar'
                    );
                    CONTINUE;
                END IF;

                -- Control de Concurrencia Optimista (Conflicto de versión)
                IF v_current_version > v_expected_version THEN
                    INSERT INTO conflicts (
                        procedure_id, operation_id, user_id, device_id, conflict_type,
                        local_payload, server_payload
                    ) VALUES (
                        v_procedure_id, v_op_id, v_user_id, v_device_id, 'version_mismatch',
                        v_payload, (SELECT to_jsonb(p) FROM procedures p WHERE id = v_procedure_id)
                    );

                    v_results := v_results || jsonb_build_object(
                        'operationId', v_op_id,
                        'success', false,
                        'errorCode', 'VERSION_CONFLICT',
                        'errorMessage', 'El registro fue modificado en el servidor por otro usuario',
                        'serverVersion', v_current_version
                    );
                    CONTINUE;
                END IF;

                -- Actualizar procedimiento
                UPDATE procedures SET
                    status = COALESCE(v_payload->>'status', status),
                    notes = COALESCE(v_payload->>'notes', notes),
                    updated_by = v_user_id,
                    updated_at = NOW()
                WHERE id = v_procedure_id;

                INSERT INTO sync_events (
                    operation_id, device_id, user_id, entity_type, entity_local_id,
                    entity_server_id, operation_type, status
                ) VALUES (
                    v_op_id, v_device_id, v_user_id, v_entity_type, v_local_id,
                    v_procedure_id, v_op_type, 'success'
                );

                v_results := v_results || jsonb_build_object(
                    'operationId', v_op_id,
                    'success', true,
                    'serverId', v_procedure_id,
                    'serverVersion', v_current_version + 1,
                    'status', 'completed'
                );
            END IF;
        END IF;
    END LOOP;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 9. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_rigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política de lectura general para usuarios autenticados
CREATE POLICY "Lectura de organizaciones para miembros" ON organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura de faenas permitidas" ON sites
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM user_site_access usa 
                WHERE usa.user_id = auth.uid() AND usa.site_id = sites.id
            ) OR EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.code IN ('admin', 'auditor')
            )
        )
    );

-- Políticas RLS para la Tabla Principal de Procedimientos
CREATE POLICY "Lectura de procedimientos autorizados" ON procedures
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            created_by = auth.uid() OR
            operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()) OR
            EXISTS (
                SELECT 1 FROM user_site_access usa 
                WHERE usa.user_id = auth.uid() AND usa.site_id = procedures.site_id
            )
        )
    );

CREATE POLICY "Creación de procedimientos por usuarios de la faena" ON procedures
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM user_site_access usa 
                WHERE usa.user_id = auth.uid() AND usa.site_id = procedures.site_id
            )
        )
    );

CREATE POLICY "Modificación de procedimientos no cerrados" ON procedures
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND status != 'closed' AND (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.code IN ('supervisor', 'admin')
            )
        )
    );

-- Política inmutable para Audit Logs (Solo lectura para admin/auditor)
CREATE POLICY "Lectura de auditoria para auditores y administradores" ON audit_logs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.code IN ('admin', 'auditor')
        )
    );

-- ----------------------------------------------------------------------------
-- 10. TABLA DE RESPALDO DE INVENTARIO Y STOCK (INVENTORY SNAPSHOTS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id TEXT PRIMARY KEY,
    inventory_date TEXT NOT NULL,
    last_update_date TEXT NOT NULL,
    items_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura y escritura de inventario" ON inventory_snapshots
    FOR ALL USING (true) WITH CHECK (true);

