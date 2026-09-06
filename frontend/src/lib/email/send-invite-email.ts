// src/lib/email/send-invite-email.ts
export async function sendInviteEmail({
  to,
  companyName,
  inviteUrl,
  invitedByName,
}: {
  to: string;
  companyName: string;
  inviteUrl: string;
  invitedByName: string;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to DealFlow360</h2>
      <p>Hello ${companyName},</p>
      <p><strong>${invitedByName}</strong> has invited you to join the DealFlow360 customer portal.</p>
      <p>With this portal, you can view your quotations, request changes, and track your orders.</p>
      <div style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Accept Invitation
        </a>
      </div>
      <p style="font-size: 12px; color: #666;">If you have any questions, please reply to this email.</p>
    </div>
  `;

  if (!RESEND_API_KEY) {
    // Hackathon fallback
    console.log("=========================================");
    console.log("📧 EMAIL SENDING MOCK");
    console.log(`To: ${to}`);
    console.log(`Subject: You've been invited to the DealFlow360 customer portal`);
    console.log(`Link: ${inviteUrl}`);
    console.log("=========================================");
    return { success: true, mocked: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DealFlow360 <onboarding@resend.dev>",
        to: [to],
        subject: "You've been invited to the DealFlow360 customer portal",
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error("Failed to send email via Resend");
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}
