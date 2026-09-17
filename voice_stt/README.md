# 🎤 AI4Bharat Voice-to-Text (STT) Module

**SIH 2026 · Artisan AI Platform**

Self-hosted, offline Speech-to-Text API for Indian regional languages using **AI4Bharat IndicWhisper** — no cloud, no API keys, no cost.

```
ARTISAN VOICE  →  AI4Bharat IndicWhisper  →  Regional Language Text
```

---

## 📋 Project Overview

| Property | Value |
|---|---|
| **Model** | AI4Bharat IndicWhisper (`ai4bharat/indicwhisper`) |
| **Architecture** | OpenAI Whisper fine-tuned on 22 Indian languages |
| **License** | MIT |
| **Languages** | Tamil (ta), Telugu (te), Hindi (hi) + 19 more Indian languages |
| **Backend** | FastAPI + PyTorch |
| **API** | `POST /api/stt/transcribe` |
| **Cloud dependency** | ❌ None – 100% local inference |
| **API keys required** | ❌ None |

---

## 🗂️ Project Structure

```
voice_stt/
├── venv/                              ← Python virtual environment (not committed)
└── backend/
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                    ← FastAPI app + lifespan (model loaded once)
    │   ├── config.py                  ← Settings (reads .env)
    │   ├── api/
    │   │   ├── __init__.py
    │   │   └── routes.py              ← POST /api/stt/transcribe endpoint
    │   └── stt/
    │       ├── __init__.py
    │       ├── base.py                ← Abstract BaseSTTModel (swappable backends)
    │       ├── device.py              ← Auto CUDA/CPU detection
    │       ├── audio.py               ← Audio preprocessing (16kHz mono)
    │       ├── indic_whisper.py       ← AI4Bharat IndicWhisper implementation
    │       └── factory.py             ← Model singleton loader
    ├── tests/
    │   ├── audio/
    │   │   ├── tamil/                 ← Put Tamil .wav/.mp3 files here
    │   │   │   └── reference.json     ← Reference transcripts for accuracy eval
    │   │   ├── telugu/
    │   │   │   └── reference.json
    │   │   └── hindi/
    │   │       └── reference.json
    │   ├── test_transcription.py      ← CLI test tool
    │   └── evaluate_accuracy.py       ← WER/CER benchmark tool
    ├── dataset/
    │   └── README.md                  ← Fine-tuning dataset format spec
    ├── requirements.txt
    ├── .env.example
    └── .gitignore
```

---

## ⚙️ Requirements

- **Python** 3.10 or newer (tested on 3.13)
- **ffmpeg** installed on the system (`sudo apt install ffmpeg`)
- Internet connection for first run (model download ~1.5 GB)
- No GPU required (CPU works, GPU makes inference faster)

---

## 🚀 Setup

### 1. Navigate to the module directory

```bash
cd voice_stt
```

### 2. Create and activate the virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install PyTorch (CPU build – no GPU needed)

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

> **For NVIDIA GPU machines** (college GPU server):
> ```bash
> pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
> ```

### 4. Install remaining dependencies

```bash
pip install -r backend/requirements.txt
```

### 5. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` as needed:

```env
DEVICE=auto           # auto | cpu | cuda
STT_BACKEND=indic_whisper
INDICWHISPER_MODEL_ID=ai4bharat/indicwhisper
```

---

## 🤖 Model Information

| Property | Value |
|---|---|
| **HuggingFace ID** | `ai4bharat/indicwhisper` |
| **Base** | OpenAI Whisper (medium/large) fine-tuned by AI4Bharat |
| **Training data** | AI4Bharat IndicSUPERB + Shrutilipi corpus |
| **Model size** | ~1.5 GB (downloaded on first run, cached locally) |
| **Cache location** | `voice_stt/backend/.cache/huggingface/` |
| **Download** | Automatic from HuggingFace Hub on first startup |
| **License** | MIT |

### Why IndicWhisper?

- Fine-tuned specifically for Indian languages (not general multilingual Whisper)
- Outputs transcript **in the original spoken language** (Tamil → Tamil, not English)
- Supports all 22 scheduled Indian languages
- HuggingFace `transformers` pipeline — easy inference, CPU/GPU flexible
- Can be fine-tuned later on artisan-specific dataset

---

## ▶️ Running the Server

```bash
cd voice_stt/backend
source ../venv/bin/activate
python -m app.main
```

Or with uvicorn directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected startup output:**

```
============================================================
  AI4Bharat Voice-to-Text Service (SIH 2026)
  Backend  : indic_whisper
  Device   : auto (requested)
============================================================
  Loading AI4Bharat IndicWhisper
  Model : ai4bharat/indicwhisper
  Device: cpu
...
  ✓ Server ready – http://0.0.0.0:8000
```

---

## 🧪 Testing

### Health check

```bash
curl http://localhost:8000/api/stt/health
```

### Transcribe a WAV file (with language hint)

```bash
curl -X POST http://localhost:8000/api/stt/transcribe \
  -F "file=@/path/to/tamil_audio.wav" \
  -F "language=ta"
```

### Transcribe without language hint (auto-detect)

```bash
curl -X POST http://localhost:8000/api/stt/transcribe \
  -F "file=@/path/to/audio.wav"
```

### Expected response

```json
{
  "success": true,
  "language": "ta",
  "text": "இந்த மூங்கில் கூடையை நான் கையால் செய்தேன்.",
  "duration_seconds": 4.52,
  "processing_time_seconds": 0.83,
  "device": "cpu"
}
```

### API Documentation (Swagger UI)

Open in browser: http://localhost:8000/docs

---

## 🖥️ CLI Testing

```bash
cd voice_stt/backend
source ../venv/bin/activate
```

#### Single file (local, no server needed)

```bash
python tests/test_transcription.py path/to/audio.wav --language ta
```

#### Single file against running server

```bash
python tests/test_transcription.py path/to/audio.wav --api http://localhost:8000
```

#### Batch test — all Tamil files

```bash
python tests/test_transcription.py tests/audio/tamil/ --language ta
```

#### Batch test — all languages

```bash
python tests/test_transcription.py tests/audio/
```

#### Save results to JSON

```bash
python tests/test_transcription.py tests/audio/ --output results.json
```

---

## 📊 Accuracy Evaluation (WER / CER)

### 1. Add reference transcripts

Edit `tests/audio/tamil/reference.json`:

```json
{
  "tamil_01.wav": "இந்த மூங்கில் கூடையை நான் கையால் செய்தேன்.",
  "tamil_02.wav": "இதன் விலை நானூற்று ஐம்பது ரூபாய்."
}
```

Do the same for `tests/audio/telugu/reference.json` and `tests/audio/hindi/reference.json`.

### 2. Run evaluation

```bash
# Single language (local)
python tests/evaluate_accuracy.py --dir tests/audio/tamil/ --language ta

# All languages (local)
python tests/evaluate_accuracy.py --all-langs

# All languages via running server
python tests/evaluate_accuracy.py --all-langs --api http://localhost:8000

# Save detailed report
python tests/evaluate_accuracy.py --all-langs --report accuracy_report.json
```

### 3. Example report output

```
════════════════════════════════════════════════════════════
  Accuracy Report – AI4Bharat IndicWhisper
════════════════════════════════════════════════════════════
Language       Samples        WER        CER   Avg Inference
─────────────────────────────────────────────────────────────
ta                   5     0.0820     0.0340          1.234s
te                   4     0.0910     0.0410          1.187s
hi                   6     0.0650     0.0280          1.102s

WER = Word Error Rate  (lower is better, 0.0 = perfect)
CER = Character Error Rate (recommended for Tamil/Indic)
```

> **Note**: CER is the more meaningful metric for Tamil and other Indic languages
> because word-boundary tokenisation differs from English.

---

## 🌍 Supported Languages

| Code | Language | Script |
|------|----------|--------|
| `ta` | Tamil | தமிழ் |
| `te` | Telugu | తెలుగు |
| `hi` | Hindi | हिन्दी |
| `kn` | Kannada | ಕನ್ನಡ |
| `ml` | Malayalam | മലയാളം |
| `mr` | Marathi | मराठी |
| `gu` | Gujarati | ગુજરાતી |
| `bn` | Bengali | বাংলা |
| `pa` | Punjabi | ਪੰਜਾਬੀ |
| `or` | Odia | ଓଡ଼ିଆ |
| `as` | Assamese | অসমীয়া |
| `ur` | Urdu | اردو |
| + 10 more | | |

---

## 🔧 Switching to GPU (College Machine)

1. Install CUDA PyTorch:
   ```bash
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

2. Set in `.env`:
   ```env
   DEVICE=cuda
   ```

3. Restart the server. Startup will log:
   ```
   Device: cuda
   GPU   : NVIDIA Tesla T4
   VRAM  : 16.0 GB
   ```

---

## 🎛️ Switching STT Backend

To switch between IndicWhisper and IndicConformer (when implemented), update `.env`:

```env
STT_BACKEND=indic_whisper      # Current (default)
# STT_BACKEND=indic_conformer  # Future (not yet implemented)
```

The API contract (`POST /api/stt/transcribe` → JSON response) remains identical regardless of backend.

---

## 📦 Model Download & Cache

- **First run**: Model weights are downloaded automatically from HuggingFace Hub.
- **Cache location**: `voice_stt/backend/.cache/huggingface/`
- **Size**: ~1.5 GB (medium model)
- **Offline mode**: After first download, the server works without internet.
- **Change model**: Update `INDICWHISPER_MODEL_ID` in `.env` and restart.

```bash
# Check cache size
du -sh voice_stt/backend/.cache/
```

---

## 🔮 Future Fine-Tuning

See [`backend/dataset/README.md`](backend/dataset/README.md) for the artisan-specific
fine-tuning dataset format specification.

**Required before fine-tuning:**
- Minimum 10 hours of artisan speech per language
- Human-verified transcripts in native script
- Signed consent from each artisan speaker

Fine-tuning is **not** part of the current implementation.

---

## 🛠️ Troubleshooting

### `Model loading failed`
- Check internet connection on first run.
- Ensure `backend/.cache/` has write permission.
- Try: `HF_HUB_OFFLINE=0 python -m app.main`

### `ffmpeg not found`
```bash
sudo apt install ffmpeg       # Ubuntu/Debian
brew install ffmpeg           # macOS
```

### `soundfile` errors on MP3
- Install `libsndfile`: `sudo apt install libsndfile1`
- MP3 will fall back to ffmpeg automatically if soundfile fails.

### `Out of Memory` on CPU
- The model requires ~4 GB RAM on CPU.
- Close other applications.
- Or use `DEVICE=cuda` on a GPU machine.

### Port already in use
```bash
lsof -i :8000
kill -9 <PID>
```

---

## ✅ Architecture Scope

This module implements **ONLY**:

```
VOICE → SPEECH RECOGNITION → TEXT (in original language)
```

**Not implemented here** (future modules):
- ❌ Product extraction from text
- ❌ Translation
- ❌ Price prediction
- ❌ Product categorisation
- ❌ Catalogue generation
- ❌ LLM integration
