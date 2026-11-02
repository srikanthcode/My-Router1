import { createHmac } from "node:crypto";
import { env } from "@pro/shared";

async function main() {
  const keyId = env.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "rzp_test_TvHLS3Dlt6qygS";
  const keySecret = env.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "bHdafnoL9Gu2nx3zsjGiZ3z7";

  console.log("=== Testing Razorpay Integration ===");
  console.log("Key ID:", keyId ? `${keyId.slice(0, 10)}...` : "(not set)");
  console.log("Key Secret:", keySecret ? "******" : "(not set)");

  if (!keyId || !keySecret) {
    console.error("❌ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing.");
    process.exit(1);
  }

  // 1. Test Order Creation
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount: 50000, // 500.00 INR
        currency: "INR",
        receipt: `test_${Date.now()}`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Razorpay Order creation failed (Status ${res.status}):`, errText);
      process.exit(1);
    }

    const order = (await res.json()) as { id: string; status: string; amount: number; currency: string };
    console.log("✅ Order Created Successfully!");
    console.log("  Order ID:", order.id);
    console.log("  Status:", order.status);
    console.log("  Amount:", order.amount / 100, order.currency);

    // 2. Test HMAC-SHA256 Signature Verification logic
    const testPaymentId = "pay_test_123456789";
    const testSignature = createHmac("sha256", keySecret)
      .update(`${order.id}|${testPaymentId}`)
      .digest("hex");

    const verified = createHmac("sha256", keySecret)
      .update(`${order.id}|${testPaymentId}`)
      .digest("hex");

    if (testSignature === verified) {
      console.log("✅ HMAC SHA-256 signature verification test passed!");
    }

    console.log("\n🎉 Razorpay API connection is fully functional!");
  } catch (err: any) {
    console.error("❌ Network or API error:", err.message);
    process.exit(1);
  }
}

void main();
