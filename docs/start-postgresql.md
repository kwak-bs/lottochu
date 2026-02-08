# PostgreSQL 서버 수동 시작 방법

연결 오류(connection timeout)가 나면 PostgreSQL 서버가 꺼져 있는 상태입니다. 아래 중 하나로 켜주세요.

---

## 방법 1: Windows 서비스에서 시작 (권장)

1. **Win + R** → `services.msc` 입력 → Enter
2. 목록에서 **PostgreSQL** 관련 서비스 찾기  
   (이름 예: `postgresql-x64-17`, `PostgreSQL 17` 등)
3. 해당 서비스 **우클릭** → **시작**

---

## 방법 2: 명령 프롬프트(관리자)에서 서비스 시작

1. **시작 메뉴** → "cmd" 또는 "명령 프롬프트" 검색
2. **관리자 권한으로 실행**
3. 아래 명령 중 **실제 서비스 이름**에 맞는 것 실행:

```cmd
net start postgresql-x64-17
```

또는

```cmd
net start "PostgreSQL 17"
```

서비스 이름이 다르면 `services.msc`에서 표시 이름/이름을 확인한 뒤 그 이름으로 `net start "이름"` 실행.

---

## 방법 3: pg_ctl로 직접 시작

PostgreSQL이 **서비스로 등록되지 않은** 경우:

1. **명령 프롬프트(관리자)** 실행
2. 다음 명령 실행:

```cmd
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\17\data"
```

3. 몇 초 후 pgAdmin에서 다시 접속 시도

---

## 서비스 이름 확인

PowerShell에서:

```powershell
Get-Service | Where-Object { $_.DisplayName -like '*PostgreSQL*' -or $_.Name -like '*postgres*' }
```

출력된 **Name** 값을 사용해 `net start <Name>` 실행하면 됩니다.
