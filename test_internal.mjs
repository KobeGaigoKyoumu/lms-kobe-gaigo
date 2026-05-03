import { getGradeAnalyticsDataInternal } from './src/app/actions/gradeAnalytics.js';
import { getJlptAnalyticsDataInternal } from './src/app/actions/jlpt.js';

async function run() {
    try {
        console.log('Testing grade analytics...');
        const gradeRes = await getGradeAnalyticsDataInternal();
        console.log('Grade:', gradeRes?.data?.length);

        console.log('Testing jlpt analytics...');
        const jlptRes = await getJlptAnalyticsDataInternal();
        console.log('JLPT:', jlptRes?.stats?.length, jlptRes?.enhanced?.stats?.length);
    } catch (e) {
        console.error(e);
    }
}
run();
