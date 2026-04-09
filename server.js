const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PORT = 3000;
const SMS_ADDRESS = "2503071517@txt.bell.ca";   // Bell SMS gateway
const FROM_ADDRESS = "kiosk@yourrestaurant.com";
// ───────────────────────────────────────────────────────────────────────────

// Send via Bell's SMTP relay — no auth required on local/LAN networks.
// If Bell blocks port 25, try port 587 with a real SMTP account (see README).
const transporter = nodemailer.createTransport({
  host: "smtp.bell.ca",
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false }
});

// ─── HELPERS ───────────────────────────────────────────────────────────────
function buildSmsText(order) {
  const itemLines = order.items
    .map(i => `  ${i.qty}x ${i.name}${i.mods?.length ? " (" + i.mods.join(", ") + ")" : ""}`)
    .join("\n");

  return [
    `🦕 New Order #${order.orderId}`,
    `Name:  ${order.name  || "N/A"}`,
    `Table: ${order.table || "N/A"}`,
    `Items:`,
    itemLines
  ].join("\n");
}

function validateOrder(order) {
  if (!order.orderId) return "Missing orderId";
  if (!Array.isArray(order.items) || order.items.length === 0) return "Order has no items";
  return null;
}

// ─── ROUTES ────────────────────────────────────────────────────────────────

// Health check — handy for testing the server is alive
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Receive order from kiosk
app.post("/order", async (req, res) => {
  const order = req.body;

  // Basic validation
  const validationError = validateOrder(order);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const smsText = buildSmsText(order);

  console.log(`[${new Date().toISOString()}] Received order #${order.orderId}`);
  console.log(smsText);

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: SMS_ADDRESS,
      subject: `New Order #${order.orderId}`,
      text: smsText
    });

    console.log(`[${new Date().toISOString()}] SMS sent for order #${order.orderId}`);
    res.json({ success: true, message: "Order received & SMS sent" });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMS failed for order #${order.orderId}:`, err.message);
    res.status(500).json({ success: false, error: "Failed to send SMS", detail: err.message });
  }
});

// ─── START ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🦕 Dino Burger backend running on http://localhost:${PORT}`);
  console.log(`   SMS target: ${SMS_ADDRESS}`);
});
