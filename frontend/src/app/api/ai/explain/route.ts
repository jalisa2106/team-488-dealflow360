import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/get-auth-session';
import { prisma } from '@/lib/db/prisma';
import { buildDeterministicExplanation } from '@/lib/engines/ai-explanation.engine';
import type { RiskReason, RiskLevel } from '@/lib/engines/risk.engine';
import type { HealthSignalReason, HealthLevel } from '@/lib/engines/deal-health.engine';

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as {
      quoteId?: string;
      riskScore?: number;
      riskLevel?: RiskLevel;
      riskReasons?: RiskReason[];
      approvalRequired?: boolean;
      requiredRoles?: string[];
      dealHealthLevel?: HealthLevel;
      dealHealthReasons?: HealthSignalReason[];
    };

    let input: {
      riskScore: number;
      riskLevel: RiskLevel;
      riskReasons: RiskReason[];
      approvalRequired: boolean;
      requiredRoles: string[];
      dealHealthLevel?: HealthLevel;
      dealHealthReasons?: HealthSignalReason[];
      customerName?: string;
      quoteNumber?: string;
      total?: number;
    };

    if (body.quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: body.quoteId },
        include: {
          customer: { select: { companyName: true } },
          quoteLines: { include: { product: { select: { name: true } } } },
          approvalRequests: { where: { status: 'PENDING' } },
          dealHealthEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      const riskReasons: RiskReason[] = [];
      if (Number(quote.discountAmount) > 0) {
        const discountPct = Math.round((Number(quote.discountAmount) / (Number(quote.subtotal) || 1)) * 100);
        riskReasons.push({
          component: 'DISCOUNT',
          severity: discountPct > 20 ? 'HIGH' : 'MEDIUM',
          points: discountPct > 20 ? 15 : 8,
          message: `High requested discount of ${discountPct}% across line items`,
        });
      }
      if (Number(quote.marginPercent) < 15) {
        riskReasons.push({
          component: 'MARGIN',
          severity: 'HIGH',
          points: 15,
          message: `Gross margin at ${quote.marginPercent}%, below preferred threshold`,
        });
      }

      const latestHealth = quote.dealHealthEvents[0];
      let dealHealthReasons: HealthSignalReason[] = [];
      if (latestHealth?.reasons) {
        try {
          const parsed = typeof latestHealth.reasons === 'string' ? JSON.parse(latestHealth.reasons) : latestHealth.reasons;
          if (Array.isArray(parsed)) {
            dealHealthReasons = parsed.map((r: unknown) =>
              typeof r === 'string'
                ? { signal: 'STALL', severity: 'MEDIUM', points: 5, message: r }
                : (r as HealthSignalReason)
            );
          }
        } catch {}
      }

      input = {
        riskScore: quote.riskScore,
        riskLevel: (quote.riskLevel as RiskLevel) || 'LOW',
        riskReasons: riskReasons.length > 0 ? riskReasons : [{ component: 'DISCOUNT', severity: 'LOW', points: 0, message: 'Pricing within standard guidelines' }],
        approvalRequired: quote.status === 'PENDING_APPROVAL' || quote.approvalRequests.length > 0,
        requiredRoles: quote.approvalRequests.map((a: { role: string }) => a.role),
        dealHealthLevel: (latestHealth?.level as HealthLevel) || undefined,
        dealHealthReasons,
        customerName: quote.customer.companyName,
        quoteNumber: quote.quoteNumber,
        total: Number(quote.total),
      };
    } else {
      input = {
        riskScore: body.riskScore ?? 0,
        riskLevel: body.riskLevel ?? 'LOW',
        riskReasons: body.riskReasons ?? [],
        approvalRequired: body.approvalRequired ?? false,
        requiredRoles: body.requiredRoles ?? [],
        dealHealthLevel: body.dealHealthLevel,
        dealHealthReasons: body.dealHealthReasons,
      };
    }

    const fallback = buildDeterministicExplanation(input);

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';

    if (!openrouterKey) {
      const formatted = `${fallback.summary}\n\n${fallback.riskExplanation}${fallback.approvalExplanation ? `\n\n${fallback.approvalExplanation}` : ''}`;
      return NextResponse.json({
        explanation: formatted,
        structuredExplanation: fallback,
        usedFallback: true,
        note: 'OPENROUTER_API_KEY not set',
      });
    }

    try {
      const prompt = buildOpenRouterPrompt(input);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'DealFlow360',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are the DealFlow360 AI Deal Copilot. Analyze the deal facts provided and provide concise, executive-level insights in plain English. Return ONLY a valid JSON object with keys: summary, riskExplanation, approvalExplanation.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawContent = data?.choices?.[0]?.message?.content ?? '';
      let parsed: { summary?: string; riskExplanation?: string; approvalExplanation?: string } = {};

      try {
        parsed = JSON.parse(rawContent);
      } catch {
        parsed = {
          summary: rawContent.slice(0, 180),
          riskExplanation: rawContent,
          approvalExplanation: fallback.approvalExplanation,
        };
      }

      const summary = parsed.summary || fallback.summary;
      const riskExplanation = parsed.riskExplanation || fallback.riskExplanation;
      const approvalExplanation = parsed.approvalExplanation || fallback.approvalExplanation;

      const formatted = `${summary}\n\n${riskExplanation}${approvalExplanation ? `\n\n${approvalExplanation}` : ''}`;

      return NextResponse.json({
        explanation: formatted,
        structuredExplanation: { summary, riskExplanation, approvalExplanation, dealHealthNote: fallback.dealHealthNote },
        usedFallback: false,
        modelUsed: model,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('OpenRouter call failed, falling back to deterministic explanation:', errorMessage);
      const formatted = `${fallback.summary}\n\n${fallback.riskExplanation}${fallback.approvalExplanation ? `\n\n${fallback.approvalExplanation}` : ''}`;
      return NextResponse.json({
        explanation: formatted,
        structuredExplanation: fallback,
        usedFallback: true,
        error: errorMessage,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}

function buildOpenRouterPrompt(input: {
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  approvalRequired: boolean;
  requiredRoles: string[];
  dealHealthLevel?: HealthLevel;
  dealHealthReasons?: HealthSignalReason[];
  customerName?: string;
  quoteNumber?: string;
  total?: number;
}): string {
  const reasons = (input.riskReasons || []).map(r => `- ${r.message} (+${r.points || 0} pts)`).join('\n');
  const healthReasons = (input.dealHealthReasons || []).map(r => `- ${r.message}`).join('\n');

  return `Translate these computed facts into clear, professional natural language for a sales manager:

FACTS:
${input.customerName ? `- Customer: ${input.customerName}` : ''}
${input.quoteNumber ? `- Quote Number: ${input.quoteNumber}` : ''}
${input.total ? `- Total Amount: $${input.total.toLocaleString()}` : ''}
- Risk Score: ${input.riskScore}/100 (${input.riskLevel})
- Risk Factors:
${reasons || '- None'}
- Approval Required: ${input.approvalRequired ? 'YES' : 'NO'}
- Required Approvers: ${input.requiredRoles?.join(', ') || 'None'}
${input.dealHealthLevel ? `- Deal Health Level: ${input.dealHealthLevel}` : ''}
${healthReasons ? `- Health Warning Signals:\n${healthReasons}` : ''}

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "1-2 sentence executive summary of the deal posture",
  "riskExplanation": "Clear explanation of the risk drivers and why margins/discounts are flagged",
  "approvalExplanation": "Exact next step for approval or confirmation"
}`;
}
