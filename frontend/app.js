
const API = "/api";
const $ = (selector) => document.querySelector(selector);

let token = localStorage.getItem("campusswap_token");
let currentUser = JSON.parse(
  localStorage.getItem("campusswap_user") || "null"
);
let categories = [];
let submittedReviewIds = new Set();

function headers(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function setSession(data) {
  token = data.token;
  currentUser = data.user;

  localStorage.setItem("campusswap_token", token);
  localStorage.setItem(
    "campusswap_user",
    JSON.stringify(currentUser)
  );

  updateAuthUI();
  loadDashboard();
}

function logout() {
  token = null;
  currentUser = null;
  submittedReviewIds.clear();

  localStorage.removeItem("campusswap_token");
  localStorage.removeItem("campusswap_user");

  updateAuthUI();
  loadDashboard();
  toast("You have logged out.");
}

function updateAuthUI() {
  $("#user-label").textContent = currentUser
    ? `Hi, ${currentUser.name}`
    : "";

  $("#logout-btn").classList.toggle("hidden", !currentUser);
  $("#login-open").classList.toggle("hidden", !!currentUser);
}

function openModal(tab = "login") {
  $("#auth-modal").classList.remove("hidden");
  switchTab(tab);
}

function closeModal() {
  $("#auth-modal").classList.add("hidden");
}

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });

  $("#login-form").classList.toggle("hidden", tab !== "login");
  $("#register-form").classList.toggle(
    "hidden",
    tab !== "register"
  );

  $("#auth-message").textContent = "";
}

// -------------------- CATEGORIES --------------------

async function loadCategories() {
  categories = await api("/products/categories");

  const options = categories.map(c => `
    <option value="${c.category_id}">
      ${escapeHtml(c.category_name)}
    </option>
  `).join("");

  $("#category-filter").insertAdjacentHTML(
    "beforeend",
    options
  );

  $("#sell-category").innerHTML =
    `<option value="">Choose category</option>${options}`;
}

// -------------------- PRODUCTS --------------------

const icons = {
  Books: "📚",
  Electronics: "🎧",
  Stationery: "✏️",
  "Lab Equipment": "🧪",
  Others: "🎒"
};

async function loadProducts() {
  const params = new URLSearchParams({
    search: $("#search").value.trim(),
    category: $("#category-filter").value,
    minPrice: $("#min-price").value,
    maxPrice: $("#max-price").value
  });

  $("#products").innerHTML =
    `<p class="muted">Loading listings...</p>`;

  try {
    const products = await api(
      `/products?${params.toString()}`
    );

    $("#product-count").textContent =
      `${products.length} listing${products.length === 1 ? "" : "s"}`;

    $("#products").innerHTML = products.length
      ? products.map(p => `
        <article class="product-card">
          <div class="product-visual">
            ${icons[p.category_name] || "🛍️"}
          </div>

          <div class="product-info">
            <span class="tag">
              ${escapeHtml(p.category_name)}
            </span>

            <h3>${escapeHtml(p.product_name)}</h3>

            <p class="product-meta">
              ${escapeHtml(p.condition)} ·
              ${escapeHtml(p.department)} ·
              Seller: ${escapeHtml(p.seller_name)}
            </p>

            <p class="product-meta">
              ${escapeHtml(
                p.description || "No description provided."
              )}
            </p>

            <div class="product-bottom">
              <span class="price">${money(p.price)}</span>

              <button class="mini-btn"
                onclick="requestProduct(${p.product_id})">
                Request
              </button>
            </div>
          </div>
        </article>
      `).join("")
      : `<div class="empty">
          No matching products found.
          Try changing your search.
        </div>`;
  } catch (err) {
    $("#products").innerHTML =
      `<div class="empty">${escapeHtml(err.message)}</div>`;
  }
}

async function requestProduct(id) {
  if (!token) return openModal("login");

  try {
    const result = await api("/requests", {
      method: "POST",
      body: JSON.stringify({ product_id: id })
    });

    toast(result.message);
    loadDashboard();
  } catch (err) {
    toast(err.message);
  }
}

// -------------------- REVIEWS --------------------

function openReviewModal(transactionId) {
  if (!token) {
    openModal("login");
    return;
  }

  $("#review-form").reset();
  $("#review-transaction-id").value = transactionId;
  $("#review-message").textContent = "";
  $("#review-modal").classList.remove("hidden");
}

function closeReviewModal() {
  $("#review-modal").classList.add("hidden");
}

async function loadReviews() {
  try {
    const reviews = await api("/reviews");

    submittedReviewIds = new Set(
      reviews.map(r => Number(r.transaction_id))
    );

    $("#reviews").innerHTML = reviews.length
      ? reviews.map(r => `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(r.reviewer_name)}</strong>

            <span class="muted">
              ${"★".repeat(Number(r.rating))}
              ${"☆".repeat(5 - Number(r.rating))}
            </span>

            <p>
              ${escapeHtml(
                r.comment || "No comment provided."
              )}
            </p>
          </div>
        </div>
      `).join("")
      : "No reviews submitted yet.";

    return reviews;
  } catch (err) {
    $("#reviews").textContent = err.message;
    throw err;
  }
}

// -------------------- DASHBOARD --------------------

async function loadDashboard() {
  if (!token) {
    [
      "#my-listings",
      "#incoming-requests",
      "#my-requests",
      "#transactions"
    ].forEach(id => {
      $(id).textContent = "Log in to view your activity.";
    });

    $("#reviews").textContent =
      "Log in to view reviews.";

    return;
  }

  try {
    const [listings, incoming, mine, transactions] =
      await Promise.all([
        api("/products/mine"),
        api("/requests/incoming"),
        api("/requests/mine"),
        api("/transactions")
      ]);

    // My listings
    $("#my-listings").innerHTML = listings.length
      ? listings.map(p => `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(p.product_name)}</strong>
            <span class="muted">
              ${money(p.price)} · ${escapeHtml(p.status)}
            </span>
          </div>
        </div>
      `).join("")
      : "You have not listed anything yet.";

    // Incoming requests
    $("#incoming-requests").innerHTML = incoming.length
      ? incoming.map(r => `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(r.product_name)}</strong>
            <span class="muted">
              ${escapeHtml(r.buyer_name)} ·
              ${escapeHtml(r.request_status)}
            </span>
          </div>

          ${r.request_status === "Pending" ? `
            <div class="list-actions">
              <button class="mini-btn"
                onclick="acceptRequest(${r.request_id})">
                Accept
              </button>

              <button class="mini-btn reject"
                onclick="rejectRequest(${r.request_id})">
                Reject
              </button>
            </div>
          ` : ""}
        </div>
      `).join("")
      : "No incoming requests.";

    // My requests
    $("#my-requests").innerHTML = mine.length
      ? mine.map(r => `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(r.product_name)}</strong>
            <span class="muted">
              ${money(r.price)} ·
              ${escapeHtml(r.seller_name)}
            </span>
          </div>

          <span class="tag">
            ${escapeHtml(r.request_status)}
          </span>
        </div>
      `).join("")
      : "You have not requested any products.";

    // Load reviews before rendering transactions
    // so we can identify already-reviewed purchases.
    let reviews = [];
    try {
      reviews = await loadReviews();
    } catch {
      // Other dashboard sections remain usable.
    }

    const reviewedIds = new Set(
      reviews.map(r => Number(r.transaction_id))
    );

    // Transactions
    $("#transactions").innerHTML = transactions.length
      ? transactions.map(t => {
        const isBuyer =
          Number(t.buyer_id) ===
          Number(currentUser?.user_id);

        const isCompleted =
          t.status === "Completed";

        const alreadyReviewed =
          reviewedIds.has(Number(t.transaction_id));

        const canReview =
          isBuyer && isCompleted && !alreadyReviewed;

        return `
          <div class="list-row">
            <div>
              <strong>
                ${escapeHtml(t.product_name)}
              </strong>

              <span class="muted">
                ${escapeHtml(t.buyer_name)}
                →
                ${escapeHtml(t.seller_name)}
              </span>

              <span class="muted">
                ${escapeHtml(t.status || "")}
              </span>
            </div>

            <div class="list-actions">
              <b>${money(t.amount)}</b>

              ${canReview ? `
                <button class="mini-btn"
                  onclick="openReviewModal(${Number(t.transaction_id)})">
                  Rate & Review
                </button>
              ` : alreadyReviewed && isBuyer ? `
                <span class="tag">Reviewed ✓</span>
              ` : ""}
            </div>
          </div>
        `;
      }).join("")
      : "No transactions yet.";

  } catch (err) {
    toast(err.message);
  }
}

// -------------------- REQUEST ACTIONS --------------------

async function acceptRequest(id) {
  try {
    const result = await api(
      `/requests/${id}/accept`,
      { method: "PUT" }
    );

    toast(result.message);

    await Promise.all([
      loadDashboard(),
      loadProducts()
    ]);
  } catch (err) {
    toast(err.message);
  }
}

async function rejectRequest(id) {
  try {
    const result = await api(
      `/requests/${id}/reject`,
      { method: "PUT" }
    );

    toast(result.message);
    loadDashboard();
  } catch (err) {
    toast(err.message);
  }
}

// -------------------- EVENT LISTENERS --------------------

$("#login-open").addEventListener(
  "click",
  () => openModal("login")
);

$("#close-modal").addEventListener(
  "click",
  closeModal
);

$("#auth-modal").addEventListener("click", e => {
  if (e.target.id === "auth-modal") {
    closeModal();
  }
});

document.querySelectorAll(".tab").forEach(b => {
  b.addEventListener(
    "click",
    () => switchTab(b.dataset.tab)
  );
});

$("#logout-btn").addEventListener("click", logout);
$("#filter-btn").addEventListener("click", loadProducts);

$("#search").addEventListener("keydown", e => {
  if (e.key === "Enter") loadProducts();
});

// Review modal listeners
$("#close-review-modal").addEventListener(
  "click",
  closeReviewModal
);

$("#review-modal").addEventListener("click", e => {
  if (e.target.id === "review-modal") {
    closeReviewModal();
  }
});

// Review submission
$("#review-form").addEventListener("submit", async e => {
  e.preventDefault();

  const form = Object.fromEntries(
    new FormData(e.target)
  );

  const submitButton =
    e.target.querySelector('button[type="submit"]');

  submitButton.disabled = true;

  try {
    const result = await api("/reviews", {
      method: "POST",
      body: JSON.stringify({
        transaction_id: Number(form.transaction_id),
        rating: Number(form.rating),
        comment: form.comment.trim()
      })
    });

    toast(result.message);
    closeReviewModal();

    await loadDashboard();
  } catch (err) {
    $("#review-message").textContent = err.message;
  } finally {
    submitButton.disabled = false;
  }
});

// Login
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();

  const form = Object.fromEntries(
    new FormData(e.target)
  );

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(form)
    });

    setSession(data);
    closeModal();
    e.target.reset();
    toast("Welcome back!");
  } catch (err) {
    $("#auth-message").textContent = err.message;
  }
});

// Registration
$("#register-form").addEventListener("submit", async e => {
  e.preventDefault();

  const form = Object.fromEntries(
    new FormData(e.target)
  );

  try {
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(form)
    });

    switchTab("login");

    $("#auth-message").textContent =
      "Account created. You can now log in.";

    $("#login-form [name=email]").value = form.email;
  } catch (err) {
    $("#auth-message").textContent = err.message;
  }
});

// Sell product
$("#sell-form").addEventListener("submit", async e => {
  e.preventDefault();

  if (!token) return openModal("login");

  const form = Object.fromEntries(
    new FormData(e.target)
  );

  try {
    const result = await api("/products", {
      method: "POST",
      body: JSON.stringify(form)
    });

    $("#sell-message").textContent = result.message;
    e.target.reset();

    await Promise.all([
      loadProducts(),
      loadDashboard()
    ]);
  } catch (err) {
    $("#sell-message").textContent = err.message;
  }
});

// -------------------- INITIALIZATION --------------------

(async function init() {
  updateAuthUI();

  try {
    await loadCategories();
    await loadProducts();
  } catch (err) {
    $("#products").innerHTML = `
      <div class="empty">
        Could not connect to the API.
        Start the server and check PostgreSQL settings.
      </div>
    `;
  }

  if (token) {
    try {
      await api("/auth/me");
      await loadDashboard();
    } catch {
      logout();
    }
  }
})();
