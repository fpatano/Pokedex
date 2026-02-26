import { runDexter40Evaluation } from '@/lib/metadata/eval/dexter40Harness';

const report = runDexter40Evaluation();

console.log(JSON.stringify({
  mappingSuccess: `${(report.mappingSuccessRate * 100).toFixed(1)}% (${report.mappedCards}/${report.totalCards})`,
  validationFailRate: `${(report.validationFailRate * 100).toFixed(1)}%`,
  topFailureReasons: report.topFailureReasons,
  queryPassRate: `${(report.queryPassRate * 100).toFixed(1)}% (${report.passedQueries}/${report.totalQueries})`,
}, null, 2));

if (report.validationFailRate > 0.25 || report.queryPassRate < 0.9) {
  process.exitCode = 1;
}
