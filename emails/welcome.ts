/** Stub — implement real template before production. */
export function welcomeEmail(_params: {
  name: string;
  email: string;
  zip: string;
}): { html: string; text: string; subject: string } {
  return {
    subject: "Welcome to GarageRoute",
    html: "<p>Welcome to GarageRoute!</p>",
    text: "Welcome to GarageRoute!",
  };
}
