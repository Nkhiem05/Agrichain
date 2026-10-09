const express = require("express");
const router = express.Router();

const danhmucController = require("../../controller/controller_admin/danhmucController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", danhmucController.getCatalog);
router.post("/giong-cay-trong", danhmucController.createProductCatalogItem);
router.put(
  "/giong-cay-trong/:maSanPham/khoa",
  danhmucController.toggleProductCatalogItem,
);
router.post("/vat-tu", danhmucController.createMaterialCatalogItem);
router.put("/vat-tu/:maVatTu/khoa", danhmucController.toggleMaterialCatalogItem);

module.exports = router;
