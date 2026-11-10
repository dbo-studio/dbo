// Seed for the sample mongo: databases shop, analytics and blog with a few
// collections and documents. Runs once from /docker-entrypoint-initdb.d on
// first start; re-seed by removing the container and its data volume.
/* global db */

// shop
db = db.getSiblingDB("shop");
db.products.insertMany([
  { sku: "SKU-1001", name: "Wireless Mouse", price: 24.99, stock: 42 },
  { sku: "SKU-1002", name: "Mechanical Keyboard", price: 89.99, stock: 17 },
  { sku: "SKU-1003", name: "USB-C Hub", price: 39.99, stock: 8 },
]);
db.orders.insertMany([
  { orderNo: "ORD-1", customer: "alice", total: 114.98, status: "paid" },
  { orderNo: "ORD-2", customer: "bob", total: 39.99, status: "pending" },
]);

// analytics
db = db.getSiblingDB("analytics");
db.pageViews.insertMany([
  { page: "/", views: 1200 },
  { page: "/pricing", views: 340 },
  { page: "/docs", views: 780 },
]);

// blog
db = db.getSiblingDB("blog");
db.posts.insertMany([
  { slug: "hello-dbo", title: "Hello DBO", tags: ["intro"], published: true },
  { slug: "schema-editing", title: "Schema editing", tags: ["guide"], published: false },
]);
