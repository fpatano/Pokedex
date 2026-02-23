export function shouldApplyResponse(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}
