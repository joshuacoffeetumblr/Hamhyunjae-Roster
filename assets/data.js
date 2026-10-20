// 초기 연명부 데이터 (예시). 실제 구성원으로 교체하거나, 화면의 '내보내기'로 받은 JSON을 이 배열에 붙여넣으세요.
// group: "2차생" | "1차생", deferred: 유예과목 수 (없으면 null), studyMonths: 수험기간(개월), age: 나이
window.SEED_MEMBERS = [
  {
    id: "m1", name: "홍길동", group: "2차생", dept: "경영학부", year: "20", age: 26,
    deferred: 2, studyMonths: 30,
    education: ["경북대학교 / 경영학부 / 2020.03~"],
    activities: ["함현재 회장 / 2025.03~2026.02"],
    certificates: ["TOEIC 945 / ETS / 2024.08"]
  },
  {
    id: "m2", name: "김하늘", group: "2차생", dept: "경제통상학부", year: "21", age: 25,
    deferred: 3, studyMonths: 24,
    education: ["경북대학교 / 경제통상학부 / 2021.03~"],
    activities: [],
    certificates: ["회계관리 1급 / 삼일회계법인 / 2023.11"]
  },
  {
    id: "m3", name: "최유나", group: "2차생", dept: "행정학부", year: "20", age: 27,
    deferred: 1, studyMonths: 36,
    education: ["경북대학교 / 행정학부 / 2020.03~"],
    activities: ["함현재 총무 / 2024.03~2025.02"],
    certificates: []
  },
  {
    id: "m4", name: "이서준", group: "1차생", dept: "경영학부", year: "23", age: 22,
    deferred: null, studyMonths: 8,
    education: ["경북대학교 / 경영학부 / 2023.03~"],
    activities: [], certificates: []
  },
  {
    id: "m5", name: "박지민", group: "1차생", dept: "회계학과", year: "24", age: 21,
    deferred: null, studyMonths: 5,
    education: ["경북대학교 / 회계학과 / 2024.03~"],
    activities: [],
    certificates: ["전산회계 1급 / 한국세무사회 / 2025.06"]
  },
  {
    id: "m6", name: "정도윤", group: "1차생", dept: "통계학과", year: "22", age: 24,
    deferred: null, studyMonths: 12,
    education: ["경북대학교 / 통계학과 / 2022.03~"],
    activities: ["교환학생(CSULB) / 2024.01~2024.05"],
    certificates: []
  }
];
