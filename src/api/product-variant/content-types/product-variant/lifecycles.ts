const VARIANT_UID = 'api::product-variant.product-variant';
const PRODUCT_UID = 'api::product.product';

async function recomputeFromVariantId(variantId: number) {
  const variant = await strapi.db.query(VARIANT_UID).findOne({
    where: { id: variantId },
    populate: { product: true },
  });
  if (!variant?.product) return;
  await recomputeForProduct(variant.product.documentId);
}

async function recomputeForProduct(productDocumentId: string) {
  const variants = await strapi.db.query(VARIANT_UID).findMany({
    where: { product: { documentId: productDocumentId } },
    select: ['price', 'discountPrice'],
  });

  let displayPrice: number | null = null;
  for (const v of variants) {
    const effective = v.discountPrice ?? v.price;
    if (effective != null && (displayPrice === null || effective < displayPrice)) {
      displayPrice = effective;
    }
  }

  await strapi.db.query(PRODUCT_UID).updateMany({
    where: { documentId: productDocumentId },
    data: { displayPrice },
  });
}

export default {
  async afterCreate(event: any) {
    await recomputeFromVariantId(event.result.id);
  },

  async afterUpdate(event: any) {
    await recomputeFromVariantId(event.result.id);
  },

  async beforeDelete(event: any) {
    const variant = await strapi.db.query(VARIANT_UID).findOne({
      where: event.params.where,
      populate: { product: true },
    });
    event.state = { productDocumentId: variant?.product?.documentId ?? null };
  },

  async afterDelete(event: any) {
    if (event.state?.productDocumentId) {
      await recomputeForProduct(event.state.productDocumentId);
    }
  },

  async beforeDeleteMany(event: any) {
    const variants = await strapi.db.query(VARIANT_UID).findMany({
      where: event.params.where,
      populate: { product: true },
    });
    const ids = variants.map((v: any) => v.product?.documentId).filter(Boolean);
    event.state = { productDocumentIds: [...new Set(ids)] };
  },

  async afterDeleteMany(event: any) {
    for (const documentId of event.state?.productDocumentIds ?? []) {
      await recomputeForProduct(documentId);
    }
  },
};