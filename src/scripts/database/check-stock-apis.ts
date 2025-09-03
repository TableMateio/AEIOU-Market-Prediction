#!/usr/bin/env npx tsx

/**
 * Check Stock API Configuration
 * 
 * Simple test to see which stock APIs are configured and working
 */

import * as dotenv from 'dotenv';
dotenv.config();

async function checkAPIs() {
    console.log('🔍 Checking stock API configurations...\n');

    const apis = {
        polygon: process.env.POLYGON_API_KEY,
        tiingo: process.env.TIINGO_API_KEY,
        alpaca: process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET
    };

    console.log('📊 API Status:');
    Object.entries(apis).forEach(([name, configured]) => {
        console.log(`   ${configured ? '✅' : '❌'} ${name.toUpperCase()}: ${configured ? 'Configured' : 'Missing'}`);
    });

    // Find the best option
    const available = Object.entries(apis).filter(([name, configured]) => configured);

    if (available.length === 0) {
        console.log('\n❌ No stock APIs configured!');
        return null;
    }

    // Polygon is our preferred choice per documentation
    const preferred = available.find(([name]) => name === 'polygon') || available[0];
    console.log(`\n🎯 Using: ${preferred[0].toUpperCase()} for 1-week test`);

    return preferred[0];
}

if (require.main === module) {
    checkAPIs();
}
