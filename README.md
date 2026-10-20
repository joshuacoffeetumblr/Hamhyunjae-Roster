# 함현재 연명부

함현재 구성원 연명부 웹페이지입니다. 별도 서버 없이 GitHub Pages로 배포할 수 있는 정적 사이트입니다.

- 이름·학과·회사 통합 검색, 전체/현업자 전환, 학과·학번·업종 필터
- 카드 / 목록 / 표 보기 (표는 열 머리글을 눌러 정렬)
- 인원 등록·수정·삭제 (이 브라우저의 localStorage에 저장)
- JSON 내보내기 / 가져오기

## 데이터 관리

기본 데이터는 `assets/data.js`의 `SEED_MEMBERS` 배열입니다. 화면에서 수정한 내용은 해당 브라우저에만 저장되므로,
모두가 같은 연명부를 보려면 '내보내기'로 받은 JSON 내용을 `assets/data.js`의 배열에 붙여넣고 커밋하세요.

## 배포

GitHub 저장소 Settings → Pages → Branch를 `master` / `(root)`로 지정하면 `https://<계정>.github.io/Hamhyunjae-Roster/`에서 열립니다.
