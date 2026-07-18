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
        }
    ],
};