import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentTransaction,
  verifyAndCompletePayment,
  recordPaymentFailure,
  calculateMultiPartyRevenueBreakdown,
} from "@/services/billingAndRevenueService";
import { calculateEstimatedPricing } from "@/services/pricingService";

/**
 * /api/billing/transaction — Multi-Party Payment & Transaction API
 *
 * Supports true state machine:
 * POST: Initiate payment intent (starts in "pending")
 * GET: Retrieve transaction status & transparent multi-party breakdown
 * PATCH: Verified callback / technician COD receipt (moves to "completed" or "failed")
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      repairRequestId,
      jobCardId,
      farmerId,
      farmerPhone,
      serviceCentreId,
      technicianId,
      supplierId,
      paymentMethod = "upi",
      pricing,
      machineType,
      distanceKm,
      partIds,
      notes,
    } = body;

    if (!repairRequestId || !farmerPhone) {
      return NextResponse.json(
        { error: "Missing required fields: repairRequestId and farmerPhone" },
        { status: 400 }
      );
    }

    // Resolve or calculate pricing breakdown
    const resolvedPricing =
      pricing ||
      calculateEstimatedPricing({
        machineType: machineType || "Tractor",
        distanceKm: distanceKm || 5,
        recommendedPartIds: partIds || [],
      });

    const txn = createPaymentTransaction({
      repairRequestId,
      jobCardId,
      farmerId: farmerId || "farmer-default",
      farmerPhone,
      serviceCentreId,
      technicianId,
      supplierId,
      pricing: resolvedPricing,
      paymentMethod,
      notes,
    });

    return NextResponse.json({ success: true, transaction: txn }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create transaction" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, action, gatewayReference, externalTransactionId, verifiedBy, failureReason } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
    }

    if (action === "complete" || action === "verify") {
      const result = verifyAndCompletePayment({
        transactionId,
        gatewayReference,
        externalTransactionId,
        verifiedBy,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, transaction: result.transaction }, { status: 200 });
    }

    if (action === "fail" || failureReason) {
      const result = recordPaymentFailure({
        transactionId,
        failureReason: failureReason || "Payment rejected or timed out",
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, transaction: result.transaction }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action. Use 'complete' or 'fail'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update transaction" }, { status: 500 });
  }
}
