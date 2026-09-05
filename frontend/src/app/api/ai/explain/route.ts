import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { buildDeterministicExplanation } from '@/lib/engines/ai-explanation.engine';
import type { RiskReason, RiskLevel } from '@/lib/engines/risk.engine';
import type { HealthSignalReason, HealthLevel } from '@/lib/engines/deal-health.engine';

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as {
      riskScore: number;
      riskLevel: RiskLevel;
      riskReasons: RiskReason[];
      approvalRequired: boolean;
      requiredRoles: string[];
      dealHealthLevel?: HealthLevel;
      dealHealthReasons?: HealthSignalReason[];
    };

    const input = {
      riskScore: body.riskScore,
      riskLevel: body.riskLevel,
      riskReasons: body.riskReasons,
      approvalRequired: body.approvalRequired,
      requiredRoles: body.requiredRoles,
      dealHealthLevel: body.dealHealthLevel,
      dealHealthReasons: body.dealHealthReasons,
    };

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      const explanation = buildDeterministicExplanation(input);
      return NextResponse.json({ explanation, usedFallback: true });
    }

    try {
      const prompt = buildGeminiPrompt(input);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!res.ok) throw new Error('Gemini API error');
      const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as { summary?: string; riskExplanation?: string };
      if (!parsed.summary || !parsed.riskExplanation) throw new Error('Invalid schema');
      return NextResponse.json({ explanation: parsed, usedFallback: false });
    } catch {
      const explanation = buildDeterministicExplanation(input);
      return NextResponse.json({ explanation, usedFallback: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}

function buildGeminiPrompt(input: Parameters<typeof buildDeterministicExplanation>[0]): string {
  const reasons = input.riskReasons.map(r => `- ${r.message} (+${r.points} pts)`).join('\n');
  return `You are a B2B deal analysis assistant. Translate these computed facts into clear, professional natural language for a sales manager. DO NOT add information not present in the facts. Respond ONLY with a valid JSON object.

FACTS:
- Risk score: ${input.riskScore}
- Risk level: ${input.riskLevel}
- Risk factors:\n${reasons}
- Approval required: ${input.approvalRequired}
- Required approvers: ${input.requiredRoles.join(', ') || 'None'}

Response schema: { "summary": string, "riskExplanation": string, "approvalExplanation": string }`;
}
