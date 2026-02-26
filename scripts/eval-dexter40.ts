import { runDexter40Evaluation } from '@/lib/metadata/eval/dexter40Harness';

const report = runDexter40Evaluation();

console.log('Dexter40 evaluation complete');
console.log(`Queries passed: ${report.passedQueries}/${report.totalQueries} (${(report.queryPassRate * 100).toFixed(1)}%)`);

if (report.queryPassRate < 1) {
  const failed = report.queryResults.filter((result) => !result.passed).map((result) => result.id);
  console.log(`Failed query ids: ${failed.join(', ')}`);
  process.exitCode = 1;
}
