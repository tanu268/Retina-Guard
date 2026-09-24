const cv = require('@techstark/opencv-js');

async function run() {
    console.log("Loading cv...");
    if (cv instanceof Promise) {
        cv = await cv;
    }
    console.log("morphologyEx:", typeof cv.morphologyEx);
    console.log("connectedComponentsWithStats:", typeof cv.connectedComponentsWithStats);
    console.log("GaussianBlur:", typeof cv.GaussianBlur);
    console.log("imread:", typeof cv.imread);
    
    // Some versions expose it directly, some through a namespace.
    // Let's print keys if it's undefined
    if (typeof cv.morphologyEx === 'undefined') {
        console.log("Keys in cv:", Object.keys(cv).slice(0, 50));
    }
}

run();
