import { NextRequest, NextResponse } from "next/server";
import {
  processWhatsAppIncomingMessage,
  dispatchWhatsAppMessage,
} from "@/services/whatsappService";
import { WhatsAppIncomingMessage } from "@/types";

/**
 * WhatsApp Cloud API Webhook Route
 *
 * GET: Webhook verification challenge from Meta
 * POST: Incoming WhatsApp message notification
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "agripulse_verify_token_secure";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check Meta WhatsApp standard payload format
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];
        const incoming: WhatsAppIncomingMessage = {
          from: msg.from,
          id: msg.id,
          timestamp: msg.timestamp || new Date().toISOString(),
          type: msg.type || "text",
          text: msg.text ? { body: msg.text.body } : undefined,
          image: msg.image ? { id: msg.image.id, mime_type: msg.image.mime_type, caption: msg.image.caption } : undefined,
          audio: msg.audio ? { id: msg.audio.id, mime_type: msg.audio.mime_type, voice: msg.audio.voice } : undefined,
          interactive: msg.interactive,
        };

        const outbound = await processWhatsAppIncomingMessage(incoming);
        await dispatchWhatsAppMessage(outbound);

        return NextResponse.json({ status: "processed", reply: outbound }, { status: 200 });
      }

      return NextResponse.json({ status: "acknowledged_no_message" }, { status: 200 });
    }

    // Direct JSON format support for internal testing / headless simulations
    if (body.from && (body.text || body.image || body.audio || body.interactive)) {
      const incoming: WhatsAppIncomingMessage = {
        from: body.from,
        id: body.id || `msg_${Date.now()}`,
        timestamp: body.timestamp || new Date().toISOString(),
        type: body.type || (body.image ? "image" : body.audio ? "audio" : body.interactive ? "interactive" : "text"),
        text: body.text,
        image: body.image,
        audio: body.audio,
        interactive: body.interactive,
      };

      const outbound = await processWhatsAppIncomingMessage(incoming);
      const dispatchResult = await dispatchWhatsAppMessage(outbound);

      return NextResponse.json(
        {
          success: true,
          incomingReceived: incoming,
          outgoingReply: outbound,
          dispatchResult,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
