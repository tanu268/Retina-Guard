'use strict';
const sharp = require('sharp');
const cvBase = require('@techstark/opencv-js');

let cv = null;

async function getCv() {
    if (cv) return cv;
    let cvInst = cvBase;
    if (cvInst instanceof Promise) cvInst = await cvInst;
    if (!cvInst.morphologyEx) {
        await new Promise(resolve => {
            cvInst.onRuntimeInitialized = resolve;
        });
    }
    cv = cvInst;
    return cv;
}

const MASK_THRESHOLD = 10;
const CROP_PADDING = 5;
const ILLUMINATION_MASK_THRESHOLD = 5;
const INPUT_SIZE = 384;
const BLUR_KERNEL = 101;
const FROZEN_MEAN = [0.5349806816307564, 0.28220984649945235, 0.08492041400629491];
const FROZEN_STD = [0.156245401744425, 0.08246304756518061, 0.06740699565264736];

function getMedian(arr) {
    if (arr.length === 0) return 0;
    arr.sort();
    const half = Math.floor(arr.length / 2);
    if (arr.length % 2 === 0) return (arr[half - 1] + arr[half]) / 2.0;
    return arr[half];
}

async function preprocessImage(imagePath) {
    const cv = await getCv();
    
    // Read with sharp, ensure 3 channels (RGB)
    const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    
    let image_rgb = cv.matFromArray(info.height, info.width, cv.CV_8UC3, data);

    // 1. MASK (Phase 2A)
    let gray = new cv.Mat();
    cv.cvtColor(image_rgb, gray, cv.COLOR_RGB2GRAY);

    let mask = new cv.Mat();
    cv.threshold(gray, mask, MASK_THRESHOLD, 255, cv.THRESH_BINARY);

    let kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    kernel.delete();

    let labels = new cv.Mat();
    let stats = new cv.Mat();
    let centroids = new cv.Mat();
    let num_labels = cv.connectedComponentsWithStats(mask, labels, stats, centroids, 8, cv.CV_32S);

    let largest_component = 0;
    let max_area = 0;
    for (let i = 1; i < num_labels; i++) {
        let area = stats.intPtr(i, cv.CC_STAT_AREA)[0];
        if (area > max_area) {
            max_area = area;
            largest_component = i;
        }
    }

    let final_mask = new cv.Mat(mask.rows, mask.cols, cv.CV_8UC1);
    let y_min = mask.rows, y_max = 0, x_min = mask.cols, x_max = 0;
    
    let labelsData = labels.data32S;
    let finalMaskData = final_mask.data;
    
    for (let y = 0; y < mask.rows; y++) {
        for (let x = 0; x < mask.cols; x++) {
            let idx = y * mask.cols + x;
            if (labelsData[idx] === largest_component) {
                finalMaskData[idx] = 255;
                if (x < x_min) x_min = x;
                if (x > x_max) x_max = x;
                if (y < y_min) y_min = y;
                if (y > y_max) y_max = y;
            } else {
                finalMaskData[idx] = 0;
            }
        }
    }

    if (max_area === 0) {
        throw new Error('Fundus mask is empty');
    }

    x_min = Math.max(0, x_min - CROP_PADDING);
    x_max = Math.min(mask.cols, x_max + CROP_PADDING + 1);
    y_min = Math.max(0, y_min - CROP_PADDING);
    y_max = Math.min(mask.rows, y_max + CROP_PADDING + 1);

    // Crop
    let rect = new cv.Rect(x_min, y_min, x_max - x_min, y_max - y_min);
    let cropped_image = image_rgb.roi(rect);
    let cropped_gray = gray.roi(rect);
    
    // 2. ILLUMINATION (Phase 2B)
    let channels = new cv.MatVector();
    cv.split(cropped_image, channels);
    
    let normalized = new cv.Mat(cropped_image.rows, cropped_image.cols, cv.CV_32FC3);
    
    for (let c = 0; c < 3; c++) {
        let channel = channels.get(c);
        let channelFloat = new cv.Mat();
        channel.convertTo(channelFloat, cv.CV_32F);
        
        let illumination = new cv.Mat();
        cv.GaussianBlur(channelFloat, illumination, new cv.Size(BLUR_KERNEL, BLUR_KERNEL), 0, 0, cv.BORDER_DEFAULT);
        
        // Compute median
        let validPixels = [];
        let croppedGrayData = cropped_gray.data;
        let illuminationData = illumination.data32F;
        let channelFloatData = channelFloat.data32F;
        let normalizedData = normalized.data32F;
        
        for (let y = 0; y < cropped_gray.rows; y++) {
            for (let x = 0; x < cropped_gray.cols; x++) {
                let idx = y * cropped_gray.cols + x;
                if (croppedGrayData[idx] > ILLUMINATION_MASK_THRESHOLD) {
                    validPixels.push(illuminationData[idx]);
                }
            }
        }
        
        if (validPixels.length === 0) {
            throw new Error('No valid illumination pixels found');
        }
        
        let reference = getMedian(new Float32Array(validPixels));
        
        // Apply correction
        for (let y = 0; y < cropped_image.rows; y++) {
            for (let x = 0; x < cropped_image.cols; x++) {
                let idx = y * cropped_image.cols + x;
                if (croppedGrayData[idx] > ILLUMINATION_MASK_THRESHOLD) {
                    let illumVal = illuminationData[idx];
                    let cVal = channelFloatData[idx];
                    let corrected = cVal * (reference / (illumVal + 1e-6));
                    normalizedData[idx * 3 + c] = corrected; // CV_32FC3
                } else {
                    normalizedData[idx * 3 + c] = 0;
                }
            }
        }
        
        channel.delete();
        channelFloat.delete();
        illumination.delete();
    }
    channels.delete();
    
    // Clip and cast to uint8
    let normalized_uint8 = new cv.Mat();
    let lowerBound = new cv.Mat(normalized.rows, normalized.cols, normalized.type(), new cv.Scalar(0, 0, 0));
    let upperBound = new cv.Mat(normalized.rows, normalized.cols, normalized.type(), new cv.Scalar(255, 255, 255));
    
    // cv.min/max logic for clipping
    let temp1 = new cv.Mat();
    cv.max(normalized, lowerBound, temp1);
    let temp2 = new cv.Mat();
    cv.min(temp1, upperBound, temp2);
    temp2.convertTo(normalized_uint8, cv.CV_8U);
    
    temp1.delete();
    temp2.delete();
    lowerBound.delete();
    upperBound.delete();
    
    // Resize (cv2.INTER_AREA)
    let resized = new cv.Mat();
    cv.resize(normalized_uint8, resized, new cv.Size(INPUT_SIZE, INPUT_SIZE), 0, 0, cv.INTER_AREA);
    
    // Convert to CHW Float32Array and normalize
    const chwArray = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    let isValid = true;
    let resizedData = resized.data; // CV_8UC3 -> 1 byte per channel -> array of flat values

    for (let c = 0; c < 3; c++) {
        for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
            let val = resizedData[i * 3 + c] / 255.0;
            val = (val - FROZEN_MEAN[c]) / FROZEN_STD[c];
            if (!Number.isFinite(val)) isValid = false;
            
            const outIdx = c * INPUT_SIZE * INPUT_SIZE + i;
            chwArray[outIdx] = val;
        }
    }

    if (!isValid) {
        throw new Error('Preprocessed tensor contains NaN/Inf');
    }

    // Cleanup
    image_rgb.delete();
    gray.delete();
    mask.delete();
    labels.delete();
    stats.delete();
    centroids.delete();
    final_mask.delete();
    cropped_image.delete();
    cropped_gray.delete();
    normalized.delete();
    normalized_uint8.delete();
    resized.delete();

    return {
        tensor: chwArray,
        metadata: {
            inputWidth: info.width,
            inputHeight: info.height,
            channels: 3,
            dtype: 'float32',
            shape: [1, 3, INPUT_SIZE, INPUT_SIZE],
            version: 'baseline_1.2_opencv_exact'
        }
    };
}

module.exports = { preprocessImage };
