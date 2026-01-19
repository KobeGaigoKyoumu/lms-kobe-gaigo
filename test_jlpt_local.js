const { getEnhancedJlptStats, getAllRawJlptData } = require('./src/lib/jlpt');
const path = require('path');
const fs = require('fs');

// Mock process.cwd
process.cwd = () => __dirname;

async function test() {
    console.log("Testing getAllRawJlptData...");
    const raw = await getAllRawJlptData();
    console.log(`Raw data count: ${raw.length}`);
    if (raw.length > 0) {
        console.log("First record:", raw[0]);
    }

    console.log("\nTesting getEnhancedJlptStats (no students)...");
    const stats = await getEnhancedJlptStats([]);
    console.log("Overall N3+ Rate:", stats.overallN3PlusRate);
    console.log("Graduation Rates:", stats.graduationN3PlusRates);

    // Mock some students
    const mockStudents = [
        { full_name: "NGUYEN VAN A", enrollment_date: "2023-04-01" },
        // Add a name that exists in your CSV if known
    ];

    console.log("\nTesting getEnhancedJlptStats (with mock students)...");
    const statsWithStudents = await getEnhancedJlptStats(mockStudents);
    console.log("Overall N3+ Rate (filtered):", statsWithStudents.overallN3PlusRate);
}

test().catch(console.error);
