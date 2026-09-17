# Artisan Speech Dataset Format – Fine-Tuning Guide

## Overview

This document describes the dataset format for fine-tuning the AI4Bharat IndicWhisper
model on artisan-specific Indian language speech. Fine-tuning is a **future step** —
do not start this until sufficient verified data is collected.

---

## Dataset Structure

```
dataset/
├── audio/
│   ├── ta/          ← Tamil recordings
│   ├── te/          ← Telugu recordings
│   ├── hi/          ← Hindi recordings
│   └── ...
├── metadata.csv     ← Primary index (see format below)
└── README.md        ← This file
```

---

## metadata.csv Format

| Column         | Type   | Description                                           |
|----------------|--------|-------------------------------------------------------|
| `audio_path`   | str    | Relative path to audio file, e.g. `audio/ta/001.wav` |
| `language`     | str    | BCP-47 code: `ta`, `te`, `hi`, `kn`, `ml`, …        |
| `transcription`| str    | Human-verified transcript in native script            |
| `duration_sec` | float  | Duration in seconds                                   |
| `speaker_id`   | str    | Optional anonymised speaker ID                        |
| `domain`       | str    | Always `artisan` for this dataset                     |
| `verified`     | bool   | `true` if human-verified, `false` if auto-generated   |

### Example rows

```csv
audio_path,language,transcription,duration_sec,speaker_id,domain,verified
audio/ta/001.wav,ta,"இந்த மூங்கில் கூடையை நான் கையால் செய்தேன்.",4.5,spk_001,artisan,true
audio/te/002.wav,te,"ఈ వెదురు బుట్టను నేను చేతితో అల్లాను.",3.8,spk_002,artisan,true
audio/hi/003.wav,hi,"यह बांस की टोकरी मैंने हाथ से बनाई है।",4.1,spk_003,artisan,true
```

---

## Audio Requirements

| Property       | Requirement                  |
|----------------|------------------------------|
| Format         | WAV (PCM)                    |
| Sample Rate    | 16,000 Hz (16 kHz)           |
| Channels       | Mono (1 channel)             |
| Bit depth      | 16-bit                       |
| Duration       | 3 – 30 seconds recommended   |
| Environment    | Low background noise preferred|

---

## Data Collection Guidelines

1. **Consent**: Obtain written consent from each artisan before recording.
2. **Environment**: Record in a quiet environment (indoors, minimal traffic noise).
3. **Natural speech**: Artisans should speak naturally about their products.
4. **Verification**: Each transcript MUST be verified by a fluent native speaker.
5. **Diversity**: Collect from multiple speakers, genders, and dialects per language.
6. **Minimum dataset size**: At least 10 hours per language for meaningful fine-tuning.

---

## Future Fine-Tuning Workflow

```
Pretrained AI4Bharat IndicWhisper
           ↓
Artisan voice dataset (metadata.csv)
           ↓
Human-verified transcripts
           ↓
Fine-tuning (Whisper fine-tuning script)
           ↓
Artisan-specific STT model
```

The fine-tuning script will use HuggingFace `Seq2SeqTrainer` with IndicWhisper as
the base model. This will be implemented as a separate future module.

---

## What NOT to Include

- Auto-generated transcripts without human verification
- Audio with heavy background music or overlapping speech
- Synthetic TTS (text-to-speech) audio — real human recordings only
- Translations — transcripts must be in the original spoken language
