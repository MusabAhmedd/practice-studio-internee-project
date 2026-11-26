import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { validateWithRetry } from "./rubric";
import type { Evaluation } from "./schemas";
import { z } from "zod";

const followUpSchema = z.object({
  question: z.string().min(10).max(500),
});

// Groq's documented OpenAI-compatible endpoint; no secrets reach client code.
export async function evaluateAnswer(
  question: string,
  answer: string,
  role?: string,
  seniority?: string,
  type?: string,
  jdText?: string,
): Promise<Evaluation> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL;
  if (!apiKey || !model) throw new Error("Groq evaluation is not configured");
  const system = await readFile(
    path.join(process.cwd(), "prompts/evaluate-answer.md"),
    "utf8",
  );
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: 20000,
    maxRetries: 2,
  });
  const scoreProperties = Object.fromEntries(
    ["correctness", "depth", "clarity", "structure", "relevance"].map((k) => [
      k,
      { type: "number" },
    ]),
  );
  const textArray = { type: "array", items: { type: "string" } };
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["scores", "strengths", "weaknesses", "idealOutline", "tip"],
    properties: {
      scores: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(scoreProperties),
        properties: scoreProperties,
      },
      strengths: textArray,
      weaknesses: textArray,
      idealOutline: textArray,
      tip: { type: "string" },
    },
  };
  const contextParts = [];
  if (role) contextParts.push(`Role: ${role}`);
  if (seniority) contextParts.push(`Seniority: ${seniority}`);
  if (type) contextParts.push(`Interview type: ${type}`);
  if (jdText)
    contextParts.push(`Job description context: ${jdText.slice(0, 2000)}`);
  const context =
    contextParts.length > 0 ? `\n\nContext:\n${contextParts.join("\n")}` : "";
  return validateWithRetry(async () => {
    const started = Date.now();
    try {
      const result = await client.chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: 1000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "evaluation", strict: true, schema },
        },
        messages: [
          { role: "system", content: system + context },
          {
            role: "user",
            content: JSON.stringify({
              untrusted_question: question,
              untrusted_answer: answer,
            }),
          },
        ],
      });
      console.info(
        JSON.stringify({
          event: "evaluation",
          latencyMs: Date.now() - started,
          usage: result.usage ?? null,
        }),
      );
      return result.choices[0]?.message.content ?? "";
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
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL;
  if (!apiKey || !model) return null;
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: 15000,
    maxRetries: 1,
  });
  const system = `You are an interview assistant generating a relevant follow-up question.
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
  try {
    const result = await client.chat.completions.create({
      model,
      temperature: 0.3,
      max_completion_tokens: 200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "followup",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["question"],
            properties: {
              question: { type: "string", minLength: 10, maxLength: 500 },
            },
          },
        },
      },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            previousQuestion,
            previousAnswer,
          }),
        },
      ],
    });
    const content = result.choices[0]?.message.content ?? "";
    const parsed = followUpSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data.question : null;
  } catch {
    return null;
  }
}
