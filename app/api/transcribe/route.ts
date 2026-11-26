import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/firebase-admin";
import { apiError, limited } from "@/lib/api";
export const runtime = "nodejs";
const MAX = 5 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    const uid = await requireUser(request);
    if (!(await limited(uid)))
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    const model = process.env.OPENAI_STT_MODEL,
      apiKey = process.env.GROQ_API_KEY;
    if (!model || !apiKey)
      return NextResponse.json(
        { error: "Voice transcription is unavailable. Please use text." },
        { status: 503 },
      );
    if (Number(request.headers.get("content-length") || 0) > MAX)
      return NextResponse.json(
        { error: "Audio is too large." },
        { status: 413 },
      );
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json({ error: "Audio is missing." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Audio is too large." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const mime = request.headers.get("content-type")?.split(";")[0];
    const webm =
      mime === "audio/webm" &&
      bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const ogg =
      mime === "audio/ogg" && bytes.subarray(0, 4).toString() === "OggS";
    if (bytes.length < 32 || (!webm && !ogg))
      return NextResponse.json(
        { error: "Unsupported or invalid audio. Please use text." },
        { status: 400 },
      );
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 30000,
      maxRetries: 2,
    });
    const started = Date.now();
    const result = await client.audio.transcriptions.create({
      file: await toFile(bytes, webm ? "answer.webm" : "answer.ogg", {
        type: mime,
      }),
      model,
      response_format: "json",
      temperature: 0,
    });
    console.info(
      JSON.stringify({
        event: "transcription",
        latencyMs: Date.now() - started,
        usage: result.usage ?? null,
      }),
    );
    if (typeof result.text !== "string" || result.text.length > 5000)
      throw new Error("Invalid transcript");
    return NextResponse.json({ text: result.text });
  } catch (error) {
    return apiError(error);
  }
}
