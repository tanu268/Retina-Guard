const fs = require('fs');
const g12 = JSON.parse(fs.readFileSync('d:/RetinaG/Retina-Guard/validation/master_closure_v7/32_runtime_closure_v72/g12_real_http_evidence.json'));
const caseData = g12.queue.response.items[0];
const g19 = {
  case_uuid: caseData.consultation_id,
  abstained: caseData.abstained === 1,
  abstain_reason: caseData.abstain_reason,
  grade: caseData.dr_grade_code,
  confidence: caseData.confidence,
  referable: caseData.referable,
  ui_status: caseData.status
};
fs.writeFileSync('d:/RetinaG/Retina-Guard/validation/master_closure_v7/32_runtime_closure_v72/g19_abstention_evidence.json', JSON.stringify(g19, null, 2));
