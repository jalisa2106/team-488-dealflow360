/**
 * ENGINE 12 — AI Explanation Layer (sits on top of all engines — build last)
 *
 * RULE: This layer NEVER decides anything.
 * It only translates already-computed structured facts into natural language.
 * It must not contradict or invent facts beyond what the reasons lists provide.
 *
 * Fallback: if AI call fails, times out, or returns malformed output,
 * fall back to deterministic sentence builder from reasons list.
 * This feature must NEVER be a single point of failure for the demo.
 *
 * If asked "why did AI decide Finance approval was needed?":
 *   CORRECT: "The AI didn't decide that — the Approval Engine did, deterministically,
 *             before the AI was called. The AI's only job was to explain it in plain English."
 */

import type { RiskReason, RiskLevel } from './risk.engine';
import type { HealthSignalReason, HealthLevel } from './deal-health.engine';

// Strict schema for AI response validation
export interface AIExplanationSchema {
  summary: string;              // 1-2 sentence plain English summary
  riskExplanation: string;      // explains the risk score and level
  approvalExplanation?: string; // explains why approval is (or isn't) needed
  dealHealthNote?: string;      // optional deal health context
}

function isValidAIExplanation(obj: unknown): obj is AIExplanationSchema {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.summary === 'string' && typeof o.riskExplanation === 'string';
}

export interface ExplainInput {
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  approvalRequired: boolean;
  requiredRoles: string[];
  dealHealthLevel?: HealthLevel;
  dealHealthReasons?: HealthSignalReason[];
}

export interface ExplainOutput {
  explanation: AIExplanationSchema;
  usedFallback: boolean;
}

/**
 * Deterministic fallback — builds explanation from reasons list, no AI required.
 * This must work with zero model calls.
 */
export function buildDeterministicExplanation(input: ExplainInput): AIExplanationSchema {
  const { riskScore, riskLevel, riskReasons, approvalRequired, requiredRoles } = input;

  const riskMessages = riskReasons.map(r => r.message);
  const riskExplanation = riskMessages.length > 0
    ? `This quote has a risk score of ${riskScore} (${riskLevel}) because: ${riskMessages.join('; ')}.`
    : `This quote has a risk score of ${riskScore} (${riskLevel}) with no specific risk factors identified.`;

  let approvalExplanation: string | undefined;
  if (approvalRequired) {
    const roles = requiredRoles.join(' followed by ');
    approvalExplanation = `Approval is required from: ${roles}. ${
      riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
        ? 'Finance approval is needed as a backstop because the risk level exceeds what a Sales Manager alone can clear.'
        : 'Sales Manager review is required to proceed.'
    }`;
  } else {
    approvalExplanation = 'No approval is required — this quote falls within acceptable risk parameters.';
  }

  const summary = `${riskLevel === 'LOW' || riskLevel === 'MEDIUM' ? 'This quote' : 'This high-risk quote'} has been evaluated with a risk score of ${riskScore}. ${approvalRequired ? 'Approval is required before it can proceed.' : 'It can proceed without additional approval.'}`;

  let dealHealthNote: string | undefined;
  if (input.dealHealthLevel && input.dealHealthReasons && input.dealHealthReasons.length > 0) {
    const healthMessages = input.dealHealthReasons.map(r => r.message);
    dealHealthNote = `Deal health is ${input.dealHealthLevel}: ${healthMessages.join('; ')}.`;
  }

  return { summary, riskExplanation, approvalExplanation, dealHealthNote };
}

/**
 * AI-powered explanation (with validation + deterministic fallback).
 * Returns { explanation, usedFallback: true } if AI fails.
 */
export async function explainWithAI(input: ExplainInput): Promise<ExplainOutput> {
  const fallback = buildDeterministicExplanation(input);

  try {
    const prompt = buildPrompt(input);

    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, input }),
      signal: AbortSignal.timeout(5000), // 5s timeout — never block demo
    });

    if (!response.ok) {
      return { explanation: fallback, usedFallback: true };
    }

    const raw = await response.json();

    // Validate against strict schema before showing to anyone
    if (!isValidAIExplanation(raw)) {
      return { explanation: fallback, usedFallback: true };
    }

    return { explanation: raw, usedFallback: false };
  } catch {
    // Network error, timeout, or malformed response → deterministic fallback
    return { explanation: fallback, usedFallback: true };
  }
}

function buildPrompt(input: ExplainInput): string {
  const reasonsList = input.riskReasons
    .map(r => `- ${r.message} (${r.points} risk points)`)
    .join('\n');

  return `You are a deal analysis assistant. Translate these computed facts into clear natural language for a sales manager. Do not add information not present in the facts. Return a JSON object with keys: summary, riskExplanation, approvalExplanation.

FACTS:
- Risk score: ${input.riskScore}/100
- Risk level: ${input.riskLevel}
- Risk factors:
${reasonsList}
- Approval required: ${input.approvalRequired}
- Required approvers: ${input.requiredRoles.join(', ') || 'None'}

Respond ONLY with a valid JSON object matching this schema:
{ "summary": string, "riskExplanation": string, "approvalExplanation": string }`;
}
