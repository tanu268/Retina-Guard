const path = require('path');
const fs = require('fs');

// Need to set env before loading config
process.env.NODE_ENV = 'development';
process.env.MATLAB_ADAPTER = 'onnx';
process.env.MODEL_VERSION = 'retinaguard_resnet18.onnx';

const { buildContainer } = require('./src/container');

async function main() {
    const container = await buildContainer();
    const { config } = require('./src/config');
    const imageRepo = container.repos.imageRepository;
    const casesRepo = container.repos.consultationRepository;
    const analysisService = container.services.analysisService;
    const storageService = container.services.storageService;

    console.log(`Adapter configured: ${config.matlab.adapter}`);
    
    // Create a mock case
    const caseId = require('crypto').randomUUID();
    await casesRepo.create({
        id: caseId,
        patient_id: 'E2E-TEST',
        status: 'analysis_pending',
        case_number: 'TEST-' + Math.floor(Math.random()*10000),
        site_id: config.siteId || 'TEST'
    });
    
    // Create a mock image record in DB
    const imgId = require('crypto').randomUUID();
    
    // We need to actually have a file in storage
    const testImgPath = '/home/yash/Downloads/aptos2019-20260925T101102Z-1-005/aptos2019/train_images/000c1434d8d7.png';
    const destPath = path.join(storageService.root, 'fundus', `${imgId}.png`);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(testImgPath, destPath);
    
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(destPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');

    await imageRepo.create({
        id: imgId,
        consultation_id: caseId,
        laterality: 'OD',
        file_path: `fundus/${imgId}.png`,
        file_size_bytes: fileBuffer.length,
        mime_type: 'image/png',
        sha256: hex,
        status: 'uploaded',
        quality_grade: 'A'
    });
    
    console.log("Running analysis pipeline...");
    const actor = { id: 'sys', role: 'system' };
    const req = { ip: '127.0.0.1', headers: {} };
    
    const result = await analysisService.run({ imageId: imgId }, actor, req);
    
    console.log(`Analysis complete. Status: ${result.analysis.status}`);
    
    const explainability = await analysisService.getExplainability(result.analysis.id);
    const gradcam = explainability.gradcam;
    
    console.log("\n=== RETURNED API ARTIFACT DTO ===");
    console.log(JSON.stringify(gradcam, null, 2));
    
    if (!gradcam || !gradcam.artifact_path) {
        console.error("Grad-CAM artifact path missing from DB/API response.");
        process.exit(1);
    }
    
    const artifactPath = storageService.absolute(gradcam.artifact_path);
    if (fs.existsSync(artifactPath)) {
        console.log(`\n✅ Artifact strictly proven on disk at: ${artifactPath}`);
        console.log(`Artifact size: ${fs.statSync(artifactPath).size} bytes`);
    } else {
        console.error(`\n❌ Artifact NOT found at: ${artifactPath}`);
        process.exit(1);
    }
    
    console.log("\nNode -> Python -> ONNX -> Artifact path validated successfully!");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
