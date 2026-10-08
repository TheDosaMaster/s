#!/usr/bin/env python3
"""Convert SAT question-bank PDF export to JSON."""
import json
import re
import sys

import pymupdf

TINY_SPACE_MAX = 1.0   # page units; real spaces are >= 2.2, artifacts are 0.2
LINE_GAP = 0.5         # non-space glyph gaps are <= 0.1
PARA_RATIO = 2.2       # y-gap > 2.2 * line height => new paragraph
ID_RE = re.compile(r"^Question ID:\s*(\S+)")
ANS_RE = re.compile(r"^Correct Answer:\s*([A-D])")
CHOICE_RE = re.compile(r"^([A-D])\.\s*")
MARKERS = {"Question", "Answer", "Rationale"}


def line_text(line):
    """Rebuild a line's text, grouping stacked/rotated visual runs and dropping tiny spaces."""
    chars = [c for s in line["spans"] for c in s["chars"]]
    groups, cur, group_bottom = [], [], None
    for c in chars:
        if group_bottom is not None and c["bbox"][1] > group_bottom:
            groups.append(cur)
            cur = []
            group_bottom = None
        cur.append(c)
        group_bottom = c["bbox"][3] if group_bottom is None else max(group_bottom, c["bbox"][3])
    if cur:
        groups.append(cur)

    parts = []
    for g in groups:
        buf, prev_x1, prev_c = [], None, ""
        for c in g:
            w = c["bbox"][2] - c["bbox"][0]
            if c["c"] == " ":
                if w >= TINY_SPACE_MAX and buf:
                    buf.append(" ")
                    prev_c = " "
                continue
            if prev_x1 is not None and c["bbox"][0] - prev_x1 > LINE_GAP and prev_c != " ":
                buf.append(" ")
            buf.append(c["c"])
            prev_x1, prev_c = c["bbox"][2], c["c"]
        parts.append("".join(buf))
    return parts


def join_bits(prev, new):
    if not prev:
        return new
    if prev.endswith("-") and not prev.endswith("--"):
        return prev + new
    return prev + " " + new


def extract_rows(pdf_path):
    doc = pymupdf.open(pdf_path)
    rows = []
    for pno, page in enumerate(doc):
        raw = page.get_text("rawdict")
        page_lines = []
        for b in raw["blocks"]:
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                texts = line_text(l)
                texts = [t.strip() for t in texts if t.strip()]
                if texts:
                    page_lines.append(
                        {"y": l["bbox"][1], "h": l["bbox"][3] - l["bbox"][1],
                         "texts": texts, "page": pno}
                    )
        page_lines.sort(key=lambda r: r["y"])
        i = 0
        while i < len(page_lines):
            row, i = page_lines[i], i + 1
            while (i < len(page_lines)
                   and abs(page_lines[i]["y"] - row["y"]) <= 2.0):
                row["texts"] += page_lines[i]["texts"]
                row["h"] = max(row["h"], page_lines[i]["h"])
                i += 1
            row["text"] = " ".join(row["texts"]).strip()
            rows.append(row)
    return rows


def is_marker(text):
    return (text in MARKERS and len(text) <= 30) or bool(ANS_RE.match(text))


def collect(rows, i, stop_markers):
    """Gather rows into paragraphs starting at i; returns (paragraphs, next_i)."""
    paras, cur, prev = [], "", None
    while i < len(rows):
        r = rows[i]
        if ID_RE.match(r["text"]):
            break
        if is_marker(r["text"]) and r["text"] in stop_markers:
            break
        if prev is not None:
            gap = r["y"] - prev["y"]
            same_page = r["page"] == prev["page"]
            if same_page and gap > PARA_RATIO * prev["h"]:
                paras.append(cur)
                cur = ""
        cur = join_bits(cur, r["text"])
        prev = r
        i += 1
    if cur:
        paras.append(cur)
    return paras, i


def parse(rows):
    questions, i = [], 0
    while i < len(rows):
        m = ID_RE.match(rows[i]["text"])
        if not m:
            i += 1
            continue
        q = {"id": m.group(1)}
        i += 1
        if i + 1 >= len(rows):
            break
        labels, values = rows[i]["texts"], rows[i + 1]["texts"]
        if len(labels) < 5 or len(values) < 5:
            raise ValueError(f"{q['id']}: header row malformed: {labels} / {values}")
        keys = ["assessment", "test", "domain", "skill", "difficulty"]
        for k, v in zip(keys, values[:5]):
            q[k] = v
        i += 2
        while i < len(rows) and rows[i]["text"] != "Question":
            i += 1
        i += 1
        q["question"], i = collect(rows, i, {"Answer"})
        q["question"] = "\n\n".join(q["question"])
        if i < len(rows) and rows[i]["text"] == "Answer":
            i += 1
        choices, cur_letter = [], None
        while i < len(rows) and not is_marker(rows[i]["text"]):
            r = rows[i]
            cm = CHOICE_RE.match(r["text"])
            if cm:
                cur_letter = cm.group(1)
                choices.append([cur_letter, r["text"][cm.end():]])
            elif cur_letter:
                choices[-1][1] = join_bits(choices[-1][1], r["text"])
            i += 1
        q["choices"] = {let: txt.strip() for let, txt in choices}
        if i < len(rows) and ANS_RE.match(rows[i]["text"]):
            q["answer"] = ANS_RE.match(rows[i]["text"]).group(1)
            i += 1
        if i < len(rows) and rows[i]["text"] == "Rationale":
            i += 1
            q["explanation"], i = collect(rows, i, {"Question", "Answer", "Rationale"})
            q["explanation"] = "\n\n".join(q["explanation"]).strip()
        for f in ("question", "explanation"):
            if isinstance(q.get(f), str):
                q[f] = q[f].strip()
        questions.append(q)
    return questions


def validate(questions, expected=None):
    problems = []
    seen = set()
    for q in questions:
        qid = q.get("id", "?")
        if qid in seen:
            problems.append(f"{qid}: duplicate id")
        seen.add(qid)
        for f in ("assessment", "test", "domain", "skill", "difficulty",
                  "question", "answer", "explanation"):
            if not q.get(f):
                problems.append(f"{qid}: missing {f}")
        if set(q.get("choices", {})) != set("ABCD"):
            problems.append(f"{qid}: choices = {sorted(q.get('choices', {}))}")
        elif q.get("answer") not in q["choices"]:
            problems.append(f"{qid}: answer {q.get('answer')} not in choices")
        for let, txt in q.get("choices", {}).items():
            if len(txt) < 5:
                problems.append(f"{qid}: choice {let} too short: {txt!r}")
        if len(q.get("question", "")) < 30:
            problems.append(f"{qid}: question too short")
    return problems


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else (
        "/Users/tarundevarajan/Downloads/questionbank-export-2026-10-7.pdf")
    dst = sys.argv[2] if len(sys.argv) > 2 else "questionbank.json"
    questions = parse(extract_rows(src))
    problems = validate(questions)
    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    if dst == "-":
        sys.stdout.write(payload)
    else:
        with open(dst, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"{len(questions)} questions -> {dst}")
    for p in problems[:40]:
        print(f"warning: {p}", file=sys.stderr)
    return 0 if questions else 1


if __name__ == "__main__":
    raise SystemExit(main())
