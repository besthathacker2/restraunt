import nodemailer from "nodemailer";

const SMS_ADDRESS = "2503071517@txt.bell.ca";
const FROM_ADDRESS = "kiosk@yourrestaurant.com";

const transporter = nodemailer.createTransport({
  host: "smtp.bell.ca",
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false }
});

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

export async function POST(request) {
  const order = await request.json();

  const validationError = validateOrder(order);
  if (validationError) {
    return Response.json({ success: false, error: validationError }, { status: 400 });
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
    return Response.json({ success: true, message: "Order received & SMS sent" });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMS failed:`, err.message);
    return Response.json({ success: false, error: "Failed to send SMS", detail: err.message }, { status: 500 });
  }
}
