# AI Design Pro 🎨

AI Design Pro는 Google Gemini AI를 활용하여 이미지 내의 텍스트를 마법처럼 제거하고, 새로운 텍스트와 이미지 레이어를 추가하여 나만의 디자인으로 재구성할 수 있는 지능형 레이아웃 에디터입니다.

## ✨ 주요 기능

- **자동 텍스트 제거**: 이미지를 업로드하면 AI가 자동으로 배경을 유지하며 텍스트만 깔끔하게 지워줍니다.
- **정밀 지우개 (Eraser Mode)**: AI가 놓친 부분이나 특정 영역을 브러시로 칠하고 AI Prompt로 정밀하게 수정할 수 있습니다.
- **멀티 모델 지원 (Gemini)**: 사용자의 용도에 따라 Gemini 3 Pro, Flash 등 다양한 구글 AI 모델을 선택하여 사용할 수 있습니다.
- **레이어 에디터**: 새로운 텍스트를 입력하거나 이미지를 추가하고, 드래그 앤 드롭으로 자유롭게 배치 및 크기를 조절할 수 있습니다.
- **고화질 다운로드**: 완성된 디자인을 PNG, JPG, WEBP 포맷으로 저장할 수 있습니다.

## 🛠 기술 스택

- **Frontend**: React (TypeScript), Vite, Vanilla CSS (TailwindCSS 미사용)
- **AI Integration**: Google Gemini AI API
- **Deployment**: GitHub Pages (GitHub Actions 자동 배포 구축)

## 🚀 시작하기

### 1. 로컬에서 실행하기

의존성을 설치하고 개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

### 2. 서비스 사용 설정

1. 사이드바의 **AI Settings** 섹션을 클릭합니다.
2. 자신의 [Google AI API Key](https://aistudio.google.com/app/apikey)를 입력합니다.
3. **[검증]** 버튼을 눌러 유효성을 확인합니다. (키는 브라우저에 안전하게 저장됩니다.)
4. 원하는 모델을 선택하고 디자인 작업을 시작하세요!

## 📦 배포 안내

이 프로젝트는 GitHub Actions를 통해 자동으로 배포되도록 설정되어 있습니다.

- `main` 브랜치에 코드를 `push`하면 자동으로 빌드되어 `github-pages` 브랜치로 배포됩니다.
- 배포 설정은 [deploy.yml](.github/workflows/deploy.yml) 및 [vite.config.ts](vite.config.ts)에서 확인하실 수 있습니다.

---

## 🏢 아크랩스 (AK LABS) 소개

**아크랩스(AK LABS)**는 누구나 인공지능을 더 쉽고 똑똑하게 활용할 수 있도록 돕는 AI 서비스 빌더이자 커뮤니티입니다. 바이브코딩과 다양한 AI 프롬프트 실험을 통해 실무에 바로 적용 가능한 AI 솔루션을 탐구합니다.

- **공식 홈페이지**: [https://litt.ly/aklabs](https://litt.ly/aklabs)
- **주요 활동**: AI 앱 개발, 프롬프트 엔지니어링 랩, AI 교육 및 커뮤니티 운영

---

**Developed for Advanced Agentic Coding by Antigravity**
