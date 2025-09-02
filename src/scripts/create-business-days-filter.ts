#!/usr/bin/env npx tsx

/**
 * Business days filter for smart article collection
 */

// Major US stock market holidays (NYSE/NASDAQ closed)
const MARKET_HOLIDAYS_2022_2025 = [
    // 2022
    '2022-01-17', '2022-02-21', '2022-04-15', '2022-05-30', '2022-06-20', '2022-07-04',
    '2022-09-05', '2022-11-24', '2022-12-26',
    // 2023  
    '2023-01-02', '2023-01-16', '2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19',
    '2023-07-04', '2023-09-04', '2023-11-23', '2023-12-25',
    // 2024
    '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19',
    '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
    // 2025
    '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19',
    '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'
];

export class BusinessDaysFilter {
    private holidays: Set<string>;

    constructor() {
        this.holidays = new Set(MARKET_HOLIDAYS_2022_2025);
    }

    /**
     * Check if a date is a business day (Monday-Friday, not a holiday)
     */
    isBusinessDay(date: Date): boolean {
        const dayOfWeek = date.getDay();

        // Check if weekend (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }

        // Check if holiday
        const dateString = date.toISOString().split('T')[0];
        if (this.holidays.has(dateString)) {
            return false;
        }

        return true;
    }

    /**
     * Generate business days between two dates
     */
    getBusinessDaysBetween(startDate: Date, endDate: Date): Date[] {
        const businessDays: Date[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            if (this.isBusinessDay(currentDate)) {
                businessDays.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return businessDays;
    }

    /**
     * Generate strategic sampling of business days across a time period
     */
    generateStrategicSampling(startDate: Date, endDate: Date, targetDays: number): Date[] {
        const allBusinessDays = this.getBusinessDaysBetween(startDate, endDate);

        if (allBusinessDays.length <= targetDays) {
            return allBusinessDays;
        }

        // Distribute evenly across the time period
        const interval = Math.floor(allBusinessDays.length / targetDays);
        const sampledDays: Date[] = [];

        for (let i = 0; i < targetDays; i++) {
            const index = i * interval;
            if (index < allBusinessDays.length) {
                sampledDays.push(allBusinessDays[index]);
            }
        }

        return sampledDays;
    }

    /**
     * Get high-priority business days (earnings season, product launches)
     */
    getHighPriorityDates(): Date[] {
        // Apple earnings dates and major product events (approximate)
        const priorityDates = [
            // 2024 Q4 earnings and events
            '2024-11-01', '2024-10-28', '2024-09-09', '2024-07-25',
            // 2024 Q3 earnings and WWDC
            '2024-06-10', '2024-05-02', '2024-04-25', '2024-01-25',
            // 2023 major events
            '2023-11-02', '2023-10-30', '2023-09-12', '2023-08-03',
            '2023-06-05', '2023-05-04', '2023-02-02', '2023-01-26',
            // 2022 major events  
            '2022-10-27', '2022-09-07', '2022-07-28', '2022-06-06',
            '2022-04-28', '2022-01-27'
        ];

        return priorityDates
            .map(dateStr => new Date(dateStr))
            .filter(date => this.isBusinessDay(date));
    }

    /**
     * Create optimal collection schedule
     */
    createCollectionSchedule(options: {
        totalArticlesTarget: number;
        articlesPerDay: number;
        prioritizeRecent: boolean;
        includeHighPriorityEvents: boolean;
    }): { date: Date; articlesTarget: number; priority: 'high' | 'medium' | 'low' }[] {

        const { totalArticlesTarget, articlesPerDay, prioritizeRecent, includeHighPriorityEvents } = options;
        const daysNeeded = Math.ceil(totalArticlesTarget / articlesPerDay);

        const schedule: { date: Date; articlesTarget: number; priority: 'high' | 'medium' | 'low' }[] = [];

        // Add high priority dates first
        if (includeHighPriorityEvents) {
            const priorityDates = this.getHighPriorityDates();
            for (const date of priorityDates.slice(0, Math.min(10, daysNeeded))) {
                schedule.push({
                    date,
                    articlesTarget: articlesPerDay * 2, // Double articles for high priority days
                    priority: 'high'
                });
            }
        }

        // Fill remaining days
        const remainingDays = daysNeeded - schedule.length;
        if (remainingDays > 0) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (prioritizeRecent ? 90 : 365)); // 3 months or 1 year

            const strategicDays = this.generateStrategicSampling(startDate, endDate, remainingDays);

            for (const date of strategicDays) {
                // Skip if already in schedule
                if (!schedule.some(item => item.date.toDateString() === date.toDateString())) {
                    schedule.push({
                        date,
                        articlesTarget: articlesPerDay,
                        priority: prioritizeRecent && this.isRecent(date, 30) ? 'medium' : 'low'
                    });
                }
            }
        }

        // Sort by date (most recent first if prioritizing recent)
        return schedule.sort((a, b) => {
            return prioritizeRecent ?
                b.date.getTime() - a.date.getTime() :
                a.date.getTime() - b.date.getTime();
        });
    }

    private isRecent(date: Date, days: number): boolean {
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= days;
    }
}

// Test the business days filter
async function testBusinessDaysFilter() {
    console.log('📅 Testing Business Days Filter\n');

    const filter = new BusinessDaysFilter();

    // Test specific dates
    const testDates = [
        new Date('2024-09-02'), // Monday
        new Date('2024-09-07'), // Saturday  
        new Date('2024-07-04'), // July 4th holiday
        new Date('2024-09-03'), // Tuesday (business day)
    ];

    console.log('🔍 Testing specific dates:');
    testDates.forEach(date => {
        const isBusinessDay = filter.isBusinessDay(date);
        console.log(`   ${date.toDateString()}: ${isBusinessDay ? '✅ Business Day' : '❌ Not Business Day'}`);
    });

    // Test business days in a week
    console.log('\n📊 Business days in last week:');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const businessDays = filter.getBusinessDaysBetween(startDate, endDate);
    console.log(`   Found ${businessDays.length} business days:`);
    businessDays.forEach(date => {
        console.log(`   • ${date.toDateString()}`);
    });

    // Test strategic sampling
    console.log('\n🎯 Strategic sampling (last 30 days, target 10 days):');
    const samplingStart = new Date();
    samplingStart.setDate(samplingStart.getDate() - 30);

    const sampledDays = filter.generateStrategicSampling(samplingStart, endDate, 10);
    sampledDays.forEach(date => {
        console.log(`   • ${date.toDateString()}`);
    });

    // Test collection schedule
    console.log('\n📋 Optimal collection schedule:');
    const schedule = filter.createCollectionSchedule({
        totalArticlesTarget: 500,
        articlesPerDay: 25,
        prioritizeRecent: true,
        includeHighPriorityEvents: true
    });

    console.log(`   Generated schedule for ${schedule.length} collection days:`);
    schedule.slice(0, 10).forEach(item => {
        console.log(`   • ${item.date.toDateString()}: ${item.articlesTarget} articles (${item.priority} priority)`);
    });

    console.log(`\n💡 Total articles planned: ${schedule.reduce((sum, item) => sum + item.articlesTarget, 0)}`);
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testBusinessDaysFilter();
}
