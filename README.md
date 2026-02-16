# Label Truth

**Scan the claim. See the truth.**

A mobile app that lets users scan two photos of a packaged food product and instantly understand whether bold marketing claims are truthful or misleading, using a Red / Amber / Green signal backed by nutrition rules and explainable logic.

## Features

- **Two-photo scan flow**: Capture nutrition label + front-of-pack branding
- **On-device OCR**: Uses ML Kit (Android) and Apple Vision (iOS)—no cloud API costs
- **Rule-based verdicts**: Red / Amber / Green with explainable reasons
- **Detected nutrients**: Sugar, fat, protein with "in the name of" exposure
- **Daily intake impact**: % of WHO daily recommended limits
- **Healthier alternatives**: Optional static suggestions by category

## Tech Stack

- **Expo** (React Native) — iOS & Android
- **expo-text-extractor** — On-device OCR (ML Kit + Apple Vision)
- **expo-camera** / **expo-image-picker** — Photo capture
- **TypeScript** — Parsers, rule engine, knowledge base

## Getting Started

```bash
cd label-truth
npm install
npx expo start
```

Then:

- **Android**: Press `a` or scan QR with Expo Go
- **iOS**: Press `i` or scan QR with Expo Go (requires Mac for simulator)

> **Note**: OCR only works on native devices (iOS/Android). Web is not supported for text extraction.

## Project Structure

```
label-truth/
├── app/                 # Expo Router screens
│   ├── (tabs)/          # Home, Info
│   ├── capture/         # Label + Branding capture
│   └── result.tsx       # Verdict screen
├── src/
│   ├── context/         # ScanContext (state)
│   ├── ocr/             # extractText wrapper
│   ├── parser/          # Nutrition + ingredients
│   ├── rules/           # Claim evaluation
│   ├── knowledge/       # Sugar aliases, fat IDs, rules
│   └── utils/           # Daily intake %
```

## Success Criteria

- [x] Time to verdict < 5 seconds
- [x] Two-photo flow on Android and iOS
- [x] Red/Amber/Green rule-based verdict
- [x] Detected nutrients + "in the name of"
- [x] Daily intake % (WHO defaults)
- [x] Zero recurring API costs
