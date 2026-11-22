# 스팀 찜목록 역대최저가

스팀 찜목록 전체를 한 화면에 모아 **지금 할인 중인지**, **스팀 역대 최저가인지**를 보여 주는 크롬 확장입니다.
가격 기준은 **스팀 스토어 · 한국 원화**입니다.

## 기능
- 찜목록 전체 표: 썸네일 · 개발사 · 태그 · 출시일 · 리뷰 · 스팀덱 지원 · 현재가/정가 · 할인율 · 역대 최저가 · 최저가 날짜 · 판정
- 판정: **역대 최저가** / **근접(10% 이내)** / 아님
- 필터: 전체 · 할인 중 · 역대 최저가만 · 스팀덱 가능만 / 열 제목 클릭으로 정렬
- 스팀 상품 페이지: 구매 버튼 위에 역대 최저가와 가격 변동 이력 패널 표시

## 설치
1. 이 페이지 오른쪽 **Releases**에서 `steam-wishlist-lowest.zip` 다운로드 후 압축 풀기
   (또는 초록색 **Code → Download ZIP**)
2. 크롬 주소창에 `chrome://extensions` 입력 → 오른쪽 위 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** → 압축 푼 폴더(`manifest.json`이 있는 폴더) 선택
4. 퍼즐 아이콘 → 이 확장 옆 핀을 눌러 툴바에 고정

## 처음 설정 (각자 1회)
### 1) IsThereAnyDeal API 키 발급 (무료)
1. https://isthereanydeal.com/apps/my/ 접속 → 로그인 (**Sign in through STEAM** 가능)
2. **Register App** → 앱 이름 아무거나 입력 → **Submit**
3. 오른쪽 **API Keys** 칸의 키 복사 (OAuth의 Client ID·Client Secret 아님)

> API 키는 각자 발급해서 쓰세요. 키는 내 브라우저에만 저장되고 어디에도 전송되지 않습니다(IsThereAnyDeal 조회 외).

### 2) 스팀 ID 확인
- 스팀 프로필 주소가 `steamcommunity.com/profiles/7656…`이면 그 17자리 숫자
- `steamcommunity.com/id/이름` 형태면 https://steamid.io/ 에서 **steamID64** 확인

### 3) 찜목록 공개
스팀 → 프로필 편집 → 공개 설정 → **게임 세부 정보: 공개** (찜목록이 여기에 포함)

### 4) 입력
확장 아이콘 클릭 → API 키 · 스팀 ID 입력 → **저장 후 불러오기**

## 참고
- 역대 최저가 데이터: [IsThereAnyDeal](https://isthereanydeal.com) API (스팀 스토어만, 한국 기준)
- 현재가 · 게임 정보 · 스팀덱 판정: 스팀 스토어 공개 정보
- 최저가는 6시간 캐시. 바로 갱신하려면 **최저가 새로고침**
- Valve · IsThereAnyDeal과 관계없는 개인 제작 도구입니다.

## 업데이트
새 버전 zip을 받아 기존 폴더에 덮어쓴 뒤 `chrome://extensions`에서 이 확장의 새로고침(↻)을 누르세요. 설정은 유지됩니다.
