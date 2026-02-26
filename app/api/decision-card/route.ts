import { NextRequest, NextResponse } from 'next/server';
import {
  DecisionCardErrorSchema,
  DecisionCardRequestSchema,
  DecisionCardResponseSchema,
  DECISION_CARD_VERSION,
} from '@/lib/decisionCard/contract';
import { buildDecisionCard } from '@/lib/decisionCard/service';

function isDecisionCardEnabled(): boolean {
  const value = process.env.DECISION_CARD_V1_ENABLED;
  return value !== '0' && value !== 'false';
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      DecisionCardErrorSchema.parse({
        error: 'Invalid JSON body',
        decision_card_version: DECISION_CARD_VERSION,
        code: 'INVALID_REQUEST',
      }),
      { status: 400 }
    );
  }

  const parsed = DecisionCardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      DecisionCardErrorSchema.parse({
        error: 'Invalid decision card request contract',
        decision_card_version: DECISION_CARD_VERSION,
        code: 'INVALID_REQUEST',
      }),
      { status: 400 }
    );
  }

  if (!isDecisionCardEnabled()) {
    return NextResponse.json(
      {
        decision_card_version: DECISION_CARD_VERSION,
        state: 'NOT_READY_YET',
        confidence: 0.51,
        top_reasons: [
          { reason_code: 'ROLLBACK_ACTIVE', reason: 'Decision Card v1 is temporarily disabled via rollback toggle.', evidence_ref: 'env.DECISION_CARD_V1_ENABLED', rank: 1 },
          { reason_code: 'SAFE_DEFAULT', reason: 'Safe fallback returns a conservative readiness state.', evidence_ref: 'rollback.policy', rank: 2 },
          { reason_code: 'ACTION_REQUIRED', reason: 'Re-enable v1 to restore full deterministic scoring.', evidence_ref: 'ops.runbook', rank: 3 },
        ],
        blocking_issues: ['Decision Card v1 disabled by operator toggle.'],
        next_actions: ['Set DECISION_CARD_V1_ENABLED=true to re-enable v1 decisioning.', 'Run gate suite before exposing to users.'],
        explainability: {
          reason_codes: ['ROLLBACK_ACTIVE', 'SAFE_DEFAULT', 'ACTION_REQUIRED'],
          human_reasons: [
            'Decision Card v1 is temporarily disabled via rollback toggle.',
            'Safe fallback returns a conservative readiness state.',
            'Re-enable v1 to restore full deterministic scoring.',
          ],
          evidence_refs: ['env.DECISION_CARD_V1_ENABLED', 'rollback.policy', 'ops.runbook'],
          confidence_basis: 'rollback_toggle_active',
          blocked_by: ['Decision Card v1 disabled by operator toggle.'],
          recommended_next_actions: ['Set DECISION_CARD_V1_ENABLED=true to re-enable v1 decisioning.', 'Run gate suite before exposing to users.'],
          decision_trace_id: 'rollback-v1-safe',
        },
      },
      { status: 200, headers: { 'x-decision-card-variant': 'rollback-safe-default' } }
    );
  }

  const response = buildDecisionCard(parsed.data.input);
  return NextResponse.json(DecisionCardResponseSchema.parse(response), { status: 200, headers: { 'x-decision-card-variant': 'v1' } });
}
