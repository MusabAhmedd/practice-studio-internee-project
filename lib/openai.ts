import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { validateWithRetry } from "./rubric";
import type { Evaluation } from "./schemas";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";

let genAI: InstanceType<typeof GoogleGenerativeAI>;

function getGenAI(): InstanceType<typeof GoogleGenerativeAI> {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Schema helper functions
function numSchema(): Schema {
  return { type: SchemaType.NUMBER };
}

function strSchema(): Schema {
  return { type: SchemaType.STRING };
}

function arrSchema(items: Schema): Schema {
  return {
    type: SchemaType.ARRAY,
    items,
  };
}

const scoreProperties: Record<string, Schema> = {
  correctness: numSchema(),
  depth: numSchema(),
  clarity: numSchema(),
  structure: numSchema(),
  relevance: numSchema(),
};

const evaluationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.OBJECT,
      properties: scoreProperties,
      required: ["correctness", "depth", "clarity", "structure", "relevance"] as string[],
    },
    strengths: arrSchema(strSchema()),
    weaknesses: arrSchema(strSchema()),
    idealOutline: arrSchema(strSchema()),
    tip: strSchema(),
  },
  required: ["scores", "strengths", "weaknesses", "idealOutline", "tip"] as string[],
};

const followUpSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    question: strSchema(),
  },
  required: ["question"] as string[],
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

  const model = getGenAI().getGenerativeModel({
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

  const model = getGenAI().getGenerativeModel({
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
        },
      ],
    });

    const content = result.response.text();
    const parsed = JSON.parse(content);
    return parsed.question ?? null;
  } catch {
    return null;
  }
}