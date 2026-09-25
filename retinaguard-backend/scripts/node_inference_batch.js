const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');
const { preprocessImage } = require('../src/inference/preprocess.js');

function calculateProbabilities(logits) {
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(x => Math.exp(x - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    return expLogits.map(x => x / sumExp);
}

async function runNodeInference(manifestPath, modelPath, outputPath) {
    const fileContent = fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '');
    const manifest = JSON.parse(fileContent);
    const session = await ort.InferenceSession.create(modelPath);
    
    let results = {};
    
    for (let item of manifest.images) {
        const imgPath = path.resolve(__dirname, '../..', item.path);
        console.log(`Processing Node: ${item.filename}`);
        
        try {
            // 1. Preprocess
            const { tensor, metadata } = await preprocessImage(imgPath);
            
            // 2. Inference
            const inputTensor = new ort.Tensor('float32', tensor, metadata.shape);
            const feeds = {};
            feeds[session.inputNames[0]] = inputTensor;
            const outputData = await session.run(feeds);
            const logits = Array.from(outputData[session.outputNames[0]].data);
            
            // 3. Postprocess
            const probs = calculateProbabilities(logits);
            
            let maxProb = -1;
            let grade = 0;
            for (let i = 0; i < probs.length; i++) {
                if (probs[i] > maxProb) {
                    maxProb = probs[i];
                    grade = i;
                }
            }
            
            let refProb = probs[2] + probs[3] + probs[4];
            let referableFlag = refProb >= 0.50;
            
            results[item.filename] = {
                tensor: Array.from(tensor),
                logits: logits,
                probabilities: probs,
                predicted_grade: grade,
                referable_probability: refProb,
                referable_flag: referableFlag
            };
        } catch (e) {
            console.error(`Error processing ${item.filename}:`, e);
        }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
}

const manifestPath = path.resolve(__dirname, "../../INDEPENDENT_PARITY_IMAGE_MANIFEST.json");
const modelPath = path.resolve(__dirname, "../../model/retinaguard_resnet18.onnx");
const outputPath = path.resolve(__dirname, "../../node_batch_results.json");

runNodeInference(manifestPath, modelPath, outputPath).catch(console.error);
