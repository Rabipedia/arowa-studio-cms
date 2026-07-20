export default {
    routes: [
        {
            method: "POST",
            path: "/checkout/quote",
            handler: "checkout.quote",
            config: { auth: false},
        },
        {
            method: "POST",
            path: "/checkout/place-cod-order",
            handler: "checkout.placeCod",
            config: { auth: false },
        },
        {
            method: "GET",
            path: "/checkout/order/:orderNumber",
            handler: "checkout.findOrder",
            config: { auth: false },
        },
        {
            method: "POST",
            path: "/checkout/create-payment-intent",
            handler: "checkout.createPaymentIntent",
            config: { auth: false },
        },
        {
            method: "POST",
            path: "/stripe/webhook",
            handler: "checkout.stripeWebhook",
            config: { auth: false },
        }
    ],
};