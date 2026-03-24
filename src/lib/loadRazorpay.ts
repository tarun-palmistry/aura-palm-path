let razorpayPromise: Promise<boolean> | null = null;

export function loadRazorpayScript() {
  if (razorpayPromise) return razorpayPromise;

  razorpayPromise = new Promise((resolve) => {
    const existing = document.getElementById("razorpay-sdk") as HTMLScriptElement | null;
    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayPromise;
}
