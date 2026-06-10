const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const CryptoJS = require("crypto-js");
const Car = require("./models/car");
const Classification = require("./models/Classification");
const User = require("./models/user");

dotenv.config();
const app = express();

// Middlewares
app.use(express.json());
// app.use(cors());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // تطوير Frontend
      "http://localhost:5174", // تطوير Dashboard
      "https://car-showroom-36rh.onrender.com", // Frontend على Render
      "https://car-showroom-dashbord.onrender.com" // Dashboard على Render
    ],
    credentials: true
  })
);

// الاتصال بـ MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas - AlmalihMotors"))
  .catch((err) => console.error("❌ Connection error:", err));

// --- المسارات (Routes) ---

// Api Login
app.post("/api/login", async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    console.log("--- محاولة دخول جديدة لـ AlmalihMotors ---");

    // نستخدم .select("+password") للتأكد من جلب الباسورد حتى لو كان مخفياً في الموديل
    const user = await User.findOne({ email: email }).select("+password");

    if (!user) {
      console.log("❌ الإيميل غير موجود");
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // تأكد من أن الباسورد وصل فعلاً من القاعدة
    if (!user.password) {
      console.log("❌ خطأ: لم يتم سحب الباسورد من قاعدة البيانات!");
      return res.status(500).json({ message: "خطأ في بنية البيانات" });
    }

    // المقارنة
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const encryptedRole = CryptoJS.AES.encrypt(
        user.role,
        process.env.SECRET_KEY
      ).toString();
      console.log("✅ تم الدخول بنجاح");
      res.status(200).json({
        message: "Login Successful",
        token: "VALID_TOKEN_123",
        user: {
          userName: user.name,
          userEmail: user.email,
          userRole: encryptedRole
        }
      });
    } else {
      console.log("❌ كلمة المرور لا تطابق الهاش");
      res.status(401).json({ message: "كلمة المرور غير صحيحة" });
    }
  } catch (error) {
    console.error("Internal Error Details:", error);
    res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
});

// Api User
// start
// جلب جميع المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    // جلب جميع المستخدمين من قاعدة البيانات
    // .select('-password') تضمن استثناء حقل كلمة المرور تماماً من النتيجة
    const users = await User.find().select("-password");

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "لا يوجد مستخدمين مسجلين حالياً" });
    }

    res.status(200).json({
      count: users.length, // عدد المستخدمين الكلي
      users: users
    });
  } catch (err) {
    res.status(500).json({
      error: "حدث خطأ أثناء جلب قائمة المستخدمين",
      details: err.message
    });
  }
});

//  جلب بيانات مستخدم معين بواسطة الـ ID
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // البحث عن المستخدم مع استثناء كلمة المرور
    const user = await User.findById(userId).select("-password");

    // إذا لم يتم العثور على المستخدم
    if (!user) {
      return res
        .status(404)
        .json({ message: "عذراً، هذا المستخدم غير مسجل في النظام" });
    }

    // إرجاع بيانات المستخدم
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({
      error: "حدث خطأ، تأكد من صحة الـ ID المرسل",
      details: err.message
    });
  }
});

// اضافة مستخدم جديد
app.post("/api/add/users/register", async (req, res) => {
  try {
    const { name, phoneNumber, email, password, role } = req.body;

    // ✅ تحقق من الحقول المطلوبة
    if (!name || !email || !password) {
      return res.status(400).json({ message: "يرجى ملء جميع الحقول المطلوبة" });
    }

    // ✅ تحقق من وجود المستخدم
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "المستخدم موجود بالفعل" });
    }

    // ✅ أنشئ المستخدم
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber || "",
      role: role || "user"
    });

    res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });
  } catch (err) {
    // ✅ أرسل الخطأ الحقيقي للكونسول
    console.error("خطأ في إنشاء المستخدم:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// حذف مستخدم من خلال ال Id
app.delete("/api/delete/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // البحث عن المستخدم وحذفه
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.status(200).json({
      message: "تم حذف المستخدم بنجاح",
      deletedUserName: deletedUser.name
    });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ أثناء الحذف أو الـ ID غير صحيح" });
  }
});

// تعديل مستخدم من خلال ال id
app.put("/api/edit/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber; // ✅ أضف هذا السطر

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    res.status(200).json({ message: "تم تحديث البيانات بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// End

// Api Cars
// start
// 1. جلب كل السيارات (للمعرض)
app.get("/api/cars", async (req, res) => {
  try {
    const cars = await Car.find().select({
      brand: 1,
      model: 1,
      bodyType: 1,
      year: 1,
      price: 1,
      color: 1,
      mileage: 1,
      engine: 1,
      qrCode: 1,
      description:1,
      safetyFeatures: 1,
      comfortFeatures: 1,
      techFeatures: 1,
      status: 1,
      // ✅ يرجع أول صورة فقط من المصفوفة
      images: { $slice: 1 }
    });

    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// app.get("/api/cars", async (req, res) => {
//   try {
//     const cars = await Car.find();
//     res.json(cars);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// ✅ API لأحدث 8 سيارات
app.get("/api/cars/latest", async (req, res) => {
  try {
    const cars = await Car.find()
      .select("brand model year price images description engine mileage")
      .sort({ createdAt: -1 })
      .limit(8);
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ API للسيارات أقل من 15,000$
app.get("/api/cars/affordable", async (req, res) => {
  try {
    const cars = await Car.find({ price: { $lt: 15000 } })
      .select("brand model year price images description engine mileage")
      .limit(8);
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جلب سيارة من خلال ال id
app.get("/api/cars/:id", async (req, res) => {
  try {
    // 1. استخراج الـ ID من رابط الطلب (URL)
    const { id } = req.params;

    // 2. البحث عن السيارة في قاعدة البيانات باستخدام الـ ID
    const car = await Car.findById(id);

    // 3. التحقق مما إذا كانت السيارة موجودة
    if (!car) {
      return res.status(404).json({ message: "عذراً، السيارة غير موجودة" });
    }

    // 4. إرجاع بيانات السيارة
    res.json(car);
  } catch (err) {
    // في حال كان الـ ID بصيغة غير صحيحة أو حدث خطأ في السيرفر
    console.error(err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب بيانات السيارة" });
  }
});

// app.post("/api/add/cars", async (req, res) => {
//   try {
//     const { brand, model, bodyType } = req.body;

//     // 1. معالجة البراند (Brand)
//     let brandDoc = await Classification.findOne({ name: brand, type: "brand" });
//     if (!brandDoc) {
//       brandDoc = await Classification.create({ name: brand, type: "brand" });
//     }

//     // 2. معالجة نوع الجسم (Body Type)
//     let bodyTypeDoc = await Classification.findOne({
//       name: bodyType,
//       type: "bodyType"
//     });
//     if (!bodyTypeDoc) {
//       bodyTypeDoc = await Classification.create({
//         name: bodyType,
//         type: "bodyType"
//       });
//     }

//     // 3. معالجة الموديل (Model)
//     let modelDoc = await Classification.findOne({
//       name: model,
//       type: "model",
//       parentId: brandDoc._id
//     });

//     if (!modelDoc) {
//       modelDoc = await Classification.create({
//         name: model,
//         type: "model",
//         parentId: brandDoc._id
//       });
//     }

//     // 4. حفظ السيارة أولاً للحصول على الـ ID
//     const newCar = new Car(req.body);
//     let savedCar = await newCar.save();

//     // 5. إنشاء رابط الـ QR Code باستخدام الـ ID الخاص بالسيارة المحفوظة
//     // استبدل 'yourdomain.com' برابط موقعك الحقيقي
//     // const qrLink = `https://yourdomain.com/car/${savedCar._id}`;
//     const qrLink = `https://www.youtube.com/`;

//     // 6. تحديث حقل qrCode في سجل السيارة
//     savedCar.qrCode = qrLink;
//     await savedCar.save();

//     res.status(201).json({
//       message: "تم إضافة السيارة وتحديث التصنيفات وإنشاء رابط QR بنجاح",
//       car: savedCar
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(400).json({ error: err.message });
//   }
// });

// test
app.post("/api/add/cars", async (req, res) => {
  try {
    const { brand, model, bodyType } = req.body;

    // 1. معالجة البراند (التأكد من وجوده في التصنيفات)
    let brandDoc = await Classification.findOne({ name: brand, type: "brand" });
    if (!brandDoc) {
      brandDoc = await Classification.create({ name: brand, type: "brand" });
    }

    // 2. معالجة الموديل (ربطه بالبراند في جدول التصنيفات)
    let modelDoc = await Classification.findOne({
      name: model,
      type: "model",
      parentId: brandDoc._id
    });
    if (!modelDoc) {
      modelDoc = await Classification.create({
        name: model,
        type: "model",
        parentId: brandDoc._id
      });
    }

    // 3. معالجة نوع البدي (ربطه بالموديل في جدول التصنيفات)
    let bodyTypeDoc = await Classification.findOne({
      name: bodyType,
      type: "bodyType",
      parentId: modelDoc._id
    });
    if (!bodyTypeDoc) {
      bodyTypeDoc = await Classification.create({
        name: bodyType,
        type: "bodyType",
        parentId: modelDoc._id
      });
    }

    // 4. حفظ السيارة (تخزين الأسماء النصية كما طلبت)
    const newCar = new Car({
      ...req.body,
      brand: brand, // هنا نخزن "Toyota" وليس الـ ID
      model: model, // هنا نخزن "كامري" وليس الـ ID
      bodyType: bodyType // هنا نخزن "سيدان" وليس الـ ID
    });

    let savedCar = await newCar.save();

    // 5. إنشاء الـ QR Code بالرابط الصحيح لصفحة التفاصيل
    savedCar.qrCode = `https://car-showroom-36rh.onrender.com/detailsCar/${savedCar._id}#detailsCar`;
    await savedCar.save();

    res.status(201).json({
      message: "تم إضافة السيارة بالأسماء النصية بنجاح وتحديث شجرة التصنيفات",
      car: savedCar
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});
// ===============================

//  حذف سيارة من خلال الـ ID
app.delete("/api/delete/cars/:id", async (req, res) => {
  try {
    const carId = req.params.id;

    // البحث عن السيارة وحذفها من قاعدة البيانات
    const deletedCar = await Car.findByIdAndDelete(carId);

    // إذا لم يتم العثور على السيارة بهذا الـ ID
    if (!deletedCar) {
      return res.status(404).json({ message: "السيارة غير موجودة في المعرض" });
    }

    res.status(200).json({
      message: "تم حذف السيارة من المعرض بنجاح",
      details: {
        brand: deletedCar.brand,
        model: deletedCar.model
      }
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "حدث خطأ أثناء محاولة الحذف، تأكد من صحة الـ ID" });
  }
});

// تعديل بيانات سيارة من خلال الid
app.put("/api/edit/cars/:id", async (req, res) => {
  try {
    const carId = req.params.id;
    const updates = req.body;

    // نستخدم findByIdAndUpdate مع خيار new: true للحصول على البيانات بعد التعديل
    // وخيار runValidators للتأكد من أن البيانات الجديدة تتبع شروط السكيما
    const updatedCar = await Car.findByIdAndUpdate(carId, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedCar) {
      return res.status(404).json({ message: "السيارة غير موجودة لتعديلها" });
    }

    res.status(200).json({
      message: "تم تحديث بيانات السيارة بنجاح ",
      car: updatedCar
    });
  } catch (err) {
    res.status(500).json({
      error: "فشل التحديث، تأكد من صحة البيانات المرسلة أو الـ ID",
      details: err.message
    });
  }
});
// End

// Url التصنيفات
// start
// جلب التصنيفات

app.get("/api/classifications/all", async (req, res) => {
  try {
    // جلب جميع التصنيفات
    const allItems = await Classification.find().lean();

    // تنظيم البيانات برمجياً لسهولة استخدامها في الفرونت إند
    const data = {
      brands: allItems.filter((item) => item.type === "brand"),
      bodyTypes: allItems.filter((item) => item.type === "bodyType"),
      models: allItems.filter((item) => item.type === "model")
    };

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جلب الماراكات مع عدد السيارات في كل ماركة

app.get("/api/brands-with-count", async (req, res) => {
  try {
    // 1. جلب الماركات من جدول التصنيفات
    const brands = await Classification.find({ type: "brand" }).select(
      "name image"
    );

    // 2. تجميع عدد السيارات من جدول السيارات (Grouping)
    const carCounts = await Car.aggregate([
      {
        $group: {
          _id: { $trim: { input: { $toLower: "$brand" } } }, // تجميع بالاسم الصغير وبدون مسافات
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. دمج النتائج
    const result = brands.map((brand) => {
      // تنظيف اسم الماركة الحالي للمقارنة
      const normalizedBrandName = brand.name.trim().toLowerCase();

      // البحث عن المطابق في نتائج التجميع
      const match = carCounts.find((c) => c._id === normalizedBrandName);

      return {
        _id: brand._id,
        name: brand.name,
        image: brand.image,
        carsCount: match ? match.count : 0
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error fetching brands count:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// جلب جميع الموديلات
app.get("/api/unique-models", async (req, res) => {
  try {
    // جلب الأسماء الفريدة فقط بشرط أن يكون النوع model
    const models = await Classification.distinct("name", { type: "model" });

    res.status(200).json({
      success: true,
      data: models
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching unique models",
      error: error.message
    });
  }
});

// جلب تصنيفات الشكل من البيانات
app.get("/api/body-types", async (req, res) => {
  try {
    // جلب العناصر التي نوعها bodyType فقط
    // واستخدام .distinct('name') لضمان عدم تكرار الأسماء برمجياً من قاعدة البيانات
    const bodyTypes = await Classification.find({ type: "bodyType" })
      .select("name image")
      .lean(); // lean تجعل الاستعلام أسرع لأنها تعيد JSON خام

    // إذا أردت التأكد من عدم تكرار الأسماء يدوياً (في حال وجود أسماء متشابهة بحروف كبيرة وصغيرة)
    const uniqueBodyTypes = [];
    const seenNames = new Set();

    bodyTypes.forEach((item) => {
      const normalizedName = item.name.trim().toLowerCase();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        uniqueBodyTypes.push(item);
      }
    });

    res.json({
      success: true,
      data: uniqueBodyTypes
    });
  } catch (err) {
    console.error("Error fetching body types:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API لجلب التصنيفات مترابطة
app.get("/api/classifications/hierarchy", async (req, res) => {
  try {
    const data = await Classification.find({ type: "bodyType" }).populate({
      path: "parentId", // هذا سيجلب الموديل
      populate: {
        path: "parentId", // هذا سيجلب البراند
        model: "Classification"
      }
    });

    // سيعود لك كائن يحتوي على: البدي -> الموديل -> البراند
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// اضافة تصنيف جديد
// مسار إضافة تصنيف كامل (ماركة + موديل + هيكل) مع الصورة
app.post("/api/add/classifications", async (req, res) => {
  try {
    const { brand, model, bodyType, imageUrl } = req.body;

    // 1. منطق البحث عن صورة تلقائية
    let finalImageUrl = imageUrl;

    // إذا لم يقم المستخدم برفع صورة جديدة، نبحث عن صورة موجودة لهذه الماركة
    if (!finalImageUrl) {
      const existingBrand = await Classification.findOne({
        name: brand,
        type: "brand",
        image: { $exists: true, $ne: "" }
      });

      if (existingBrand) {
        finalImageUrl = existingBrand.image;
      }
    }

    // 2. التعامل مع الماركة (الجد)
    // نستخدم finalImageUrl سواء كانت مرفوعة حديثاً أو مسترجعة من قاعدة البيانات
    let brandDoc = await Classification.findOneAndUpdate(
      { name: brand, type: "brand" },
      {
        name: brand,
        type: "brand",
        parentId: null,
        // نحدث الصورة فقط إذا توفرت واحدة (جديدة أو قديمة)
        ...(finalImageUrl && { image: finalImageUrl })
      },
      { upsert: true, new: true }
    );

    // 3. التعامل مع الموديل (الأب)
    let modelDoc = await Classification.findOneAndUpdate(
      { name: model, type: "model", parentId: brandDoc._id },
      { name: model, type: "model", parentId: brandDoc._id },
      { upsert: true, new: true }
    );

    // 4. التعامل مع نوع الهيكل (الابن)
    let bodyTypeDoc = await Classification.findOneAndUpdate(
      { name: bodyType, type: "bodyType", parentId: modelDoc._id },
      { name: bodyType, type: "bodyType", parentId: modelDoc._id },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: "تم حفظ التصنيفات بنجاح",
      data: bodyTypeDoc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// app.post("/api/add/classifications", async (req, res) => {
//   try {
//     const { brand, model, bodyType, imageUrl } = req.body;

//     // 1. التعامل مع الماركة (الجد)
//     // نستخدم findOneAndUpdate مع upsert لإنشاء الماركة إذا لم تكن موجودة وتحديث صورتها
//     let brandDoc = await Classification.findOneAndUpdate(
//       { name: brand, type: "brand" },
//       { name: brand, type: "brand", parentId: null, image: imageUrl },
//       { upsert: true, new: true }
//     );

//     // 2. التعامل مع الموديل (الأب)
//     // نربطه بالماركة التي وجدناها أو أنشأناها أعلاه
//     let modelDoc = await Classification.findOneAndUpdate(
//       { name: model, type: "model", parentId: brandDoc._id },
//       { name: model, type: "model", parentId: brandDoc._id },
//       { upsert: true, new: true }
//     );

//     // 3. التعامل مع نوع الهيكل (الابن)
//     // نربطه بالموديل، ونخزن الصورة فيه أيضاً إذا كنت تريد ذلك
//     let bodyTypeDoc = await Classification.findOneAndUpdate(
//       { name: bodyType, type: "bodyType", parentId: modelDoc._id },
//       { name: bodyType, type: "bodyType", parentId: modelDoc._id },
//       { upsert: true, new: true }
//     );

//     res.status(201).json({
//       success: true,
//       message: "تم حفظ التصنيفات بنجاح",
//       data: bodyTypeDoc
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// حذف تصنيف من خلال ال Id الخاص به
// مسار حذف تصنيف معين بناءً على معرفه
app.delete("/api/classifications/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. العثور على "نوع البدي" (مثل Sedan) المراد حذفه
    const bodyTypeToDelete = await Classification.findById(id);
    if (!bodyTypeToDelete) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }

    // 2. تخزين معرف "الموديل" (الأب) قبل حذف الابن
    const modelId = bodyTypeToDelete.parentId;

    // 3. حذف "نوع البدي" (الابن)
    await Classification.findByIdAndDelete(id);

    // 4. حذف "الموديل" (الأب) المرتبط بهذا البدي
    // ملاحظة: سيتم حذف الموديل فقط إذا كنت متأكداً أن كل موديل له نوع بدي واحد في نظامك
    if (modelId) {
      await Classification.findByIdAndDelete(modelId);
    }

    res.json({
      success: true,
      message: "تم حذف نوع البدي والموديل المرتبط به بنجاح"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل تصنيف من خلال ال Id الخاص به
// مسار تعديل تصنيف موجود
app.put("/api/edit/classifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, bodyType, imageUrl } = req.body;

    // 1. تحديث العنصر الحالي (BodyType)
    const currentBodyType = await Classification.findById(id);
    if (!currentBodyType)
      return res.status(404).json({ message: "العنصر غير موجود" });

    // تحديث اسم الهيكل وصورته إذا أرسلت
    currentBodyType.name = bodyType;
    if (imageUrl) currentBodyType.image = imageUrl;
    await currentBodyType.save();

    // 2. تحديث الموديل (الأب)
    const modelDoc = await Classification.findById(currentBodyType.parentId);
    if (modelDoc) {
      modelDoc.name = model;
      await modelDoc.save();

      // 3. تحديث الماركة (الجد) وصورتها
      const brandDoc = await Classification.findById(modelDoc.parentId);
      if (brandDoc) {
        brandDoc.name = brand;
        if (imageUrl) brandDoc.image = imageUrl; // تحديث شعار الماركة أيضاً
        await brandDoc.save();
      }
    }

    res.json({ success: true, message: "تم التحديث بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================

// للبحث من خلال brand او model او bodyType
app.get("/api/catalog/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // 1. نبحث أولاً في جدول التصنيفات (Classification)
    // نفترض هنا أن الـ slug هو نفسه الاسم (name) أو حقل مخصص للـ slug
    const category = await Classification.findOne({ name: slug });

    if (!category) {
      return res
        .status(404)
        .json({ message: "التصنيف غير موجود في جدول التصنيفات" });
    }

    // 2. الآن نستخدم البيانات الموجودة داخل الـ category (التي وجدناها)
    // لتحديد كيف سنبحث في جدول السيارات
    let carQuery = {};

    // نعتمد على حقل type الموجود داخل وثيقة التصنيف التي جلبناها للتو
    if (category.type === "brand") {
      carQuery = { brand: category.name };
    } else if (category.type === "model") {
      carQuery = { model: category.name };
    } else if (category.type === "bodyType") {
      carQuery = { bodyType: category.name };
    }

    // 3. جلب السيارات المرتبطة بهذا "التصنيف" المحدد
    const cars = await Car.find(carQuery).sort({ createdAt: -1 });

    // 4. نعيد النتيجة التي تشمل بيانات التصنيف والسيارات التابعة له
    res.status(200).json({
      info: {
        title: category.name,
        type: category.type,
        image: category.image // مثلاً لو كان شعار الماركة
      },
      resultsCount: cars.length,
      cars: cars
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// البحث عن سيارة من خلال الشركة المصنعة و النوع و  نوع الجسم
app.get("/api/search/:brand/:model/:bodyType", async (req, res) => {
  try {
    const { brand, model, bodyType } = req.params;

    // 1. البحث عن التصنيفات الثلاثة في جدول Classification لضمان وجودها
    // نستخدم Promise.all لتنفيذ عمليات البحث بالتوازي لتسريع الأداء
    const [brandDoc, modelDoc, bodyTypeDoc] = await Promise.all([
      Classification.findOne({ name: brand, type: "brand" }),
      Classification.findOne({ name: model, type: "model" }),
      Classification.findOne({ name: bodyType, type: "bodyType" })
    ]);

    // 2. التحقق من وجود جميع التصنيفات
    if (!brandDoc || !modelDoc || !bodyTypeDoc) {
      return res.status(404).json({
        message:
          "واحد أو أكثر من التصنيفات المطلوبة غير موجود في قاعدة البيانات"
      });
    }

    // 3. بناء استعلام البحث في جدول السيارات باستخدام الأسماء المعتمدة من جدول التصنيفات
    // هذا يضمن أننا نبحث ببيانات "نظيفة" وموثقة
    const query = {
      brand: brandDoc.name,
      model: modelDoc.name,
      bodyType: bodyTypeDoc.name
    };

    // 4. جلب السيارات المرتبطة
    const cars = await Car.find(query).sort({ createdAt: -1 });

    // 5. إعادة النتيجة مع تفاصيل التصنيفات والسيارات
    res.status(200).json({
      classificationDetails: {
        brand: brandDoc,
        model: modelDoc,
        bodyType: bodyTypeDoc
      },
      resultsCount: cars.length,
      cars: cars
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// البحث من خلال الشركة المصنعة و النوع
app.get("/api/search/:brand/:model", async (req, res) => {
  try {
    const { brand, model } = req.params;

    // 1. التحقق من وجود البراند والموديل في جدول التصنيفات
    const [brandDoc, modelDoc] = await Promise.all([
      Classification.findOne({ name: brand, type: "brand" }),
      Classification.findOne({ name: model, type: "model" })
    ]);

    // 2. إذا لم يوجد أحدهما، نرسل خطأ
    if (!brandDoc || !modelDoc) {
      return res.status(404).json({
        message: "الماركة أو الموديل غير مسجل في التصنيفات"
      });
    }

    // 3. بناء الاستعلام للبحث في السيارات
    // ملاحظة: هنا نبحث فقط بالبراند والموديل (سيعيد كل أنواع الأجسام التابعة لهما)
    const query = {
      brand: brandDoc.name,
      model: modelDoc.name
    };

    const cars = await Car.find(query).sort({ createdAt: -1 });

    // 4. الاستجابة
    res.status(200).json({
      info: {
        brand: brandDoc.name,
        model: modelDoc.name,
        brandLogo: brandDoc.image
      },
      resultsCount: cars.length,
      cars: cars
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// البحث من خلال الشركة المصنعة فقط
app.get("/api/search/:brand", async (req, res) => {
  try {
    const { brand } = req.params;

    // 1. التحقق من وجود البراند في جدول التصنيفات
    const brandDoc = await Classification.findOne({
      name: brand,
      type: "brand"
    });

    // 2. إذا لم يوجد البراند، نرسل خطأ 404
    if (!brandDoc) {
      return res.status(404).json({
        message: "هذه الماركة غير مسجلة في قائمة التصنيفات"
      });
    }

    // 3. جلب جميع السيارات المرتبطة بهذا البراند
    // سيعيد هذا البحث كل الموديلات وكل أنواع الأجسام التابعة لهذه الماركة
    const cars = await Car.find({ brand: brandDoc.name }).sort({
      createdAt: -1
    });

    // 4. الاستجابة النهائية
    res.status(200).json({
      info: {
        brand: brandDoc.name,
        image: brandDoc.image, // شعار الماركة
        totalModels: await Classification.countDocuments({
          parentId: brandDoc._id,
          type: "model"
        }) // اختياري: عدد الموديلات المتاحة لهذه الماركة
      },
      resultsCount: cars.length,
      cars: cars
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// end
app.put("/api/update-old-qrcodes", async (req, res) => {
  try {
    const result = await Car.updateMany(
      { qrCode: "https://www.youtube.com/" },
      [
        {
          $set: {
            qrCode: {
              $concat: [
                "https://car-showroom-36rh.onrender.com/detailsCar/",
                { $toString: "$_id" },
                "#detailsCar"
              ]
            }
          }
        }
      ]
    );

    res.json({
      success: true,
      message: `✅ تم تحديث ${result.modifiedCount} سيارة بنجاح`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error("❌ خطأ في التحديث:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
