const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // مكتبة لتشفير كلمة المرور

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"]
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true, // يمنع تكرار الإيميل في قاعدة البيانات
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email"
      ]
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    phoneNumber: {
      type: String
    }
  },
  { timestamps: true }
);

// --- (Middleware) لتشفير كلمة المرور قبل الحفظ ---
userSchema.pre("save", async function () {
  // إذا لم يتم تعديل كلمة المرور، اخرج من الدالة (بدون next)
  if (!this.isModified("password")) return;

  // التشفير
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // في الدوال الـ async، بمجرد انتهاء الكود يعتبر الانتقال للمرحلة التالية تلقائياً
});

module.exports = mongoose.model("User", userSchema);
