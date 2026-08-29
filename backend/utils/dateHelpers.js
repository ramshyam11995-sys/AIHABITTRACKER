import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";

export const toDateKey = (date) => format(date, "yyyy-MM-dd");

export const todayKey = () => toDateKey(new Date());

export const last90Days = () => {
    const end = new Date();
    const start = subDays(end, 89);
    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const currentWeekKeys = () => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const lastNDays = (n) => {
    const end = new Date();
    const start = subDays(end, n - 1);
    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const calcStreak = (sortedDateKeys) => {
    if (!sortedDateKeys.length) return { current: 0, longest: 0 };
    
    const set = new Set(sortedDateKeys);
    const today = todayKey();
    const yesterday = toDateKey(subDays(new Date(), 1));

    // 1. Calculate Current Streak
    let current = 0;
    let cursor = new Date();
    
    // If user missed both today and yesterday, current streak is dead
    if (!set.has(today) && !set.has(yesterday)) {
        current = 0;
    } else {
        if (!set.has(today)) cursor = subDays(cursor, 1);
        while (set.has(toDateKey(cursor))) {
            current += 1;
            cursor = subDays(cursor, 1);
        }
    }

    // 2. Calculate Longest Streak (Fixed Time Zone & Logic Bug)
    let longest = 0;
    let run = 0;
    
    // Sort safely by parsing strings into actual timestamps
    const sortedAsc = [...set]
        .map(k => parseISO(k).getTime())
        .sort((a, b) => a - b);

    let prevTime = null;
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;

    for (const time of sortedAsc) {
        if (prevTime) {
            const diff = Math.round((time - prevTime) / ONE_DAY_MS);
            if (diff === 1) {
                run += 1;
            } else if (diff > 1) {
                run = 1; // Broken streak, reset to 1
            }
            // If diff is 0 (duplicate), we just ignore it and keep the run going
        } else {
            run = 1;
        }
        
        if (run > longest) longest = run;
        prevTime = time;
    }

    return { current, longest };
};
