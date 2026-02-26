import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { DecisionCardRequest, DecisionCardResponse, DecisionInput } from '@/lib/decisionCard/contract';
import { buildDecisionCard } from '@/lib/decisionCard/service';

export type JourneyId = 'J1' | 'J2' | 'J3' | 'J4' | 'J5' | 'J6' | 'J7' | 'J8' | 'J9' | 'J10';

const ALL_JOURNEYS: JourneyId[] = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'J10'];
const artifactsRoot = path.resolve(__dirname, '../artifacts');

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function writeMatrixFromArtifacts() {
  const summary = ALL_JOURNEYS.map((journeyId) => {
    const resultPath = path.join(artifactsRoot, journeyId, 'result.json');
    if (!existsSync(resultPath)) {
      return { journeyId, status: 'FAIL', note: 'missing artifact result.json' };
    }

    const parsed = JSON.parse(readFileSync(resultPath, 'utf8')) as { passed?: boolean; correlationId?: string };
    return {
      journeyId,
      status: parsed.passed ? 'PASS' : 'FAIL',
      correlationId: parsed.correlationId ?? null,
    };
  });

  writeFileSync(path.join(artifactsRoot, 'journey-matrix.json'), JSON.stringify({ generatedAt: new Date().toISOString(), journeys: summary }, null, 2));
}

export function runJourneyWithArtifacts(
  journeyId: JourneyId,
  requestOrInput: DecisionInput | DecisionCardRequest,
  assertion: (response: DecisionCardResponse) => void,
  options?: { includeDeckSkeleton?: boolean }
) {
  ensureDir(artifactsRoot);
  const journeyDir = path.join(artifactsRoot, journeyId);
  ensureDir(journeyDir);

  const request: DecisionCardRequest = 'input' in requestOrInput ? requestOrInput : { input: requestOrInput };
  const response = buildDecisionCard(request, options);
  const correlationId = `${journeyId}-${response.explainability.decision_trace_id}`;

  let passed = true;
  let assertionError: string | null = null;

  try {
    assertion(response);
  } catch (error) {
    passed = false;
    assertionError = error instanceof Error ? error.stack ?? error.message : String(error);
    throw error;
  } finally {
    const result = {
      journeyId,
      passed,
      correlationId,
      decisionTraceId: response.explainability.decision_trace_id,
      state: response.state,
      confidence: response.confidence,
      assertionError,
      response,
      input: request,
    };

    writeFileSync(path.join(journeyDir, 'result.json'), JSON.stringify(result, null, 2));
    writeFileSync(path.join(journeyDir, 'response.json'), JSON.stringify(response, null, 2));
    writeFileSync(
      path.join(journeyDir, 'log.txt'),
      [
        `journey=${journeyId}`,
        `correlation_id=${correlationId}`,
        `decision_trace_id=${response.explainability.decision_trace_id}`,
        `state=${response.state}`,
        `confidence=${response.confidence}`,
        `passed=${passed}`,
        `timestamp=${new Date().toISOString()}`,
      ].join('\n') + '\n'
    );

    writeMatrixFromArtifacts();
  }

  return response;
}
