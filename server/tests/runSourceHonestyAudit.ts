import { runSourceHonestyAudit } from './sourceHonestyAudit.ts';

runSourceHonestyAudit().then((result) => {
  console.log('SOURCE_HONESTY_AUDIT_COMPLETE');
  if (result.failed > 0) {
    process.exit(1);
  }
}).catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
