const fs = require('fs');
const files = [
  'tests/integration/failure-logging.test.js',
  'tests/integration/model-config.test.js',
  'tests/integration/parser.test.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const { app } = require\('\.\.\/\.\.\/src\/app'\);[\s\S]*?beforeAll\(async \(\) => {[\s\S]*?}\);/m,
    `const { buildTestApp } = require('../helpers/app');\nconst { createTechnician } = require('../helpers/factories');\n\ndescribe(file, () => {\n  let app; let container; let techToken;\n  \n  beforeEach(async () => {\n    ({ app, container } = await buildTestApp());\n    await createTechnician(container, { username: 'e2e_tech_f', password: 'Tech#Passw0rd1' });\n    techToken = (await request(app).post('/auth/login').send({ username: 'e2e_tech_f', password: 'Tech#Passw0rd1' })).body.accessToken;\n  });\n  afterEach(async () => { await container.close(); });`
  );
  
  content = content.replace(/technicianToken/g, 'techToken');
  content = content.replace(/describe\(file, \(\) => {/, 'describe(\'Test suite\', () => {');
  
  fs.writeFileSync(file, content);
}
