// اختبارات منطق الدورات. تشغيل: node --test test/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const CourseLogic = require("../public/logic.js");
const SEED_COURSES = require("../public/data.js");

const sample = [
  { id: "1", name: "Python للمبتدئين", field: "البرمجة", category: "تقني", trainer: "أحمد علي", description: "متغيرات ودوال" },
  { id: "2", name: "تصميم UI", field: "التصميم", category: "تقني", trainer: "سارة الحربي", description: "نماذج أولية" },
  { id: "3", name: "القيادة", field: "الإدارة", category: "مهني", trainer: "نورة السالم", description: "تحفيز الفريق" },
];

test("البحث يطابق الاسم والمدرب والوصف بغض النظر عن حالة الأحرف", () => {
  assert.deepEqual(CourseLogic.filterCourses(sample, { q: "python" }).map((c) => c.id), ["1"]);
  assert.deepEqual(CourseLogic.filterCourses(sample, { q: "سارة" }).map((c) => c.id), ["2"]);
  assert.deepEqual(CourseLogic.filterCourses(sample, { q: "نماذج" }).map((c) => c.id), ["2"]);
});

test("البحث يتجاهل المسافات الزائدة حول النص", () => {
  assert.deepEqual(CourseLogic.filterCourses(sample, { q: "   القيادة  " }).map((c) => c.id), ["3"]);
});

test("نص فارغ يعيد كل الدورات", () => {
  assert.equal(CourseLogic.filterCourses(sample, { q: "" }).length, 3);
  assert.equal(CourseLogic.filterCourses(sample).length, 3);
});

test("التصفية بالمجال", () => {
  assert.deepEqual(CourseLogic.filterCourses(sample, { field: "التصميم" }).map((c) => c.id), ["2"]);
});

test("التصفية بالتصنيف تعيد كل الدورات في ذلك التصنيف", () => {
  assert.deepEqual(
    CourseLogic.filterCourses(sample, { category: "تقني" }).map((c) => c.id),
    ["1", "2"]
  );
});

test("المجال والتصنيف والنص تُطبَّق معاً (AND)", () => {
  assert.deepEqual(
    CourseLogic.filterCourses(sample, { q: "أحمد", field: "البرمجة", category: "تقني" }).map((c) => c.id),
    ["1"]
  );
  assert.deepEqual(
    CourseLogic.filterCourses(sample, { q: "أحمد", field: "التصميم" }).map((c) => c.id),
    []
  );
});

test("حقول فارغة أو غير موجودة لا تُسقط الدورة ولا تُفشل البحث", () => {
  const partial = [{ id: "x", name: "دورة", field: "عام" }];
  assert.equal(CourseLogic.filterCourses(partial, { q: "دورة" }).length, 1);
  assert.equal(CourseLogic.filterCourses(partial, { q: "غير موجود" }).length, 0);
});

test("uniqueSorted يزيل المكرر والفارغ والفراغات ويرتب عربياً", () => {
  assert.deepEqual(
    CourseLogic.uniqueSorted([" تقني ", "مهني", "تقني", "", undefined, "شخصي"]),
    ["تقني", "شخصي", "مهني"]
  );
});

test("validateCourse يقبل بيانات صحيحة", () => {
  assert.equal(CourseLogic.validateCourse({ name: "دورة", field: "عام", price: 0 }), null);
  assert.equal(CourseLogic.validateCourse({ name: "دورة", field: "عام", price: 1500.5 }), null);
});

test("validateCourse يرفض الاسم والمجال الفارغين أو المكونين من مسافات", () => {
  assert.ok(CourseLogic.validateCourse({ name: "", field: "عام", price: 10 }));
  assert.ok(CourseLogic.validateCourse({ name: "   ", field: "عام", price: 10 }));
  assert.ok(CourseLogic.validateCourse({ name: "دورة", field: "  ", price: 10 }));
});

test("validateCourse يرفض السعر السالب وغير الرقمي", () => {
  assert.ok(CourseLogic.validateCourse({ name: "دورة", field: "عام", price: -5 }));
  assert.ok(CourseLogic.validateCourse({ name: "دورة", field: "عام", price: NaN }));
  assert.ok(CourseLogic.validateCourse({ name: "دورة", field: "عام", price: Infinity }));
});

test("بيانات الدورات الأصلية سليمة", () => {
  assert.equal(SEED_COURSES.length, 6);
  const ids = new Set(SEED_COURSES.map((c) => c.id));
  assert.equal(ids.size, SEED_COURSES.length, "المعرّفات يجب أن تكون فريدة");
  for (const c of SEED_COURSES) {
    assert.ok(c.name && c.field, `الدورة ${c.id} بلا اسم أو مجال`);
    assert.equal(CourseLogic.validateCourse(c), null, `الدورة ${c.name} لا تجتاز التحقق`);
  }
});
