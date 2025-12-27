const Coupon = require("../model/Coupon");

exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue } = req.body;
    const expiryDate = new Date(req.body.expiryDate);

    if (isNaN(expiryDate)) {
      return res.status(400).json({ message: "Invalid expiry date" });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      expiryDate,
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCoupons = async (req, res) => {
  const coupons = await Coupon.find();
  res.status(200).json(coupons);
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return res.status(400).json({ message: "invalid coupon code" });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (coupon.discountValue / 100) * totalAmount;
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = totalAmount - discountAmount;

    res.status(200).json({
      success: true,
      coupon : coupon.code,
      discount: discountAmount,
      finalAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
