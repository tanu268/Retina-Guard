const fs = require('fs');
const path = require('path');

async function runE2E() {
  const baseUrl = 'http://localhost:4000';
  let res, body, token, reviewerToken, patientId, consultationId, imageId;

  const request = async (method, url, data = null, headers = {}) => {
    const fetchHeaders = { ...headers };
    let bodyData;
    if (data && data.constructor && data.constructor.name === 'FormData') {
      bodyData = data;
    } else if (data) {
      fetchHeaders['Content-Type'] = 'application/json';
      bodyData = JSON.stringify(data);
    }
    const response = await fetch(baseUrl + url, {
      method,
      headers: fetchHeaders,
      body: bodyData
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch(e) {}
    console.log(`${method} ${url} -> ${response.status}`);
    console.log(JSON.stringify(json || text, null, 2));
    return { status: response.status, body: json || text };
  };

  // 1. Health checks
  await request('GET', '/health/ready');
  await request('GET', '/health/matlab');

  // 2. Login Technician
  res = await request('POST', '/auth/login', { username: 'tanu.tech', password: 'Tech#Rural2026' });
  if (res.status !== 200) {
    console.error("Login failed:", res.body);
    return;
  }
  token = res.body.accessToken;

  // 3. Register Patient
  res = await request('POST', '/patients', {
    patientCode: 'PAT-' + Date.now(),
    fullName: 'Test Patient',
    age: 45,
    gender: 'female'
  }, { 'Authorization': `Bearer ${token}` });
  // 4. Register Consultation
  patientId = res.body.patient.id;
  res = await request('POST', '/consultations', {
    patientId,
    triagePriority: 'P2',
    identityConfirmed: true
  }, { 'Authorization': `Bearer ${token}` });
  // 5. Upload Image
  consultationId = res.body.consultation.id;
  const testImagePath = path.join(__dirname, 'test.jpg');
  fs.writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9])); // valid minimal jpeg

  const formData = new global.FormData();
  formData.append('laterality', 'left');
  formData.append('consultationId', consultationId);
  const blob = new global.Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
  formData.append('image', blob, 'test.jpg');

  const uploadRes = await fetch(baseUrl + '/images/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const uploadBody = await uploadRes.json();
  console.log(`POST /images/upload -> ${uploadRes.status}`);
  console.log(JSON.stringify(uploadBody, null, 2));
  imageId = uploadBody.image.id;

  // 6. Run Analysis
  res = await request('POST', `/analysis/run`, { imageId }, { 'Authorization': `Bearer ${token}` });

  // 7. Login Reviewer
  res = await request('POST', '/auth/login', { username: 'reviewer.doc', password: 'Review#Doc2026' });
  reviewerToken = res.body.accessToken;

  // 8. Close Review
  res = await request('POST', `/review/${consultationId}/decision`, {
    reviewerGradeCode: 2,
    decision: 'routine_recall'
  }, { 'Authorization': `Bearer ${reviewerToken}` });

  // 9. Generate Report
  res = await request('POST', `/reports/${consultationId}/generate`, {}, { 'Authorization': `Bearer ${reviewerToken}` });
  
  // 10. Get PDF
  const pdfRes = await fetch(baseUrl + `/reports/${consultationId}/pdf`, {
    headers: { 'Authorization': `Bearer ${reviewerToken}` }
  });
  console.log(`GET /reports/${consultationId}/pdf -> ${pdfRes.status}`);
  const buffer = await pdfRes.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70) {
    console.log(`PDF validation: PASS (Valid %PDF header found, size: ${bytes.length} bytes)`);
  } else {
    console.log(`PDF validation: FAIL (Header: ${bytes.slice(0, 4).join(',')})`);
  }
}
runE2E().catch(console.error);
