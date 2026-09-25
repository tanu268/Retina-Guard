'use strict';
const fs = require('fs');
const path = require('path');
const AnalysisService = require('../src/services/analysisService');

const testDir = path.resolve(__dirname, '../../local_dataset/test_images');

async function run() {
    if (!fs.existsSync(testDir)) {
        console.error('Test directory not found:', testDir);
        process.exit(1);
    }

    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.png'));
    
    // Inject ONNX configuration
    const { config } = require('../src/config');
    config.matlab.adapter = 'onnx';
    config.matlab.modelVersion = 'retinaguard_resnet18.onnx';
    
    const { buildContainer } = require('../src/container');
    const container = await buildContainer();
    const matlabService = container.services.matlabService;
    
    console.log('# ONNX End-to-End Regression Results\n');
    console.log(`Model version: ${config.matlab.modelVersion}`);
    console.log(`Adapter: ${config.matlab.adapter}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    let total = 0, completed = 0, abstained = 0;
    const grades = { R0: 0, R1: 0, R2: 0, R3: 0, U: 0 };
    let sumConf = 0;

    for (const file of files) {
        const imagePath = path.join(testDir, file);
        try {
            const pipeline = await matlabService.runPipeline({
                imagePath,
                sha256: 'dummy',
                gradcamOutputPath: path.join(__dirname, '../tmp', file),
                qualityGrade: 'A'
            });
            
            total++;
            if (pipeline.status === 'completed') {
                completed++;
                grades[pipeline.gradeLabel] = (grades[pipeline.gradeLabel] || 0) + 1;
                sumConf += pipeline.grading.confidence;
            } else {
                abstained++;
            }
        } catch (err) {
            console.error(`Error processing ${file}: ${err.message}`);
        }
    }
    
    console.log(`## E2E Regression Summary`);
    console.log(`Total: ${total}`);
    console.log(`Completed: ${completed}`);
    console.log(`Abstained: ${abstained}`);
    console.log(`Grades Breakdown:`, JSON.stringify(grades));
    console.log(`Avg Confidence: ${(sumConf / completed * 100).toFixed(2)}%`);
    await container.close();
}

run().catch(console.error);
