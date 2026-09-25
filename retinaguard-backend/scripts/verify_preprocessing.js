const { preprocessImage } = require('../src/inference/preprocess');

async function run() {
    const file = process.argv[2];
    const { tensor: arr, metadata: info } = await preprocessImage(file);
    
    let min = arr[0], max = arr[0], sum = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
        if (arr[i] > max) max = arr[i];
        sum += arr[i];
    }
    const mean = sum / arr.length;
    let sumSq = 0;
    for (let i = 0; i < arr.length; i++) {
        sumSq += Math.pow(arr[i] - mean, 2);
    }
    const std = Math.sqrt(sumSq / arr.length);

    console.log(JSON.stringify({
        engine: 'node',
        originalDimensions: [info.inputWidth, info.inputHeight],
        processedDimensions: info.shape.slice(2),
        dtype: info.dtype,
        channelOrder: 'RGB',
        tensorShape: info.shape,
        min, max, mean, std
    }, null, 2));
}

run().catch(console.error);
