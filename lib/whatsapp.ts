/** A prefilled wa.me link — opens WhatsApp with `message` already typed;
 * nothing is ever sent from the server, the owner still taps send. wa.me
 * only accepts digits, so anything else typed into the number field
 * (spaces, dashes, a leading "+") is stripped first. */
export function whatsAppHref(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
