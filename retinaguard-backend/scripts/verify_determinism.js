const { preprocessImage } = require('../src/inference/preprocess');
const onnx = require('onnxruntime-node');

function softmax(logits) {
    const maxLogit = Math.max(...logits);
    const scores = logits.map(l => Math.exp(l - maxLogit));
    const sum = scores.reduce((a, b) => a + b, 0);
    return scores.map(s => s / sum);
}

async function run() {
    const file = process.argv[2];
    
    // We run the same image 5 times using the exact same flow
    const session = await onnx.InferenceSession.create('D:\\Retina-Guard\\model\\retinaguard_resnet18.onnx');
    
    for (let i=0; i<5; i++) {
        const { tensor } = await preprocessImage(file);
        const input = new onnx.Tensor('float32', tensor, [1, 3, 384, 384]);
        const start = Date.now();
        const results = await session.run({ [session.inputNames[0]]: input });
        const duration = Date.now() - start;
        
        const logits = Array.from(results[session.outputNames[0]].data);
        const probs = softmax(logits);
        const predictedClass = probs.indexOf(Math.max(...probs));
        const confidence = probs[predictedClass];
        const referableProb = probs.slice(2).reduce((a, b) => a + b, 0);
        
        console.log(`Run ${i+1}: Class=${predictedClass}, Conf=${confidence.toFixed(6)}, RefProb=${referableProb.toFixed(6)}, Logits=[${logits.map(l => l.toFixed(4)).join(',')}], Time=${duration}ms`);
    }
}

run().catch(console.error);
