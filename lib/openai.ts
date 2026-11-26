import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { validateWithRetry } from "./rubric";
import type { Evaluation } from "./schemas";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  throw new Error("Gemini API key is not configured");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const evaluationSchema = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.OBJECT,
      properties: {
        correctness: { type: SchemaType.NUMBER },
        depth: { type: SchemaType.NUMBER },
        clarity: { type: SchemaType.NUMBER },
        structure: { type: SchemaType.NUMBER },
        relevance: { type: SchemaType.NUMBER },
      },
      required: ["correctness", "depth", "clarity", "structure", "relevance"],
    },
    strengths: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    weaknesses: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    idealOutline: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    tip: { type: SchemaType.STRING },
  },
  required: ["scores", "strengths", "weaknesses", "idealOutline", "tip"],
};

const followUpSchema = {
  type: SchemaType.OBJECT,
  properties: {
    question: { type: SchemaType.STRING },
  },
  required: ["question"],
};

export async function evaluateAnswer(
  question: string,
  answer: string,
  role?: string,
  seniority?: string,
  type?: string,
  jdText?: string,
): Promise<Evaluation> {
  const systemPrompt = await readFile(
    path.join(process.cwd(), "prompts/evaluate-answer.md"),
    "utf8",
  );

  const contextParts = [];
  if (role) contextParts.push(`Role: ${role}`);
  if (seniority) contextParts.push(`Seniority: ${seniority}`);
  if (type) contextParts.push(`Interview type: ${type}`);
  if (jdText) contextParts.push(`Job description context: ${jdText.slice(0, 2000)}`);
  const context = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join("\n")}` : "";

  const model = genAI.getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1000,
      responseMimeType: "application/json",
      responseSchema: evaluationSchema,
    },
    systemInstruction: systemPrompt + context,
  });

  return validateWithRetry(async () => {
    const started = Date.now();
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  untrusted_question: question,
                  untrusted_answer: answer,
                }),
              },
            ],
          },
        ],
      });

      const response = result.response;
      const text = response.text();

      console.info(
        JSON.stringify({
          event: "evaluation",
          latencyMs: Date.now() - started,
          usage: result.response.usageMetadata ?? null,
        }),
      );

      return text;
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "evaluation_error",
          latencyMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
          cause: error instanceof Error ? error.cause : undefined,
        }),
      );
      throw error;
    }
  });
}

export async function generateFollowUpQuestion(
  previousQuestion: string,
  previousAnswer: string,
  role: string,
  seniority: string,
  type: string,
  jdText?: string,
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const systemPrompt = `You are an interview assistant generating a relevant follow-up question.
The interview is for a ${role} (${seniority} level), type: ${type}.
${jdText ? `Job description context: ${jdText.slice(0, 1500)}` : ""}

Generate ONE concise follow-up question that:
- Directly relates to the candidate's previous answer
- Probes deeper into technical details, trade-offs, or reasoning
- Stays within the role and interview type scope
- Is clear, specific, and answerable in 2-3 minutes
- Does NOT repeat the previous question
- Does NOT introduce unrelated topics

Return only a JSON object with a "question" field.`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
      responseSchema: followUpSchema,
    },
    systemInstruction: systemPrompt,
  });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                previousQuestion,
                previousAnswer,
              }),
            },
          ],
        ],
      });

    const content = result.response.text();
    const parsed = JSON.parse(content);
    return parsed.question ?? null;
  } catch {
    return null;
  }
}