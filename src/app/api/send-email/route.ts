import { Resend } from "resend";

export async function POST(req: Request) {
const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { email, message, tableHtml} = await req.json();
    if (!email) {
      return Response.json({ success: false, error: "Email is required" });
    }

    const htmlContent = `
      <div style="font-family: Arial; padding:20px;">
        <h2>📩 New Message</h2>
        ${message ? `<p>${message}</p>` : ""}
        ${
          tableHtml
            ? `<div style="margin-top:20px;">
                 <h3>📊 Table Data</h3>
                 ${tableHtml}
               </div>`
            : ""
        }

        <p style="margin-top:20px; font-size:12px; color:#999;">
          Sent from your dashboard
        </p>
      </div>
    `;

    const response = await resend.emails.send({
      from: "onboarding@resend.dev", // test sender
      to: email,
      subject: "New Message",
      html: htmlContent,
    });

    return Response.json({ success: true, data: response });

  } catch (error: any) {
    console.error("EMAIL ERROR:", error);

    return Response.json({
      success: false,
      error: error.message,
    });
  }
}