const mongoose = require('mongoose');
const {Schema} = mongoose;

const discountTypesEnum = {
    values: ['percentage', 'fixed'],
    message: 'enum validator failed for discount Types'
}

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: discountTypesEnum,
        default: "percentage"
    },
    discountValue: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }

}, {timestamps: true});

const virtual  = couponSchema.virtual('id');
virtual.get(function(){
    return this._id;
})
couponSchema.set('toJSON',{
    virtuals: true,
    versionKey: false,
    transform: function (doc,ret) { delete ret._id}
})

module.exports = mongoose.model("Coupon" ,couponSchema)