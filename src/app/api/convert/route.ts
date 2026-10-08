import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 90_000;

function runConverter(pdfPath: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "pdf_to_json.py");
    const child = spawn("python3", [script, pdfPath, "-"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, stdout, stderr });
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      stderr += "\nConversion timed out after 90s.";
      finish(false);
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_BYTES) {
        child.kill("SIGKILL");
        finish(false);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      stderr += `\n${err.message}`;
      finish(false);
    });
    child.on("close", (code) => finish(code === 0 && stdout.length > 0));
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file was provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "That file is empty." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Only .pdf exports can be converted." }, { status: 400 });
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "sat-bank-"));
  const pdfPath = path.join(dir, "upload.pdf");
  try {
    await writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));
    const { ok, stdout, stderr } = await runConverter(pdfPath);
    if (!ok) {
      const detail = stderr.trim().split("\n").slice(-6).join("\n");
      const missingPython = /ENOENT|not found/i.test(stderr);
      return Response.json(
        {
          error: missingPython
            ? "python3 is not available on this machine. Install Python 3 with `pip install pymupdf` to convert PDFs."
            : detail || "Conversion failed.",
        },
        { status: 500 },
      );
    }
    let questions: unknown;
    try {
      questions = JSON.parse(stdout);
    } catch {
      return Response.json({ error: "The converter returned unreadable output." }, { status: 500 });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json(
        { error: "No questions could be read from that PDF." },
        { status: 422 },
      );
    }
    const warnings = stderr
      .split("\n")
      .filter((line) => line.startsWith("warning:"))
      .map((line) => line.slice("warning:".length).trim());
    return Response.json({ questions, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
