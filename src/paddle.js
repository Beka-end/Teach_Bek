// Paddle (international card payments) configuration and helpers.
// The client-side token is public — it is safe to keep in frontend code.

const PADDLE_TOKEN = "live_e3f01ad376a696a45f832943c7e";
const PREMIUM_PRICE_ID = "pri_01ktkwrwz0t2xmv0ftmssv88f9";

let initialized = false;

export function initPaddle() {
  if (initialized) return;
  if (typeof window === "undefined" || !window.Paddle) return;
  try {
    window.Paddle.Environment.set("production");
    window.Paddle.Initialize({ token: PADDLE_TOKEN });
    initialized = true;
  } catch (e) {
    console.error("Paddle init error", e);
  }
}

// Opens the Paddle checkout overlay for the Premium subscription.
// email: the logged-in user's email (prefills checkout)
// userId: passed as custom data so the backend webhook can match the user
export function openPaddleCheckout(email, userId) {
  if (!window.Paddle) {
    alert("Payment is loading, please try again in a moment.");
    return;
  }
  initPaddle();
  window.Paddle.Checkout.open({
    items: [{ priceId: PREMIUM_PRICE_ID, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { user_id: userId || "" },
    settings: { displayMode: "overlay", theme: "dark", locale: "en" },
  });
}
