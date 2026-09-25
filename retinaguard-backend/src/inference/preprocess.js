'use strict';
const sharp = require('sharp');

const INPUT_SIZE = 384;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

async function preprocessImage(imagePath) {
    // Read with sharp, resize, remove alpha, ensure 3 channels (RGB)
    const { data, info } = await sharp(imagePath)
        .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill', kernel: 'linear' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    
    // Output from sharp is HWC uint8
    const chwArray = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    
    // Convert to CHW and apply ImageNet normalization
    let isValid = true;
    for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
            const inIdx = (y * INPUT_SIZE + x) * 3;
            for (let c = 0; c < 3; c++) {
                let val = data[inIdx + c] / 255.0;
                val = (val - MEAN[c]) / STD[c];
                
                if (!Number.isFinite(val)) isValid = false;
                
                const outIdx = c * INPUT_SIZE * INPUT_SIZE + (y * INPUT_SIZE + x);
                chwArray[outIdx] = val;
            }
        }
    }

    if (!isValid) {
        throw new Error('Preprocessed tensor contains NaN/Inf');
    }

    return {
        tensor: chwArray,
        metadata: {
            inputWidth: info.width, // this is the original width? No, sharp info returns resized dimensions if resize is before raw. Actually, sharp `info` after `toBuffer` is the output info.
            inputHeight: info.height,
            channels: 3,
            dtype: 'float32',
            shape: [1, 3, INPUT_SIZE, INPUT_SIZE],
            version: 'imagenet_standard_1.0'
        }
    };
}

module.exports = { preprocessImage };
