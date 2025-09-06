/**
 * Market Hours Service
 * 
 * Determines market hours, handles weekends/holidays, finds nearest trading times
 * Based on ML training data calculation logic from python/feature_config.py
 */

export interface MarketSession {
    isMarketOpen: boolean;
    isExtendedHours: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    nearestMarketOpen: Date;
    nearestMarketClose: Date;
    tradingDay: Date;
}

export class MarketHoursService {

    // US Market holidays (simplified - you may want to expand this)
    private static MARKET_HOLIDAYS_2024_2025 = [
        '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
        '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
        '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
        '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'
    ];

    /**
     * Analyze market conditions for a given timestamp
     */
    static analyzeMarketSession(timestamp: Date): MarketSession {
        const utcTime = new Date(timestamp);

        // Convert to ET (market timezone) - simplified (doesn't handle DST perfectly)
        const etOffset = -5; // EST, adjust for EDT (-4) as needed
        const etTime = new Date(utcTime.getTime() + (etOffset * 60 * 60 * 1000));

        const dayOfWeek = etTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
        const hour = etTime.getUTCHours();
        const minute = etTime.getUTCMinutes();
        const timeInMinutes = hour * 60 + minute;

        const dateString = etTime.toISOString().split('T')[0];

        // Check if weekend
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check if holiday
        const isHoliday = this.MARKET_HOLIDAYS_2024_2025.includes(dateString);

        // Market hours (ET)
        const preMarketStart = 4 * 60;      // 4:00 AM ET
        const regularStart = 9 * 60 + 30;   // 9:30 AM ET  
        const regularEnd = 16 * 60;         // 4:00 PM ET
        const afterHoursEnd = 20 * 60;      // 8:00 PM ET

        const isExtendedHours = !isWeekend && !isHoliday && (
            (timeInMinutes >= preMarketStart && timeInMinutes < regularStart) ||
            (timeInMinutes >= regularEnd && timeInMinutes < afterHoursEnd)
        );

        const isMarketOpen = !isWeekend && !isHoliday && (
            timeInMinutes >= regularStart && timeInMinutes < regularEnd
        );

        return {
            isMarketOpen,
            isExtendedHours,
            isWeekend,
            isHoliday,
            nearestMarketOpen: new Date(), // Placeholder - will be computed separately if needed
            nearestMarketClose: new Date(), // Placeholder - will be computed separately if needed
            tradingDay: this.findTradingDay(utcTime)
        };
    }

    /**
     * Find the nearest market open time (9:30 AM ET) - NON-RECURSIVE VERSION
     */
    static findNearestMarketOpen(timestamp: Date): Date {
        const utcTime = new Date(timestamp);
        
        // Convert to ET
        const etOffset = -5; // EST
        const etTime = new Date(utcTime.getTime() + (etOffset * 60 * 60 * 1000));
        
        const dayOfWeek = etTime.getUTCDay();
        const dateString = etTime.toISOString().split('T')[0];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.MARKET_HOLIDAYS_2024_2025.includes(dateString);
        
        // Set to 9:30 AM ET (14:30 UTC)
        const openTime = new Date(utcTime);
        openTime.setUTCHours(14, 30, 0, 0);
        
        // If it's weekend or holiday, find next trading day
        if (isWeekend || isHoliday) {
            return this.findNextTradingDay(openTime, 'open');
        }
        
        // If current time is before 9:30 AM ET, use today's open
        const currentHour = utcTime.getUTCHours();
        if (currentHour < 14 || (currentHour === 14 && utcTime.getUTCMinutes() < 30)) {
            return openTime;
        }
        
        // Otherwise, use next trading day's open
        return this.findNextTradingDay(utcTime, 'open');
    }

    /**
     * Find the nearest market close time (4:00 PM ET) - NON-RECURSIVE VERSION
     */
    static findNearestMarketClose(timestamp: Date): Date {
        const utcTime = new Date(timestamp);
        
        // Convert to ET
        const etOffset = -5; // EST
        const etTime = new Date(utcTime.getTime() + (etOffset * 60 * 60 * 1000));
        
        const dayOfWeek = etTime.getUTCDay();
        const dateString = etTime.toISOString().split('T')[0];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.MARKET_HOLIDAYS_2024_2025.includes(dateString);
        
        // Set to 4:00 PM ET (21:00 UTC)
        const closeTime = new Date(utcTime);
        closeTime.setUTCHours(21, 0, 0, 0);
        
        // If it's weekend or holiday, find previous trading day
        if (isWeekend || isHoliday) {
            return this.findPreviousTradingDay(closeTime, 'close');
        }
        
        // If current time is after 4:00 PM ET, use today's close
        const currentHour = utcTime.getUTCHours();
        if (currentHour > 21 || (currentHour === 21 && utcTime.getUTCMinutes() >= 0)) {
            return closeTime;
        }
        
        // Otherwise, use previous trading day's close
        return this.findPreviousTradingDay(utcTime, 'close');
    }

    /**
     * Find the trading day for this timestamp
     */
    private static findTradingDay(timestamp: Date): Date {
        const date = new Date(timestamp);
        const dayOfWeek = date.getUTCDay();

        // If weekend, adjust to Friday (5) or Monday (1)
        if (dayOfWeek === 0) { // Sunday -> Monday
            date.setUTCDate(date.getUTCDate() + 1);
        } else if (dayOfWeek === 6) { // Saturday -> Friday
            date.setUTCDate(date.getUTCDate() - 1);
        }

        return date;
    }

    /**
     * Find next trading day
     */
    private static findNextTradingDay(timestamp: Date, session: 'open' | 'close'): Date {
        const date = new Date(timestamp);
        let daysToAdd = 1;

        // Keep adding days until we find a trading day
        do {
            date.setUTCDate(date.getUTCDate() + daysToAdd);
            daysToAdd = 1;
        } while (this.isNonTradingDay(date));

        // Set to market open or close
        if (session === 'open') {
            date.setUTCHours(14, 30, 0, 0); // 9:30 AM ET
        } else {
            date.setUTCHours(21, 0, 0, 0); // 4:00 PM ET
        }

        return date;
    }

    /**
     * Find previous trading day
     */
    private static findPreviousTradingDay(timestamp: Date, session: 'open' | 'close'): Date {
        const date = new Date(timestamp);
        let daysToSubtract = 1;

        // Keep subtracting days until we find a trading day
        do {
            date.setUTCDate(date.getUTCDate() - daysToSubtract);
            daysToSubtract = 1;
        } while (this.isNonTradingDay(date));

        // Set to market open or close
        if (session === 'open') {
            date.setUTCHours(14, 30, 0, 0); // 9:30 AM ET
        } else {
            date.setUTCHours(21, 0, 0, 0); // 4:00 PM ET
        }

        return date;
    }

    /**
     * Check if a date is a non-trading day
     */
    private static isNonTradingDay(date: Date): boolean {
        const dayOfWeek = date.getUTCDay();
        const dateString = date.toISOString().split('T')[0];

        return dayOfWeek === 0 || dayOfWeek === 6 || this.MARKET_HOLIDAYS_2024_2025.includes(dateString);
    }

    /**
     * Get the strategy for finding stock data based on article timestamp
     */
    static getStockDataStrategy(articleTimestamp: Date): {
        strategy: 'exact' | 'previous_close' | 'next_open';
        targetTimestamp: Date;
        reasoning: string;
    } {
        const session = this.analyzeMarketSession(articleTimestamp);

        if (session.isMarketOpen) {
            return {
                strategy: 'exact',
                targetTimestamp: articleTimestamp,
                reasoning: 'Article published during market hours - use exact timestamp'
            };
        }

        if (session.isExtendedHours) {
            return {
                strategy: 'exact',
                targetTimestamp: articleTimestamp,
                reasoning: 'Article published during extended hours - use exact timestamp'
            };
        }

        if (session.isWeekend || session.isHoliday) {
            // For weekend/holiday articles, use previous Friday's close
            return {
                strategy: 'previous_close',
                targetTimestamp: session.nearestMarketClose,
                reasoning: `Article published on ${session.isWeekend ? 'weekend' : 'holiday'} - use previous trading day close`
            };
        }

        // For after-hours weekday articles, use next day's open
        return {
            strategy: 'next_open',
            targetTimestamp: session.nearestMarketOpen,
            reasoning: 'Article published after hours - use next trading day open'
        };
    }
}
