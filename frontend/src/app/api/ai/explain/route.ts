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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      const explanation = buildDeterministicExplanation(input);
      return NextResponse.json({ explanation, usedFallback: true, note: 'GROQ_API_KEY not set' });
    }

    try {
      const prompt = buildGeminiPrompt(input); // Renamed internally, but prompt structure is same
      const res = await fetch(
        `https://api.groq.com/openai/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(text) as { summary?: string; riskExplanation?: string };
      if (!parsed.summary || !parsed.riskExplanation) throw new Error('Invalid schema');
      return NextResponse.json({ explanation: parsed, usedFallback: false });
    } catch (err: any) {
      const explanation = buildDeterministicExplanation(input);
      return NextResponse.json({ explanation, usedFallback: true, error: err.message });
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
