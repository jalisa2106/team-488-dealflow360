import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import PDFDocument from "pdfkit";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "this_month";
    const repId = url.searchParams.get("repId") || "";
    const status = url.searchParams.get("status") || "";
    const productId = url.searchParams.get("productId") || "";

    // Build date range
    const now = new Date();
    const startDate = (() => {
      const d = new Date(now);
      if (period === "last_month") { d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0,0,0,0); }
      else if (period === "last_quarter") { d.setMonth(d.getMonth() - 3); d.setDate(1); d.setHours(0,0,0,0); }
      else if (period === "this_year") { d.setMonth(0); d.setDate(1); d.setHours(0,0,0,0); }
      else { d.setDate(1); d.setHours(0,0,0,0); } // this_month
      return d;
    })();

    const where: Record<string, unknown> = { createdAt: { gte: startDate, lte: now } };
    if (repId) where.salesRepId = repId;
    if (status) where.status = status;
    if (productId) where.quoteLines = { some: { productId } };

    const quotes = await prisma.quote.findMany({
      where,
      include: { customer: true, salesRep: true },
      orderBy: { createdAt: "desc" },
    });

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- Header ---
      doc.rect(0, 0, doc.page.width, 100).fill('#0F4C81'); // Corporate Blue
      doc.fillColor('#FFFFFF').fontSize(24).text('DealFlow360', 40, 30);
      doc.fontSize(12).text('Analytics & Pipeline Report', 40, 60);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, doc.page.width - 150, 40, { width: 110, align: 'right' });
      
      doc.moveDown(4);

      // --- Summary KPIs ---
      doc.fillColor('#333333').fontSize(16).text('Summary KPIs', 40, 120);
      doc.rect(40, 140, 150, 60).fill('#F3F4F6');
      doc.rect(200, 140, 150, 60).fill('#F3F4F6');
      doc.rect(360, 140, 150, 60).fill('#F3F4F6');

      doc.fillColor('#6B7280').fontSize(10);
      doc.text('Total Quotes', 50, 150);
      doc.text('Pipeline Value', 210, 150);
      doc.text('Avg Deal Size', 370, 150);

      doc.fillColor('#111827').fontSize(18);
      doc.text(quotes.length.toString(), 50, 170);
      const totalVal = quotes.reduce((acc: number, q: any) => acc + Number(q.total), 0);
      doc.text(`$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 210, 170);
      const avgVal = quotes.length ? totalVal / quotes.length : 0;
      doc.text(`$${avgVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 370, 170);

      // --- Table ---
      doc.fillColor('#333333').fontSize(16).text('Pipeline Details', 40, 230);

      const tableTop = 260;
      const colX = [40, 120, 250, 360, 450];
      const headers = ['Quote #', 'Customer', 'Status', 'Risk', 'Total'];

      doc.rect(40, tableTop - 5, doc.page.width - 80, 20).fill('#0F4C81');
      doc.fillColor('#FFFFFF').fontSize(10);
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop));

      let y = tableTop + 25;
      doc.fillColor('#333333').fontSize(9);

      quotes.forEach((q: any, i: number) => {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 40;
          doc.rect(40, y - 5, doc.page.width - 80, 20).fill('#0F4C81');
          doc.fillColor('#FFFFFF').fontSize(10);
          headers.forEach((h, j) => doc.text(h, colX[j], y));
          y += 25;
          doc.fillColor('#333333').fontSize(9);
        }

        if (i % 2 === 1) {
          doc.rect(40, y - 5, doc.page.width - 80, 20).fill('#F9FAFB');
        }

        doc.fillColor('#333333');
        doc.text(q.quoteNumber, colX[0], y);
        doc.text(q.customer.companyName.substring(0, 25), colX[1], y);

        // Status coloring
        let statusColor = '#333333';
        if (q.status === 'APPROVED' || q.status === 'CONFIRMED') statusColor = '#16A34A';
        else if (q.status === 'PENDING_APPROVAL') statusColor = '#D97706';
        else if (q.status === 'REJECTED') statusColor = '#DC2626';
        doc.fillColor(statusColor).text(q.status.replace('_', ' '), colX[2], y);

        // Risk coloring
        let riskColor = '#16A34A';
        if (q.riskLevel === 'MEDIUM') riskColor = '#D97706';
        if (q.riskLevel === 'HIGH' || q.riskLevel === 'CRITICAL') riskColor = '#DC2626';
        doc.fillColor(riskColor).text(q.riskLevel, colX[3], y);

        doc.fillColor('#333333');
        doc.text(`$${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX[4], y);

        y += 20;
      });

      doc.end();
    });

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="DealFlow360_Report.pdf"'
      }
    });

  } catch (error) {
    console.error('PDF generation error', error);
    return new NextResponse('Failed to generate report', { status: 500 });
  }
}
