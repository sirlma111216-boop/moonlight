-- 학생 기기에서 만든 기록 ID 를 학생별로 구분한다(participant_id:clientId).
-- 앱 코드가 이 형식으로 읽고 쓰도록 바뀌었으므로, 예전 형식으로 저장된 행을 맞춰 준다.
UPDATE OR IGNORE observations SET id = participant_id || ':' || id
  WHERE substr(id, 1, length(participant_id) + 1) <> participant_id || ':';
UPDATE OR IGNORE public_data_snapshots SET id = participant_id || ':' || id
  WHERE substr(id, 1, length(participant_id) + 1) <> participant_id || ':';
UPDATE OR IGNORE model_attempts SET id = participant_id || ':' || id
  WHERE substr(id, 1, length(participant_id) + 1) <> participant_id || ':';
