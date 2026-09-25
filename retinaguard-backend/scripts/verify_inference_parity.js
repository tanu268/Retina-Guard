const fs = require('fs');
const onnx = require('onnxruntime-node');

function softmax(logits) {
    const maxLogit = Math.max(...logits);
    const scores = logits.map(l => Math.exp(l - maxLogit));
    const sum = scores.reduce((a, b) => a + b, 0);
    return scores.map(s => s / sum);
}

async function run() {
    const buffer = fs.readFileSync('D:/Retina-Guard/test_tensor.bin');
    const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    
    const session = await onnx.InferenceSession.create('D:\\Retina-Guard\\model\\retinaguard_resnet18.onnx');
    const input = new onnx.Tensor('float32', floatArray, [1, 3, 384, 384]);
    
    const results = await session.run({ [session.inputNames[0]]: input });
    const logits = Array.from(results[session.outputNames[0]].data);
    const probs = softmax(logits);
    
    const predictedClass = probs.indexOf(Math.max(...probs));
    const confidence = probs[predictedClass];
    const referableProb = probs.slice(2).reduce((a, b) => a + b, 0);

    console.log(JSON.stringify({
        engine: 'node-from-python-tensor',
        logits,
        probabilities: probs,
        predictedClass,
        confidence,
        referableProbability: referableProb
    }, null, 2));
}

run().catch(console.error);
