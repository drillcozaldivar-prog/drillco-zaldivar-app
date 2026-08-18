import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { operations } = await req.json();

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: 'Payload de operaciones inválido' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Invocar la función RPC idempotente en PostgreSQL / Supabase
    const { data: syncResults, error } = await supabase.rpc('process_sync_batch', {
      p_operations: operations,
    });

    if (error) {
      console.error('[API /api/sync] Error en RPC process_sync_batch:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(syncResults, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/sync] Error interno en servidor:', err);
    return NextResponse.json({ error: 'Error interno de procesamiento de sincronización' }, { status: 500 });
  }
}
