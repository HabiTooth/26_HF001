-- 분석 결과 오버레이 이미지(PNG) 저장 경로. FastAPI report/generate 에 include_overlay=true 로 요청하면
-- 백색광 task 는 치석, UV task 는 치태를 그린 오버레이를 함께 돌려주고, Spring 이 이를 저장소에 올린 뒤
-- 경로를 여기 남긴다. 광원별로 scan_image 행이 따로 있으므로 이미지 행당 컬럼 하나면 된다.
-- 원본(s3_url)과 같은 상대 URL 형식(/uploads/<dir>/<file>)이며, 오버레이를 받지 못했거나(구버전 FastAPI)
-- 저장에 실패한 행은 NULL 로 남는다.
ALTER TABLE scan_image
    ADD COLUMN overlay_image_url VARCHAR(1000) NULL AFTER s3_url;
