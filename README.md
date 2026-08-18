# Zaldívar Drilling PWA - Sistema de Control Operacional de Perforación Minera (Offline-First)

Aplicación Web Progresiva (PWA) de alta disponibilidad diseñada para registrar, consultar, modificar, aprobar y auditar procedimientos operacionales y técnicos de perforación en terreno minero (Faena Zaldívar), garantizando cero pérdida de información bajo condiciones de conectividad intermitente o sin internet.

---

## 🚀 Tecnologías Base

- **Framework**: Next.js (App Router) + React 18 + TypeScript estricto.
- **Base de Datos Central**: Supabase (PostgreSQL 15) con Row Level Security (RLS) y RPCs.
- **Base de Datos Local**: IndexedDB gestionada con **Dexie.js** (`ZaldivarDrillingDB`).
- **Autenticación**: Supabase Auth con caché offline de perfil autorizada.
- **PWA & Offline Shell**: Service Worker con Workbox y Manifest PWA (`display: standalone`).
- **Formularios & Validaciones**: React Hook Form + Zod + Tailwind CSS.
- **Estado y Fetching**: TanStack Query + Motor de Cola Outbox con comprobador HTTP real.
- **Pruebas**: Vitest (Pruebas unitarias) y Playwright (Pruebas End-to-End).

---

## 📌 Principios Arquitectónicos
1. **Offline-First**: Todo registro se guarda primero en IndexedDB antes de ser enviado.
2. **Cola Outbox e Idempotencia**: Cada operación local incluye un `operationId` único (UUID v4/v7). La función RPC `process_sync_batch` en Supabase garantiza que reintentos o duplicados no alteren la base de datos central.
3. **Control de Concurrencia Optimista**: Detección de versiones mediante la columna `version`. Si la versión esperada no coincide, el sistema clasifica el cambio como conflicto sin sobrescribir datos.
4. **Regla de Cierre Inviolable**: Un procedimiento en estado `closed` **jamás** puede ser editado o sobrescrito.
5. **Seguridad y RLS por Diseño**: Ningún permiso depende únicamente de la UI. PostgreSQL aplica políticas de RLS estrictas por faena y rol.

---

## 🛠️ Instalación y Configuración

```bash
# 1. Clonar el repositorio e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local

# 3. Aplicar migraciones SQL en Supabase
# Copiar el contenido de `supabase/migrations/20260806000000_initial_schema.sql` en el SQL Editor de Supabase
# Ejecutar `supabase/seed.sql` para poblar datos iniciales

# 4. Iniciar servidor de desarrollo local
npm run dev
```

---

## 🧪 Ejecución de Pruebas

```bash
# Ejecutar pruebas unitarias de máquina de estados y validaciones Zod
npm run test

# Ejecutar pruebas End-to-End con Playwright
npm run test:e2e
```

---

## 📄 Estructura de Entregables
- **`supabase/migrations/`**: Script DDL SQL de 28 tablas, triggers de versión y auditoría, funciones RPC idempotentes y políticas RLS.
- **`src/lib/indexeddb/`**: Base de datos Dexie local y repositorios de datos.
- **`src/lib/sync/`**: Motor Outbox Sync y probador de conectividad real HTTP.
- **`src/features/procedures/`**: Máquina de estados explícita y formularios por pasos.
- **`src/components/`**: Interfaz de usuario para terreno (botones grandes, alto contraste, capturador de fotos y firma digital).

---

## 🏢 Matriz de Roles y Permisos (RLS)

| Rol | Iniciar / Editar Borrador | Aprobar / Rechazar | Cerrar Registro | Auditar Bitácora |
| :--- | :---: | :---: | :---: | :---: |
| **Operador** | ✅ | ❌ | ❌ | ❌ |
| **Supervisor** | ❌ | ✅ | ✅ | ✅ |
| **Administrador** | ✅ | ✅ | ✅ | ✅ |
| **Auditor** | ❌ | ❌ | ❌ | ✅ |
