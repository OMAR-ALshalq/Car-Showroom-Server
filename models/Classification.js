const mongoose = require("mongoose");

const classificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // تويوتا، سيدان، كوريلا
    type: {
      type: String,
      required: true,
      enum: ["brand", "bodyType", "model"] // تحديد النوع
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classification",
      default: null
    }, // هذا الحقل لربط الموديل بالبراند (مثلاً كوريلا تابعة لتويوتا)
    image: { type: String } // اختياري لشعار الماركة
  },
  { timestamps: true }
);

module.exports = mongoose.model("Classification", classificationSchema);
