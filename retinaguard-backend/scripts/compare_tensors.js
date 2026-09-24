const fs = require('fs');
const { preprocessImage } = require('../src/inference/preprocess');

async function run() {
    const file = process.argv[2];
    const pythonTensorFile = process.argv[3];
    
    // Read Node.js tensor
    const { tensor: nodeArr } = await preprocessImage(file);
    
    // Read Python tensor
    const pythonBuf = fs.readFileSync(pythonTensorFile);
    const pythonArr = new Float32Array(pythonBuf.buffer, pythonBuf.byteOffset, pythonBuf.length / 4);
    
    if (nodeArr.length !== pythonArr.length) {
        console.error("Length mismatch");
        process.exit(1);
    }
    
    const diffs = new Float32Array(nodeArr.length);
    let maxDiff = 0, sumDiff = 0;
    
    for (let i = 0; i < nodeArr.length; i++) {
        const d = Math.abs(nodeArr[i] - pythonArr[i]);
        diffs[i] = d;
        if (d > maxDiff) maxDiff = d;
        sumDiff += d;
    }
    
    diffs.sort();
    const medianDiff = diffs[Math.floor(diffs.length / 2)];
    const p95 = diffs[Math.floor(diffs.length * 0.95)];
    const p99 = diffs[Math.floor(diffs.length * 0.99)];
    const meanDiff = sumDiff / diffs.length;
    
    const countLeq = (thresh) => diffs.filter(d => d <= thresh).length / diffs.length * 100;
    
    let sumSq = 0;
    for (let i = 0; i < diffs.length; i++) sumSq += diffs[i] * diffs[i];
    const rmse = Math.sqrt(sumSq / diffs.length);
    
    const result = {
        max_abs_diff: maxDiff,
        mean_abs_diff: meanDiff,
        RMSE: rmse,
        median_abs_diff: medianDiff,
        P95_abs_diff: p95,
        P99_abs_diff: p99,
        percentage_leq_1e_6: countLeq(1e-6),
        percentage_leq_1e_5: countLeq(1e-5),
        percentage_leq_1e_4: countLeq(1e-4),
        percentage_leq_1e_3: countLeq(1e-3)
    };
    
    console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
