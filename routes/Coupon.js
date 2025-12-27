const express = require('express');
const { createCoupon, getAllCoupons, validateCoupon } = require('../controller/Coupon');

const router = express.Router();

router.post('/', createCoupon)
      .get('/', getAllCoupons)
      .post('/validate', validateCoupon)

exports.router = router;