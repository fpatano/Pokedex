import { NextRequest, NextResponse } from 'next/server';
import { CoachRequestSchema, COACH_CORE_CONTRACT_VERSION } from '@/lib/coach/contract';
import { buildCoachResponse } from '@/lib/coach/service';

function trace(event: string, data: Record<string, unknown>) {
  // Minimal trace logging for deterministic gate verification.
  console.info(`[coach-core] ${event}`, data);
}

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? 'no-trace-id';
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    trace('invalid_json', { traceId });
    return NextResponse.json(
      {
        error: 'Invalid JSON body',
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  const parsed = CoachRequestSchema.safeParse(body);

  if (!parsed.success) {
    trace('invalid_contract', { traceId });
    return NextResponse.json(
      {
        error: 'Invalid coach request contract',
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  const response = buildCoachResponse(parsed.data);
  trace('response', {
    traceId,
    mode: response.mode,
    confidence: response.confidence,
    fallbackReason: response.fallbackReason,
    archetype: response.archetype,
  });
  return NextResponse.json(response, { status: 200 });
}
