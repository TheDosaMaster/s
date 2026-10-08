# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js (App Router, TypeScript, Tailwind CSS) chosen by the build agent after the user delegated the stack; PDF→JSON conversion runs server-side by the user's explicit choice, spawning the existing validated `pdf_to_json.py` (PyMuPDF) from a Next.js API route.

## Users

The user: a student/practitioner drilling SAT Reading and Writing questions from exported question-bank PDFs, working solo on their own machine.

## Product Purpose

Turn a College Board–style question-bank PDF export into structured JSON, then use that JSON as an interactive, answerable question bank: practice questions, get immediate right/wrong feedback with explanations, and track performance over time. Success = a PDF goes in and a drillable, tracked bank comes out with zero manual data entry.

## Positioning

A single local tool that owns the whole loop — PDF extraction (with artifact-free text repair most converters get wrong) → structured bank → practiced and tracked — instead of exporting JSON into some other app.

## Operating Context

- Runs locally (`npm run dev` / `npm run build`) on the user's machine; Python 3 with `pymupdf` installed.
- Source documents are SAT Reading and Writing exports: fields `id, assessment, test, domain, skill, difficulty, question, choices A–D, answer, explanation`.
- All state (bank + attempt history) persists client-side in localStorage; no accounts, no backend database.

## Capabilities and Constraints

- Import: upload a PDF → API route → JSON bank; also allow loading the bundled sample bank (`questionbank.json`, 100 questions) and re-importing to replace.
- Practice: answer A–D, immediate correctness + explanation, per-question right/wrong counters, session progress.
- Bank browser: filter and sort by domain and skill (and by attempt status), inspect any question with its answer, explanation, and history.
- Reset/erase tracking data.
- Undecided: multi-bank management (one active bank at a time for now).

## Evidence on Hand

- `pdf_to_json.py` — validated converter (100/100 questions, zero artifacts) and `questionbank.json` — the real converted bank used as sample content.

## Product Principles

1. The PDF in, the drill out — no manual steps between.
2. Every answer is a data point; tracking is never optional or hidden.
3. Filter by what you're bad at: domain and skill are first-class controls.
4. Local-first and private: nothing leaves the machine.

## Accessibility & Inclusion

Standard web accessibility: keyboard-operable answering (A–D keys), visible focus, sufficient contrast, semantic structure. No product-specific standard was declared.
