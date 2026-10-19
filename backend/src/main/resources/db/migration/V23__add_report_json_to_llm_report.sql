-- LLM 리포트 v2: 서버 응답 result 전체를 원문 JSON 으로 보관한다.
--
-- score / interpretation / actions / notice / logicVersion 처럼 LLM 서버가 계속 늘려 가는 필드를
-- 컬럼마다 파지 않기 위한 선택이다. 기존 risk_detail_json / management_json / disclaimer 는
-- 앱이 쓰고 있어 그대로 두고, 이 컬럼만 추가한다.
--
-- 기존 행은 NULL 이며, 조회 시 v2 필드가 전부 null 로 내려간다(구버전 호환).
ALTER TABLE llm_report
    ADD COLUMN report_json LONGTEXT NULL AFTER disclaimer;
