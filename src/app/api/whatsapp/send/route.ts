import { NextRequest, NextResponse } from "next/server";
import {
  dispatchWhatsAppMessage,
  buildWhatsAppTextMessage,
  buildWhatsAppInteractiveButtons,
} from "@/services/whatsappService";
import { WhatsAppOutgoingMessage } from "@/types";

/**
 * Outbound WhatsApp Dispatch API Route
 * POST /api/whatsapp/send
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, message, buttons } = body;

    if (!to || !message) {
      return NextResponse.json({ error: "Missing 'to' or 'message' field" }, { status: 400 });
    }

    let outgoing: WhatsAppOutgoingMessage;
    if (buttons && Array.isArray(buttons) && buttons.length > 0) {
      outgoing = buildWhatsAppInteractiveButtons(to, message, buttons);
    } else {
      outgoing = buildWhatsAppTextMessage(to, message);
    }

    const result = await dispatchWhatsAppMessage(outgoing);
    return NextResponse.json({ success: result.success, result, outgoing }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}
