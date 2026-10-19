-- UV 형광 치태 영역(/api/ai/predict/plaque-fluorescence)은 모델 검출이 아니라 색(적색 형광)
-- 기반 판정이라 confidence 개념 자체가 없다. 0.0 이나 1.0 같은 가짜 값을 채우면 모델이 실제로
-- 낮은 확신도로 잡은 병변과 구분할 수 없게 되므로 NULL 을 허용한다.
--
-- 기존 chk_analysis_detected_issue_confidence(0~1 범위) 체크는 그대로 둔다.
-- NULL 에 대한 비교는 UNKNOWN 이라 체크를 통과하므로, 값이 들어온 경우의 범위 검증은 유지된다.
ALTER TABLE analysis_detected_issue
    MODIFY COLUMN confidence DOUBLE NULL;
