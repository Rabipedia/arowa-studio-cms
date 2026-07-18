

export default {
    async computeQuote({
        items,
        shippingMethodId,
        paymentMethod,
    }: {
        items: { variantId: string; quantity: number}[];
        shippingMethodId?: string;
        paymentMethod?: string;
    }) {
        if(!Array.isArray(items) || items.length === 0) {
            throw new Error("Cart is empty");
        }

        const variantIds = items.map((i) => i.variantId);
        const variants = await strapi.db
            .query("api::product-variant.product-variant")
            .findMany({
                where: { documentId: { $in: variantIds }},
                populate: { product: true, attributeValues: true }
            });
        
        const lines: any[] = [];
        const issues: any[] = [];
        let subtotal = 0;

        for(const item of items) {
            const variant = variants.find(
                (v: any) => v.documentId === item.variantId
            );
            if(!variant) {
                issues.push({ variantId: item.variantId, reason: "not_found"});
                continue;
            }
            if(variant.stock < item.quantity) {
                issues.push({
                    variantId: item.variantId,
                    reason: "insufficient_stock",
                    available: variant.stock,
                });
            }
            const unitPrice = variant.discountPrice ?? variant.price;
            const lineTotal = unitPrice * item.quantity;
            subtotal += lineTotal;
            lines.push({
                variantId: variant.documentId,
                productName: variant.product?.name ?? "Product",
                variantLabel: 
                    variant.attributeValues?.map((av: any) => av.value).join(", ") ?? null,
                unitPrice,
                quantity: item.quantity,
                lineTotal,
            })
        }

        let shippingCost = 0;
        let shippingMethodLabel: string | null = null;
        if(shippingMethodId) {
            const method = await strapi.db
                .query("api::shipping-method.shipping-method")
                .findOne({
                    where: {documentId: shippingMethodId}
                });
            shippingCost = method?.cost ?? 0;
            shippingMethodLabel = method?.name ?? null;
        }

        const taxRate = await strapi.db
            .query("api::tax-rate.tax-rate")
            .findOne({ where: { isDefault: true }});
        const taxRatePercent  = taxRate?.rate ?? 0;
        const taxAmount = Math.round(subtotal * taxRatePercent) / 100;

        let codFee = 0;
        if(paymentMethod === "cash_on_delivery") {
            const configs = await strapi.db
                .query("api::store-config.store-config")
                .findMany({});
            const config = configs[0];
            codFee = config?.codFee ?? 0;
            const codMax =  config?.codMaxOrderValue;
            if(codMax != null && subtotal > codMax) {
                issues.push({ reason: "cod_limit_exceeded", max: codMax});
            }
        }
        const total = subtotal + shippingCost + taxAmount + codFee;

        return {
            lines,
            subtotal,
            shippingCost,
            shippingMethodLabel,
            taxRatePercent,
            taxAmount,
            codFee,
            total,
            currency: "AED",
            issues,
        };
    },
    async placeCodOrder({
        items,
        shippingMethodId,
        contact,
        shippingAddress,
        customerId
    }: {
        items: { variantId: string; quantity: number}[];
        shippingMethodId?: string;
        contact: { email: string; name?: string; phone?: string };
        shippingAddress: Record<string, unknown>;
        customerId?: number;
    }) {
        const quote = await strapi
            .service("api::checkout.checkout")
            .computeQuote({
                items,
                shippingMethodId,
                paymentMethod: "cash_on_delivery",
            });
        
        if(quote.issues.length > 0) {
            const err: any = new Error("Some items are unavailable");
            err.issues = quote.issues;
            throw err;
        }
        if(!contact?.email) {
            throw new Error("Email is required.");
        }

        const orderNumber = `ARW-${Date.now().toString(36).toUpperCase()}`;
        let order: any;

        await strapi.db.transaction(async () => {
            order = await strapi.documents("api::order.order").create({
                data: {
                    orderNumber,
                    customer: customerId ?? null,
                    guestEmail: contact.email,
                    guestName: contact.name ?? undefined,
                    orderStatus: "pending_payment",
                    paymentStatus: "unpaid",
                    paymentMethod: "cash_on_delivery",
                    shippingAddress: shippingAddress as any,
                    shippingMethod: shippingMethodId ?? null,
                    shippingMethodLabel: quote.shippingMethodLabel,
                    shippingCost: quote.shippingCost,
                    taxRateSnapshot: quote.taxRatePercent,
                    taxAmount: quote.taxAmount,
                    subtotal: quote.subtotal,
                    total: quote.total,
                    currency: quote.currency,
                    codFeeSnapshot: quote.codFee,
                    placedAt: new Date(),
                }
            });

            for(const line of quote.lines) {
                await strapi.documents("api::order-item.order-item").create({
                    data: {
                        order: order.documentId,
                        productVariant: line.variantId,
                        productNameSnapshot: line.productName,
                        variantLabelSnapshot: line.variantLabel ?? undefined,
                        unitPriceSnapshot: line.unitPrice,
                        quantity: line.quantity,
                        lineTotal: line.lineTotal,
                     }
                });

                const variant = await strapi.db
                    .query("api::product-variant.product-variant")
                    .findOne({where: { documentId: line.variantId }});
                await strapi.documents("api::product-variant.product-variant").update({
                    documentId: line.variantId,
                    data: { stock: variant.stock - line.quantity},
                });
            }
        });

        return { orderNumber, total: quote.total, currency: quote.currency };            
    },
}