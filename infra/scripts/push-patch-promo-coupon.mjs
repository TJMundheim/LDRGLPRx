// Validates an explicit --coupon target for `code`. Returns an error message, or null when usable.
export const couponProblem = (coupon, id) => (!coupon ? `coupon ${id} not found` : coupon.valid ? null : `coupon ${coupon.id} is not valid (expired or fully redeemed)`);
