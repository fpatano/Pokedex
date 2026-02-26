export type TournamentLogEvent =
  | 'tournament_request'
  | 'tournament_rate_limited'
  | 'tournament_idempotency_hit'
  | 'tournament_timeout'
  | 'tournament_retry'
  | 'tournament_success'
  | 'tournament_failure'
  | 'tournament_circuit_open';

export function logTournamentEvent(event: TournamentLogEvent, fields: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      scope: 'coach-core',
      variant: 'tournament',
      event,
      timestamp: new Date().toISOString(),
      ...fields,
    })
  );
}
