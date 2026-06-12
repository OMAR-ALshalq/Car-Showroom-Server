const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    model: { type: String, required: true },
    bodyType: { type: String, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    images: [String],
    color: { type: String, required: true },
    mileage: {
      value: { type: Number, default: 0 }, // القيمة الرقمية (مثلاً: 50000)
      unit: { type: String, enum: ["km", "mi"], default: "km" } // الوحدة: كيلومتر أو ميل
    },
    engine: {
      cylinders: { type: Number },
      horsepower: { type: Number },
      capacityLitre: { type: Number },
      capacityCC: { type: Number },
      transmission: { type: String },
      fulType: { type: String }
    },
    qrCode: { type: String },
    description: { type: String },
    safetyFeatures: [{ type: String }],
    comfortFeatures: [{ type: String }],
    techFeatures: [{ type: String }],
    status: { type: String, enum: ["available", "sold"], default: "available" }
  },
  { timestamps: true }
); // يضيف وقت الإنشاء والتحديث تلقائياً

module.exports = mongoose.model("Car", carSchema);
