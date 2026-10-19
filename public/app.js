// ===== الإعدادات =====
// هاش SHA-256 لكلمة مرور الإدارة. لتغييرها: احسب هاش الكلمة الجديدة وضعه هنا.
const ADMIN_HASH = "bab29d99fa2e48fc6f5ee48fc50cf7fb0455b7383f9844224486477c1de3b980";
const STORAGE_KEY = "mahara-courses-v1";
const AUTH_KEY = "mahara-admin";
const CURRENCY = "ر.س";

// ===== عناصر الصفحة =====
const $ = (id) => document.getElementById(id);
const els = {
  courses: $("courses"),
  empty: $("empty"),
  count: $("result-count"),
  search: $("search"),
  field: $("filter-field"),
  category: $("filter-category"),
  clear: $("clear-filters"),
  addBtn: $("add-course"),
  loginBtn: $("admin-toggle"),
  logoutBtn: $("logout"),
  restoreBtn: $("restore"),
  badge: $("admin-badge"),
  detailsDialog: $("details-dialog"),
  detailsBody: $("details-body"),
  closeDetails: $("close-details"),
  courseDialog: $("course-dialog"),
  courseTitle: $("course-dialog-title"),
  courseForm: $("course-form"),
  cancelCourse: $("cancel-course"),
  loginDialog: $("login-dialog"),
  loginForm: $("login-form"),
  loginError: $("login-error"),
  cancelLogin: $("cancel-login"),
  fieldList: $("field-list"),
  categoryList: $("category-list"),
};

// ===== الحالة =====
let courses = [];
let isAdmin = sessionStorage.getItem(AUTH_KEY) === "1";
let editingId = null;

// ===== التخزين =====
function loadCourses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {
    // بيانات تالفة أو التخزين غير متاح: نعود إلى الدورات الأصلية
  }
  return structuredClone(SEED_COURSES);
}

function saveCourses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch (e) {
    alert("تعذّر حفظ التغييرات في المتصفح (قد يكون التخزين ممتلئاً أو معطّلاً).");
  }
}

// ===== أدوات =====
function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256Hex(text) {
  if (!crypto.subtle) throw new Error("no-subtle");
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fillSelect(select, values, allLabel) {
  const current = select.value;
  select.replaceChildren();
  select.append(new Option(allLabel, ""));
  values.forEach((v) => select.append(new Option(v, v)));
  select.value = values.includes(current) ? current : "";
}

function fillDatalist(list, values) {
  list.replaceChildren(...values.map((v) => {
    const o = document.createElement("option");
    o.value = v;
    return o;
  }));
}

function refreshMeta() {
  const fields = CourseLogic.uniqueSorted(courses.map((c) => c.field));
  const categories = CourseLogic.uniqueSorted(courses.map((c) => c.category));
  fillSelect(els.field, fields, "كل المجالات");
  fillSelect(els.category, categories, "كل التصانيف");
  fillDatalist(els.fieldList, fields);
  fillDatalist(els.categoryList, categories);
}

// ===== العرض =====
function filteredCourses() {
  return CourseLogic.filterCourses(courses, {
    q: els.search.value,
    field: els.field.value,
    category: els.category.value,
  });
}

function makeCard(course) {
  const card = document.createElement("article");
  card.className = "card";

  const h3 = document.createElement("h3");
  const title = document.createElement("button");
  title.type = "button";
  title.className = "card-title";
  title.textContent = course.name;
  title.addEventListener("click", () => openDetails(course.id));
  h3.append(title);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = course.field;

  const meta = document.createElement("ul");
  meta.className = "card-meta";
  [
    course.trainer && `👤 ${course.trainer}`,
    course.duration && `⏱ ${course.duration}`,
    course.category && `🏷 ${course.category}`,
  ].filter(Boolean).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    meta.append(li);
  });

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = `${course.price} ${CURRENCY}`;
  footer.append(price);

  if (isAdmin) {
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn small";
    edit.textContent = "✏️ تعديل";
    edit.addEventListener("click", () => openCourseDialog(course.id));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn small danger";
    del.textContent = "🗑 حذف";
    del.addEventListener("click", () => deleteCourse(course.id));
    actions.append(edit, del);
    footer.append(actions);
  }

  card.append(h3, badge, meta, footer);
  return card;
}

function render() {
  const list = filteredCourses();
  els.courses.replaceChildren(...list.map(makeCard));
  els.empty.hidden = list.length > 0;
  els.empty.textContent = list.length ? "" : "لا توجد دورات مطابقة للبحث.";
  els.count.textContent = `عدد الدورات: ${list.length} من ${courses.length}`;
  els.clear.hidden = !(els.search.value || els.field.value || els.category.value);
}

// ===== نافذة التفاصيل =====
function openDetails(id) {
  const c = courses.find((x) => x.id === id);
  if (!c) return;
  const body = els.detailsBody;
  body.replaceChildren();

  const h3 = document.createElement("h3");
  h3.textContent = c.name;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = c.field;

  const dl = document.createElement("dl");
  dl.className = "details-list";
  [
    ["المدرب", c.trainer || "—"],
    ["المدة", c.duration || "—"],
    ["السعر", `${c.price} ${CURRENCY}`],
    ["التصنيف", c.category || "—"],
  ].forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.append(dt, dd);
  });

  const h4 = document.createElement("h4");
  h4.textContent = "عن الدورة";
  const desc = document.createElement("p");
  desc.className = "details-desc";
  desc.textContent = c.description || "لا توجد معلومات إضافية.";

  body.append(h3, badge, dl, h4, desc);
  els.detailsDialog.showModal();
}

// ===== نافذة الإضافة والتعديل =====
function openCourseDialog(id = null) {
  editingId = id;
  const c = id ? courses.find((x) => x.id === id) : null;
  els.courseTitle.textContent = c ? "تعديل الدورة" : "دورة جديدة";
  els.courseForm.reset();
  if (c) {
    const f = els.courseForm.elements;
    f.name.value = c.name;
    f.field.value = c.field;
    f.category.value = c.category || "";
    f.trainer.value = c.trainer || "";
    f.duration.value = c.duration || "";
    f.price.value = c.price;
    f.description.value = c.description || "";
  }
  els.courseDialog.showModal();
}

function readCourseForm() {
  const f = els.courseForm.elements;
  const price = Number(f.price.value);
  return {
    name: f.name.value.trim(),
    field: f.field.value.trim(),
    category: f.category.value.trim(),
    trainer: f.trainer.value.trim(),
    duration: f.duration.value.trim(),
    price,
    description: f.description.value.trim(),
  };
}

function saveCourseFromForm(event) {
  event.preventDefault();
  if (!els.courseForm.reportValidity()) return;
  const data = readCourseForm();
  const error = CourseLogic.validateCourse(data);
  if (error) {
    alert(error);
    return;
  }
  if (editingId) {
    const idx = courses.findIndex((c) => c.id === editingId);
    if (idx !== -1) courses[idx] = { ...courses[idx], ...data };
  } else {
    courses.push({ id: newId(), ...data });
  }
  saveCourses();
  refreshMeta();
  render();
  els.courseDialog.close();
}

function deleteCourse(id) {
  const c = courses.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`هل تريد حذف الدورة "${c.name}"؟`)) return;
  courses = courses.filter((x) => x.id !== id);
  saveCourses();
  refreshMeta();
  render();
}

function restoreOriginal() {
  if (!confirm("سيتم حذف كل التعديلات والعودة إلى الدورات الأصلية. هل أنت متأكد؟")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* لا شيء: سنستخدم الأصلية في الذاكرة */ }
  courses = structuredClone(SEED_COURSES);
  refreshMeta();
  render();
}

// ===== الإدارة وتسجيل الدخول =====
function setAdmin(on) {
  isAdmin = on;
  if (on) sessionStorage.setItem(AUTH_KEY, "1");
  else sessionStorage.removeItem(AUTH_KEY);
  els.addBtn.hidden = !on;
  els.logoutBtn.hidden = !on;
  els.restoreBtn.hidden = !on;
  els.badge.hidden = !on;
  els.loginBtn.hidden = on;
  render();
}

async function login(event) {
  event.preventDefault();
  els.loginError.hidden = true;
  const password = els.loginForm.elements.password.value;
  try {
    const hash = await sha256Hex(password);
    if (hash === ADMIN_HASH) {
      els.loginForm.reset();
      els.loginDialog.close();
      setAdmin(true);
    } else {
      els.loginError.textContent = "كلمة المرور غير صحيحة.";
      els.loginError.hidden = false;
    }
  } catch (e) {
    els.loginError.textContent = "تعذّر التحقق. افتح الصفحة عبر localhost أو https.";
    els.loginError.hidden = false;
  }
}

// ===== الأحداث =====
let searchTimer = null;
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 150);
});
els.field.addEventListener("change", render);
els.category.addEventListener("change", render);
els.clear.addEventListener("click", () => {
  els.search.value = "";
  els.field.value = "";
  els.category.value = "";
  render();
});

els.loginBtn.addEventListener("click", () => els.loginDialog.showModal());
els.cancelLogin.addEventListener("click", () => els.loginDialog.close());
els.loginForm.addEventListener("submit", login);
els.logoutBtn.addEventListener("click", () => setAdmin(false));

els.addBtn.addEventListener("click", () => openCourseDialog());
els.cancelCourse.addEventListener("click", () => els.courseDialog.close());
els.courseForm.addEventListener("submit", saveCourseFromForm);
els.restoreBtn.addEventListener("click", restoreOriginal);

els.closeDetails.addEventListener("click", () => els.detailsDialog.close());

// ===== بدء التشغيل =====
courses = loadCourses();
refreshMeta();
setAdmin(isAdmin);
