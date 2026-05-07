/**
 * SMS sending via Verimor (sms.verimor.com.tr).
 * Set env vars: VERIMOR_USERNAME, VERIMOR_PASSWORD, VERIMOR_SOURCE (optional, default "KAENAILS")
 *
 * If credentials are not set, the code is logged to stdout (dev/test mode).
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const username = process.env.VERIMOR_USERNAME;
  const password = process.env.VERIMOR_PASSWORD;
  const source = process.env.VERIMOR_SOURCE ?? "KAENAILS";

  if (!username || !password) {
    console.log(`[SMS-DEV] To: ${to} | ${message}`);
    return;
  }

  // Normalize: strip non-digits, ensure starts with 90
  const digits = to.replace(/\D/g, "");
  const phone = digits.startsWith("90")
    ? digits
    : digits.startsWith("0")
    ? "9" + digits
    : "90" + digits;

  const body: Record<string, unknown> = {
    username,
    password,
    messages: [{ dest: phone, msg: message }],
  };
  if (source) body.source_addr = source;

  const res = await fetch("https://sms.verimor.com.tr/v2/send.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`Verimor hata: ${text}`);
  }
}
