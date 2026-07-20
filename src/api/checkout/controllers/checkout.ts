export default {
    async quote(ctx: any) {
        const { items, shippingMethodId, paymentMethod } = ctx.request.body ?? {};
        try{
            const quote = await strapi
                .service("api::checkout.checkout")
                .computeQuote({ items, shippingMethodId, paymentMethod });
            ctx.body = quote;
        } catch (err: any){
            ctx.badRequest(err.message);
        }
    },
    async placeCod(ctx: any){
        const { items, shippingMethodId, contact, shippingAddress, customerId } = ctx.request.body ?? {};

        try{
            const result = await strapi
                .service("api::checkout.checkout")
                .placeCodOrder({ items, shippingMethodId, shippingAddress, contact, customerId });
            ctx.body = result;
        } catch(err: any) {
            ctx.badRequest(err.message, { issues: err.issues });
        }
    },

    async findOrder(ctx: any) {
        const { orderNumber } = ctx.params;
        const { token } = ctx.query;

        try {
            const order = await strapi
                .service("api::checkout.checkout")
                .findOrderByToken({ orderNumber, token});
            if(!order) return ctx.notFound("Order not found!");
            ctx.body = order;
        } catch(err: any) {
            ctx.badRequest(err.message);
        }
    },

    async createPaymentIntent(ctx: any) {
        const { items, shippingMethodId, contact, shippingAddress, customerId } = ctx.request.body ?? {};

        try{
            const result = await strapi
                            .service("api::checkout.checkout")
                            .createCardPaymentIntent({ items, shippingMethodId, contact, shippingAddress, customerId });;
            ctx.body = result;
        } catch(err: any) {
            ctx.badRequest(err.message, { issues: err.issues});
        }
    },

    async stripeWebhook(ctx: any) {
        const signature = ctx.request.headers["stripe-signature"];
        const rawBody = ctx.request.body?.[Symbol.for("unparsedBody")];

        try {
            const result = await strapi
                .service("api::checkout.checkout")
                .handleStripeEvent(rawBody, signature);
            ctx.body = result;
        } catch(err: any) {
            strapi.log.error("Strapi webhook failed: " + err.message);
            ctx.status = 400;
            ctx.body = { error: err.message };
        }
    },
};