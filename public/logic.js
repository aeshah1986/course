// منطق نقي بدون أي عناصر من الصفحة، ليمكن اختباره في Node.
// يُحمَّل في المتصفح كسكربت عادي، ويُصدَّر في Node عبر module.exports.
const CourseLogic = (() => {
  // قيم المجالات والتصنيفات: إزالة الفراغات والمكرر والفارغ، ثم الترتيب العربي
  function uniqueSorted(values) {
    return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ar"));
  }

  // يطابق النص مع الاسم والمدرب والوصف والمجال والتصنيف (غير حساس لحالة الأحرف)
  function matchesSearch(course, q) {
    if (!q) return true;
    return [course.name, course.trainer, course.description, course.field, course.category]
      .some((v) => (v || "").toLowerCase().includes(q));
  }

  // الفلترة: النص والمجال والتصنيف تُطبَّق معاً
  function filterCourses(courses, { q = "", field = "", category = "" } = {}) {
    const query = q.trim().toLowerCase();
    return courses.filter((c) =>
      matchesSearch(c, query) &&
      (!field || c.field === field) &&
      (!category || c.category === category)
    );
  }

  // يعيد رسالة خطأ بالعربية، أو null إذا كانت البيانات صالحة
  function validateCourse(data) {
    if (!data.name || !data.name.trim()) return "الرجاء كتابة اسم الدورة.";
    if (!data.field || !data.field.trim()) return "الرجاء كتابة المجال.";
    if (!Number.isFinite(data.price) || data.price < 0) return "السعر يجب أن يكون رقماً صفراً أو أكبر.";
    return null;
  }

  return { uniqueSorted, matchesSearch, filterCourses, validateCourse };
})();

if (typeof module !== "undefined") module.exports = CourseLogic;
