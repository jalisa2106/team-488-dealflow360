import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "this_month";
    const repId = url.searchParams.get("repId") || "";
    const status = url.searchParams.get("status") || "";
    const productId = url.searchParams.get("productId") || "";

    const now = new Date();
    const startDate = (() => {
      const d = new Date(now);
      if (period === "last_month") { d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0,0,0,0); }
      else if (period === "last_quarter") { d.setMonth(d.getMonth() - 3); d.setDate(1); d.setHours(0,0,0,0); }
      else if (period === "this_year") { d.setMonth(0); d.setDate(1); d.setHours(0,0,0,0); }
      else { d.setDate(1); d.setHours(0,0,0,0); }
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DealFlow360';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Quotes Report', {
      properties: { tabColor: { argb: 'FF0F4C81' } } // Industry standard corporate blue
    });

    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    } as ExcelJS.Style;

    sheet.columns = [
      { header: 'Quote #', key: 'quoteNumber', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Sales Rep', key: 'salesRep', width: 25 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Risk Level', key: 'risk', width: 15 },
      { header: 'Created', key: 'createdAt', width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
      cell.border = {
        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
      };
    });

    quotes.forEach((q: any) => {
      const row = sheet.addRow({
        quoteNumber: q.quoteNumber,
        customer: q.customer.companyName,
        salesRep: q.salesRep.name,
        status: q.status.replace('_', ' '),
        subtotal: Number(q.subtotal),
        discount: Number(q.discountAmount),
        total: Number(q.total),
        risk: q.riskLevel,
        createdAt: q.createdAt.toISOString().split('T')[0],
      });

      row.getCell('subtotal').numFmt = '"$"#,##0.00';
      row.getCell('discount').numFmt = '"$"#,##0.00';
      row.getCell('total').numFmt = '"$"#,##0.00';

      // Status color coding
      let statusColor = 'FF000000';
      if (q.status === 'APPROVED' || q.status === 'CONFIRMED') statusColor = 'FF16A34A'; // Green
      else if (q.status === 'PENDING_APPROVAL') statusColor = 'FFD97706'; // Orange
      else if (q.status === 'REJECTED') statusColor = 'FFDC2626'; // Red
      
      row.getCell('status').font = { color: { argb: statusColor }, bold: true };

      // Risk color
      let riskColor = 'FF16A34A';
      if (q.riskLevel === 'MEDIUM') riskColor = 'FFD97706';
      if (q.riskLevel === 'HIGH' || q.riskLevel === 'CRITICAL') riskColor = 'FFDC2626';
      
      row.getCell('risk').font = { color: { argb: riskColor }, bold: true };
    });

    const summarySheet = workbook.addWorksheet('Summary KPIs');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summarySheet.getRow(1).eachCell((cell) => cell.style = headerStyle);
    summarySheet.addRow({ metric: 'Total Quotes', value: quotes.length });
    summarySheet.addRow({ metric: 'Total Pipeline Value', value: quotes.reduce((acc: number, q: any) => acc + Number(q.total), 0) });
    summarySheet.addRow({ metric: 'Average Deal Size', value: quotes.length ? (quotes.reduce((acc: number, q: any) => acc + Number(q.total), 0) / quotes.length) : 0 });

    summarySheet.getCell('B3').numFmt = '"$"#,##0.00';
    summarySheet.getCell('B4').numFmt = '"$"#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as Buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="DealFlow360_Report.xlsx"'
      }
    });

  } catch (error) {
    console.error('XLS generation error', error);
    return new NextResponse('Failed to generate report', { status: 500 });
  }
}
