import { runFullPhase1DAudit } from './fullPhase1DAudit.ts';

runFullPhase1DAudit().then((result) => {
  console.log('AUDIT_COMPLETE_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('AUDIT_COMPLETE_END');
}).catch((err) => {
  console.error('Audit failed with error:', err);
});
