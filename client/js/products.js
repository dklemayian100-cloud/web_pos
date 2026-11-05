
"use strict";

const token = sessionStorage.getItem("web_pos_token");
const storedUser = sessionStorage.getItem("web_pos_user");

const userEmail = document.querySelector("#user-email");
const userRole = document.querySelector("#user-role");
const logoutButton = document.querySelector("#logout-button");

const managementSection = document.querySelector("#product-management");
const accessDeniedSection = document.querySelector("#access-denied");

const errorMessage = document.querySelector("#products-error");
const successMessage = document.querySelector("#products-success");
const loadingMessage = document.querySelector("#products-loading");

const tableBody = document.querySelector("#products-table-body");
const paginationInfo = document.querySelector("#pagination-info");
const previousButton = document.querySelector("#previous-page");
const nextButton = document.querySelector("#next-page");

const searchForm = document.querySelector("#product-search-form");
const searchInput = document.querySelector("#product-search");
const statusFilter = document.querySelector("#product-status");

const addProductButton = document.querySelector("#add-product-button");
const productFormSection = document.querySelector("#product-form-section");
const productForm = document.querySelector("#product-form");
const productFormHeading = document.querySelector("#product-form-heading");
const saveProductButton = document.querySelector("#save-product-button");
const cancelProductButton = document.querySelector("#cancel-product-button");

const fields = {
  id: document.querySelector("#product-id"),
  sku: document.querySelector("#product-sku"),
  name: document.querySelector("#product-name"),
  description: document.querySelector("#product-description"),
  price: document.querySelector("#product-price"),
  costPrice: document.querySelector("#product-cost-price"),
  isActive: document.querySelector("#product-active"),
};

const state = {
  page: 1,
  pageSize: 20,
  totalPages: 0,
  products: [],
  loading: false,
};

function signOut() {
  sessionStorage.removeItem("web_pos_token");
  sessionStorage.removeItem("web_pos_user");
  window.location.replace("/login.html");
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  successMessage.hidden = true;
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.hidden = false;
  errorMessage.hidden = true;
}

function clearMessages() {
  errorMessage.hidden = true;
  successMessage.hidden = true;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (response.status === 401) {
    signOut();
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = new Error(
      result?.message || `Request failed (${response.status}).`,
    );

    error.status = response.status;
    error.code = result?.error;

    throw error;
  }

  return result;
}

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function renderProducts(products) {
  tableBody.replaceChildren();

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No products found.");
    cell.colSpan = 6;
    row.append(cell);
    tableBody.append(row);
    return;
  }

  for (const product of products) {
    const row = document.createElement("tr");

    row.append(
      createCell(product.sku),
      createCell(product.name),
      createCell(formatMoney(product.price)),
      createCell(formatMoney(product.costPrice)),
      createCell(product.isActive ? "Active" : "Inactive"),
    );

    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "button-secondary";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      openEditForm(product);
    });

    actionCell.append(editButton);
    row.append(actionCell);

    tableBody.append(row);
  }
}

function updatePagination(pagination) {
  state.totalPages = pagination.totalPages;

  paginationInfo.textContent =
    `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} products`;

  previousButton.disabled = pagination.page <= 1;
  nextButton.disabled =
    pagination.totalPages === 0 ||
    pagination.page >= pagination.totalPages;
}

async function loadProducts() {
  if (state.loading) {
    return;
  }

  state.loading = true;
  loadingMessage.hidden = false;
  loadingMessage.textContent = "Loading products...";
  previousButton.disabled = true;
  nextButton.disabled = true;
  clearMessages();

  try {
    const params = new URLSearchParams({
      page: String(state.page),
      pageSize: String(state.pageSize),
      sortBy: "name",
      sortOrder: "asc",
    });

    const search = searchInput.value.trim();

    if (search) {
      params.set("search", search);
    }

    if (statusFilter.value !== "") {
      params.set("isActive", statusFilter.value);
    }

    const result = await requestJson(
      `/products/manage?${params.toString()}`,
    );

    if (!Array.isArray(result.products) || !result.pagination) {
      throw new Error("The server returned an invalid product listing.");
    }

    state.products = result.products;

    renderProducts(result.products);
    updatePagination(result.pagination);
    loadingMessage.hidden = true;
  } catch (error) {
    if (error.status === 403) {
      managementSection.hidden = true;
      accessDeniedSection.hidden = false;
      return;
    }

    showError(
      error instanceof Error
        ? error.message
        : "Unable to load products.",
    );

    loadingMessage.textContent = "Product loading failed.";
  } finally {
    state.loading = false;
  }
}

function resetProductForm() {
  productForm.reset();
  fields.id.value = "";
  fields.isActive.value = "true";
  productFormHeading.textContent = "Add product";
  saveProductButton.textContent = "Save product";
}

function openCreateForm() {
  clearMessages();
  resetProductForm();
  productFormSection.hidden = false;
  productFormHeading.textContent = "Add product";
  productFormSection.scrollIntoView({ behavior: "smooth" });
}

function openEditForm(product) {
  clearMessages();
  resetProductForm();

  fields.id.value = product.id;
  fields.sku.value = product.sku;
  fields.name.value = product.name;
  fields.description.value = product.description || "";
  fields.price.value = String(product.price);
  fields.costPrice.value =
    product.costPrice === null ? "" : String(product.costPrice);
  fields.isActive.value = String(product.isActive);

  productFormHeading.textContent = "Edit product";
  saveProductButton.textContent = "Update product";

  productFormSection.hidden = false;
  productFormSection.scrollIntoView({ behavior: "smooth" });
}

function closeProductForm() {
  productFormSection.hidden = true;
  resetProductForm();
}

function buildProductPayload(isEditing) {
  const payload = {
    sku: fields.sku.value.trim(),
    name: fields.name.value.trim(),
    description: fields.description.value.trim(),
    price: fields.price.value,
    costPrice: fields.costPrice.value,
  };

  if (isEditing) {
    payload.isActive = fields.isActive.value === "true";
  }

  if (!payload.description) {
    if (isEditing) {
      payload.description = null;
    } else {
      delete payload.description;
    }
  }

  return payload;
}

async function saveProduct(event) {
  event.preventDefault();
  clearMessages();

  if (!productForm.reportValidity()) {
    return;
  }

  const isEditing = Boolean(fields.id.value);
  const payload = buildProductPayload(isEditing);

  saveProductButton.disabled = true;
  saveProductButton.textContent = "Saving...";

  try {
    const url = isEditing
      ? `/products/${encodeURIComponent(fields.id.value)}`
      : "/products";

    const result = await requestJson(url, {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });

    if (!result.product) {
      throw new Error("The server did not return the saved product.");
    }

    closeProductForm();

    showSuccess(
      isEditing
        ? "Product updated successfully."
        : "Product created successfully.",
    );

    state.page = 1;
    await loadProducts();
  } catch (error) {
    showError(
      error instanceof Error
        ? error.message
        : "Unable to save the product.",
    );
  } finally {
    saveProductButton.disabled = false;
    saveProductButton.textContent = fields.id.value
      ? "Update product"
      : "Save product";
  }
}

function initializeEventListeners() {
  logoutButton.addEventListener("click", signOut);

  addProductButton.addEventListener("click", openCreateForm);

  cancelProductButton.addEventListener("click", closeProductForm);

  productForm.addEventListener("submit", saveProduct);

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.page = 1;
    loadProducts();
  });

  previousButton.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      loadProducts();
    }
  });

  nextButton.addEventListener("click", () => {
    if (state.page < state.totalPages) {
      state.page += 1;
      loadProducts();
    }
  });
}

async function initializeProducts() {
  if (!token || !storedUser) {
    signOut();
    return;
  }

  let user;

  try {
    user = JSON.parse(storedUser);
  } catch {
    signOut();
    return;
  }

  if (!user || typeof user !== "object") {
    signOut();
    return;
  }

  userEmail.textContent = user.email || "Authenticated user";
  userRole.textContent = user.role || "Verifying access";

  if (user.role !== "ADMIN") {
    managementSection.hidden = true;
    accessDeniedSection.hidden = false;
    return;
  }

  initializeEventListeners();

  try {
    const protectedResult = await requestJson("/protected");

    if (protectedResult.user?.role !== "ADMIN") {
      accessDeniedSection.hidden = false;
      return;
    }

    userEmail.textContent =
      protectedResult.user.email || user.email || "Authenticated user";

    userRole.textContent = protectedResult.user.role;

    managementSection.hidden = false;

    await loadProducts();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      if (error.status === 403) {
        managementSection.hidden = true;
        accessDeniedSection.hidden = false;
      }
      return;
    }

    showError(
      error instanceof Error
        ? error.message
        : "Unable to initialize product management.",
    );
  }
}

initializeProducts();
