-- =============================================
-- JLPT 集計最適化用ビュー (CPU負荷低減用)
-- =============================================

-- 1. レベル・試験回ごとの集計
CREATE OR REPLACE VIEW public.jlpt_session_summaries AS
SELECT 
    year_term AS session,
    (final_exam_data->>'level') AS level,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) AS examinees,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格') AS passers,
    CASE 
        WHEN COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格')::numeric / 
             COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) * 100), 1)
        ELSE 0 
    END AS pass_rate,
    CASE 
        WHEN COUNT(*) FILTER (WHERE final_exam_total > 0) > 0
        THEN ROUND(AVG(final_exam_total) FILTER (WHERE final_exam_total > 0)::numeric, 1)
        ELSE 0
    END AS average_score
FROM public.grade_records
WHERE year_term LIKE 'JLPT %'
GROUP BY year_term, final_exam_data->>'level';

-- 2. 国籍別の集計
CREATE OR REPLACE VIEW public.jlpt_nationality_summaries AS
SELECT 
    COALESCE(final_exam_data->>'country', 'Unknown') AS country,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) AS total,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格') AS passed,
    CASE 
        WHEN COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格')::numeric / 
             COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) * 100), 1)
        ELSE 0 
    END AS pass_rate
FROM public.grade_records
WHERE year_term LIKE 'JLPT %'
GROUP BY final_exam_data->>'country';

-- 3. 年度別の合格率推移
CREATE OR REPLACE VIEW public.jlpt_yearly_trends AS
SELECT 
    SUBSTRING(year_term FROM 6 FOR 4) AS year,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) AS total,
    COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格') AS passed,
    CASE 
        WHEN COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE final_exam_data->>'result' = '合格')::numeric / 
             COUNT(*) FILTER (WHERE final_exam_data->>'result' IN ('合格', '不合格')) * 100), 1)
        ELSE 0 
    END AS pass_rate
FROM public.grade_records
WHERE year_term LIKE 'JLPT %'
GROUP BY SUBSTRING(year_term FROM 6 FOR 4);

-- 4. 権限設定 (authenticatedユーザーに公開)
GRANT SELECT ON public.jlpt_session_summaries TO authenticated;
GRANT SELECT ON public.jlpt_nationality_summaries TO authenticated;
GRANT SELECT ON public.jlpt_yearly_trends TO authenticated;
