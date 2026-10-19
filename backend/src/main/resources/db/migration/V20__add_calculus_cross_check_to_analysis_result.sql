-- FastAPI v12: UV 형광 치태 분석의 백색광 치석 2차 검증(§5.3) 진단 정보 저장.
--   applied / sourceTaskId / matchedTeeth / unmatchedTeeth / reason / calculusPixels
--   + teeth[{areaId, toothNumber, calculusExcludedPixels}] (치아별로 치태 후보에서 뺀 치석 픽셀 수)
-- UV 이미지 행에만 채워지고 백색광 행과 기존 행은 NULL 로 남는다.
-- applied=false 인 경우 reason 으로 원인(백색광 미촬영/분석 실패 등)을 추적하는 용도다.
ALTER TABLE analysis_result
    ADD COLUMN calculus_cross_check_json TEXT NULL AFTER total_plaque_ratio;
