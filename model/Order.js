const mongoose = require ('mongoose');
const {Schema} = mongoose;

const paymentMethods = {
    values: ['card', 'cash'],
    message: 'enum validator failed for payment Methods'
}

const orderSchema = new Schema({
    items: { type: [Schema.Types.Mixed], required: true, },
    user: { type: Schema.Types.ObjectId, ref:'User', required: true },
    totalAmount: { type: Number, required: true },
    totalItems: { type: Number, required: true },
    paymentmethod: { type: String, required: true , enum: paymentMethods},
    paymentStatus: { type: String, default: 'pending' },
    selectedAddress: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true },
}, {timestamps: true});

const virtual  = orderSchema.virtual('id');
virtual.get(function(){
    return this._id;
})
orderSchema.set('toJSON',{
    virtuals: true,
    versionKey: false,
    transform: function (doc,ret) { delete ret._id}
})

module.exports = mongoose.model("Order", orderSchema);

