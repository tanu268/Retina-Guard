const cv = require('@techstark/opencv-js');

async function test() {
    let cvInst = cv;
    if (cvInst instanceof Promise) {
        cvInst = await cvInst;
    }
    
    // Wait for runtime to initialize if it's not ready
    if (!cvInst.morphologyEx) {
        await new Promise(resolve => {
            cvInst.onRuntimeInitialized = resolve;
        });
    }
    
    console.log("morphologyEx ready:", typeof cvInst.morphologyEx);
}

test().catch(console.error);
