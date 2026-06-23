/** Stub — implement real template before production. */
export function savedSearchEmail(_params: {
  email: string;
  saleTitle: string;
  saleUrl: string;
  saleCity: string;
  saleState: string;
}): { html: string; text: string; subject: string } {
  return {
    subject: "New sale matches your saved search",
    html: "<p>A new sale matches your saved search.</p>",
    text: "A new sale matches your saved search.",
  };
}
