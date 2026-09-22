import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Pharma.css";
import { ThemeContext } from "../Theme/ThemeContext";
import { AuthContext } from "../HeadFoot/Auth/AuthContext";
import img1 from "../images/1.png";
import img2 from "../images/1.webp";
import img3 from "../images/2.webp";
import img4 from "../images/8.jpg";
import img5 from "../images/7.jpg";
import img6 from "../images/9.jpg";

const CATEGORIES = [
  "Medicine",
  "Winter Essential",
  "Sexual Wellness",
  "Health Supplement",
  "Skin Care",
  "Homeopathy",
  "Mom & Baby",
  "Diabetic Care",
  "Medical Devices",
];

const DEFAULT_CATEGORY = "Medicine";

const MEDICINE_TYPES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Softgel",
  "Ointment",
  "Cream",
  "Globules",
  "Drops",
  "Diaper",
  "Device",
];

const UNIT_LABELS = [
  "tablet",
  "capsule",
  "bottle",
  "softgel",
  "tube",
  "jar",
  "globules",
  "drops",
  "pack",
  "kit",
  "device",
  "sachet",
];

const EMPTY_MEDICINE_FORM = {
  name: "",
  brand: "",
  category: "Medicine",
  type: "Tablet",
  dosage: "",
  packSize: 10,
  unitLabel: "tablet",
  price: "",
  illness: "",
  usage: "",
  description: "",
  manufacturer: "",
};

const SAMPLE_MEDICINES = [
  {
    id: 1,
    name: "Paracetamol 500mg (Panadol)",
    brand: "MediCure",
    type: "Tablet",
    illness: "Fever",
    category: "Medicine",
    price: 120,
    packSize: 10,
    unitLabel: "tablet", 
    img: img1,
    manufacturer: "MediCure Labs",
    description: "Paracetamol (acetaminophen) helps reduce fever and relieve mild to moderate pain.",
    usage: "Adults: 500mg every 4–6 hours as needed. Do not exceed 4g/day.",
    aliases: ["panadol", "paracetamol", "acetaminophen"],
  },
  {
    id: 2,
    name: "Cetirizine 10mg",
    brand: "AllerGo",
    type: "Tablet",
    illness: "Allergy",
    category: "Medicine",
    price: 90,
    packSize: 10,
    unitLabel: "tablet",
    img: img2,
    manufacturer: "AllerGo Pharma",
    description: "Antihistamine for relief from sneezing, runny nose, itchy/watery eyes due to allergies.",
    usage: "Adults: 10mg once daily. Avoid driving if drowsy.",
    aliases: ["cetirizine", "rigix", "aller"],
  },
  {
    id: 3,
    name: "Amoxicillin 500mg",
    brand: "BioPharm",
    type: "Capsule",
    illness: "Infection",
    category: "Medicine",
    price: 350,
    packSize: 12,
    unitLabel: "capsule",
    img: img5,
    manufacturer: "BioPharm Pvt Ltd",
    description: "Broad-spectrum antibiotic used for bacterial infections. Use only on doctor's advice.",
    usage: "Typical: 500mg every 8 hours for 5–7 days or as prescribed.",
    aliases: ["amoxicillin", "amoxil"],
  },
  {
    id: 4,
    name: "Vitamin D3 1000IU",
    brand: "NutriPlus",
    type: "Softgel",
    illness: "Supplement",
    category: "Health Supplement",
    price: 500,
    packSize: 30,
    unitLabel: "softgel",
    img: img3,
    manufacturer: "NutriPlus Nutrition",
    description: "Supports bone health and immunity in individuals with low Vitamin D levels.",
    usage: "1 softgel daily with a meal or as directed by physician.",
    aliases: ["vitamin d", "d3"],
  },
  {
    id: 5,
    name: "Cough Syrup 100ml",
    brand: "CoughCare",
    type: "Syrup",
    illness: "Cough",
    category: "Winter Essential",
    price: 220,
    packSize: 1,
    unitLabel: "bottle",
    img: img4,
    manufacturer: "CoughCare Remedies",
    description: "Soothes throat irritation and helps relieve dry or productive cough.",
    usage: "Adults: 10ml 3 times daily after meals. Shake well before use.",
    aliases: ["cough syrup", "coughcare"],
  },
  {
    id: 6,
    name: "Ibuprofen 200mg",
    brand: "PainAway",
    type: "Tablet",
    illness: "Pain",
    category: "Medicine",
    price: 140,
    packSize: 10,
    unitLabel: "tablet",
    img: img6,
    manufacturer: "PainAway Healthcare",
    description: "NSAID for relief from pain, inflammation and fever.",
    usage: "Adults: 200–400mg every 6–8 hours with food. Max 1200mg/day unless advised.",
    aliases: ["ibuprofen", "brufen", "painaway"],
  },
  {
    id: 7,
    name: "Vicks Vapor Rub 50g",
    brand: "WinterCare",
    type: "Ointment",
    illness: "Cold",
    category: "Winter Essential",
    price: 280,
    packSize: 1,
    unitLabel: "jar",
    img: img4,
    manufacturer: "WinterCare",
    description: "Relieves nasal congestion and cough associated with colds.",
    usage: "Apply on chest and throat before sleep.",
    aliases: ["vicks", "vapor rub"],
  },
  {
    id: 8,
    name: "Moisturizing Face Cream",
    brand: "DermaGlow",
    type: "Cream",
    illness: "Dry Skin",
    category: "Skin Care",
    price: 650,
    packSize: 1,
    unitLabel: "tube",
    img: img3,
    manufacturer: "DermaGlow",
    description: "Hydrating cream for dry and sensitive skin.",
    usage: "Apply twice daily on clean face.",
    aliases: ["moisturizer", "face cream"],
  },
  {
    id: 9,
    name: "Baby Diapers Pack (M)",
    brand: "MomCare",
    type: "Diaper",
    illness: "Baby Care",
    category: "Mom & Baby",
    price: 1200,
    packSize: 1,
    unitLabel: "pack",
    img: img1,
    manufacturer: "MomCare",
    description: "Soft absorbent diapers for infants.",
    usage: "Change every 3–4 hours or as needed.",
    aliases: ["diaper", "baby diaper"],
  },
  {
    id: 10,
    name: "Glucometer Kit",
    brand: "DiabetCheck",
    type: "Device",
    illness: "Diabetes",
    category: "Diabetic Care",
    price: 2500,
    packSize: 1,
    unitLabel: "kit",
    img: img6,
    manufacturer: "DiabetCheck",
    description: "Digital blood glucose monitoring kit with strips.",
    usage: "Use as directed in manual.",
    aliases: ["glucometer", "sugar test"],
  },
  {
    id: 11,
    name: "Digital BP Monitor",
    brand: "MediDevice",
    type: "Device",
    illness: "Hypertension",
    category: "Medical Devices",
    price: 3200,
    packSize: 1,
    unitLabel: "device",
    img: img5,
    manufacturer: "MediDevice",
    description: "Automatic upper-arm blood pressure monitor.",
    usage: "Measure at same time daily, seated and relaxed.",
    aliases: ["bp monitor", "blood pressure"],
  },
  {
    id: 12,
    name: "Arnica 30C",
    brand: "HomeoHeal",
    type: "Globules",
    illness: "Pain",
    category: "Homeopathy",
    price: 180,
    packSize: 1,
    unitLabel: "bottle",
    img: img2,
    manufacturer: "HomeoHeal",
    description: "Homeopathic remedy commonly used for bruises and muscle soreness.",
    usage: "As directed by homeopathic physician.",
    aliases: ["arnica", "homeopathy"],
  },
  {
    id: 13,
    name: "Wellness Support Capsules",
    brand: "VitaWell",
    type: "Capsule",
    illness: "Wellness",
    category: "Sexual Wellness",
    price: 890,
    packSize: 6,
    unitLabel: "capsule",
    img: img3,
    manufacturer: "VitaWell",
    description: "Dietary supplement for general wellness support.",
    usage: "As directed on label or by physician.",
    aliases: ["wellness", "vitawell"],
  },
];

/** Match uploaded prescription medicines against pharmacy stock */
function findProductForMedicineName(rawName = "", items = SAMPLE_MEDICINES) {
  const text = String(rawName).toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  return (
    items.find((p) => {
      const name = p.name.toLowerCase();
      const aliases = (p.aliases || []).map((a) => a.toLowerCase());
      if (name.includes(text) || text.includes(name.split("(")[0].trim())) return true;
      return aliases.some((alias) => text.includes(alias) || alias.includes(text.split(" ")[0]));
    }) || null
  );
}

/**
 * Simulated prescription OCR.
 * CuraAid slip (Ayesha Khan / PRES 2026/000001) → Amlodipine, Telmisartan, Aspirin (not in stock).
 * Other uploads → demo mix for testing available + unavailable items.
 */
function extractMedicinesFromPrescription(file, items = SAMPLE_MEDICINES) {
  const fileName = (file?.name || "").toLowerCase();
  const isCuraAidRx =
    fileName.includes("pres-2026") ||
    fileName.includes("000001") ||
    fileName.includes("ayesha") ||
    fileName.includes("curaaid") ||
    fileName.includes("prescription-pres");

  const detectedLines = isCuraAidRx
    ? [
        { rawName: "Amlodipine 5mg", frequency: "1 tablet OD", duration: "30 days" },
        { rawName: "Telmisartan 40mg", frequency: "1 tablet OD", duration: "30 days" },
        { rawName: "Aspirin 75mg", frequency: "1 tablet OD", duration: "30 days" },
      ]
    : [
        { rawName: "Panadol (Paracetamol 500mg)", frequency: "2 times per day", duration: "1 day" },
        { rawName: "Cetirizine 10mg", frequency: "1 time per day", duration: "5 days" },
        { rawName: "Ibuprofen 200mg", frequency: "2 times per day", duration: "3 days" },
        { rawName: "Augmentin 625mg", frequency: "2 times per day", duration: "7 days" },
        { rawName: "Montelukast 10mg", frequency: "1 time per day", duration: "10 days" },
      ];

  return detectedLines.map((line, index) => {
    const product = findProductForMedicineName(line.rawName, items);
    return {
      key: `rx-${index + 1}`,
      rawName: line.rawName,
      productId: product?.id ?? null,
      frequency: line.frequency,
      duration: line.duration,
    };
  });
}

function unique(arr, key) {
  return Array.from(new Set(arr.map((x) => x[key]))).filter(Boolean);
}

function formatRs(n) {
  return `Rs ${n.toFixed(2)}`;
}

const DISCOUNT_RATE = 0.05;

function parseFrequencyPerDay(frequency = "") {
  const text = frequency.toLowerCase();
  const numMatch = text.match(/(\d+)\s*(?:times?|x|tabs?|tablets?)?\s*(?:per|a)?\s*day/);
  if (numMatch) return Math.max(1, Number(numMatch[1]));
  if (/\bod\b|once|1\s*time|one time|1\s*tablet/.test(text)) return 1;
  if (/twice|2\s*times|bd/.test(text)) return 2;
  if (/thrice|3\s*times|tds/.test(text)) return 3;
  return 1;
}

function parseDurationDays(duration = "") {
  const text = duration.toLowerCase();
  const dayMatch = text.match(/(\d+)\s*days?/);
  if (dayMatch) return Math.max(1, Number(dayMatch[1]));
  const weekMatch = text.match(/(\d+)\s*weeks?/);
  if (weekMatch) return Math.max(1, Number(weekMatch[1]) * 7);
  return 1;
}

function calcPrescribedQty(frequency, duration) {
  return parseFrequencyPerDay(frequency) * parseDurationDays(duration);
}

function getProductById(id, items = SAMPLE_MEDICINES) {
  return items.find((p) => p.id === id);
}

function buildPrescriptionRows(items, fullPackMap = {}, products = SAMPLE_MEDICINES) {
  return items.map((item) => {
    const product = item.productId != null ? getProductById(item.productId, products) : null;
    const prescribedQty = calcPrescribedQty(item.frequency, item.duration);

    if (!product) {
      return {
        ...item,
        product: null,
        available: false,
        prescribedQty,
        useFullPack: false,
        qty: 0,
        unitLabel: "unit",
        packSize: 0,
      };
    }

    const useFullPack = Boolean(fullPackMap[item.key]);
    const qty = useFullPack ? product.packSize : prescribedQty;
    return {
      ...item,
      product,
      available: true,
      prescribedQty,
      useFullPack,
      qty,
      unitLabel: product.unitLabel,
      packSize: product.packSize,
    };
  });
}

export default function Pharma() {
  const { darkMode } = useContext(ThemeContext);
  const { user, isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
  const [activeType, setActiveType] = useState("All");
  const [activeIllness, setActiveIllness] = useState("All");
  const [activeBrand, setActiveBrand] = useState("All");
  const [maxPrice, setMaxPrice] = useState(3500);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [medicines, setMedicines] = useState(SAMPLE_MEDICINES);
  const medicinesRef = useRef(medicines);
  useEffect(() => {
    medicinesRef.current = medicines;
  }, [medicines]);

  /* ── Add New Medicine (admin only) ── */
  const [addOpen, setAddOpen] = useState(false);
  const [medicineForm, setMedicineForm] = useState(EMPTY_MEDICINE_FORM);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState("");

  const [prescription, setPrescription] = useState(null);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [fullPackMap, setFullPackMap] = useState({});
  const [dragActive, setDragActive] = useState(false);

  const categoryProducts = useMemo(
    () => medicines.filter((m) => m.category === activeCategory),
    [medicines, activeCategory],
  );

  const types = ["All", ...unique(categoryProducts, "type")];
  const illnesses = ["All", ...unique(categoryProducts, "illness")];
  const brands = ["All", ...unique(categoryProducts, "brand")];
  const maxAvailable = Math.max(...medicines.map((m) => m.price), 1000);

  const filtered = categoryProducts.filter((m) => {
    if (query && !m.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (activeType !== "All" && m.type !== activeType) return false;
    if (activeIllness !== "All" && m.illness !== activeIllness) return false;
    if (activeBrand !== "All" && m.brand !== activeBrand) return false;
    if (m.price > maxPrice) return false;
    return true;
  });

  const parsedPrescription = useMemo(
    () => buildPrescriptionRows(prescriptionItems, fullPackMap, medicinesRef.current),
    [prescriptionItems, fullPackMap],
  );

  function discountedPrice(price) {
    return price * (1 - DISCOUNT_RATE);
  }

  const subtotal = cart.reduce((s, it) => s + discountedPrice(it.price) * it.qty, 0);
  const originalTotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const totalSavings = originalTotal - subtotal;

  function addToCart(item, qty = 1, meta = {}) {
    setCart((prev) => {
      const manualIndex = prev.findIndex((p) => p.id === item.id && !p.fromPrescription);
      if (!meta.fromPrescription && manualIndex >= 0) {
        return prev.map((p, idx) =>
          idx === manualIndex ? { ...p, qty: p.qty + qty } : p,
        );
      }
      if (meta.fromPrescription) {
        const rxIndex = prev.findIndex(
          (p) => p.id === item.id && p.prescriptionKey === meta.prescriptionKey,
        );
        if (rxIndex >= 0) {
          return prev.map((p, idx) => (idx === rxIndex ? { ...p, qty, ...meta } : p));
        }
      }
      return [...prev, { ...item, qty, ...meta }];
    });
    setCartOpen(true);
  }

  useEffect(() => {
    const hotDeal = location.state?.hotDeal;
    if (!hotDeal) return;

    const pharmacyProduct = medicinesRef.current.find(
      (medicine) => medicine.name.toLowerCase() === hotDeal.title.toLowerCase(),
    );
    const product = pharmacyProduct || {
      id: `hot-deal-${hotDeal.title}`,
      name: hotDeal.title,
      brand: "Medi Assist",
      type: hotDeal.type,
      illness: hotDeal.use,
      category: "Medical Devices",
      price: Number(String(hotDeal.price).replace(/[^0-9.]/g, "")) || 0,
      packSize: 1,
      unitLabel: "pack",
      img: hotDeal.image,
      manufacturer: "Medi Assist Pharmacy",
      description: hotDeal.description,
      usage: hotDeal.use,
      aliases: [hotDeal.title.toLowerCase()],
    };

    addToCart(product);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [location.state]);

  function syncPrescriptionCart(items, packMap) {
    const rows = buildPrescriptionRows(items, packMap, medicinesRef.current).filter((row) => row.available);
    setCart((prev) => {
      const manualItems = prev.filter((it) => !it.fromPrescription);
      const rxItems = rows.map((row) => ({
        ...row.product,
        qty: row.qty,
        fromPrescription: true,
        prescriptionKey: row.key,
        prescribedQty: row.prescribedQty,
        useFullPack: row.useFullPack,
        rxFrequency: row.frequency,
        rxDuration: row.duration,
      }));
      return [...manualItems, ...rxItems];
    });
    if (rows.length) setCartOpen(true);
  }

  function changeQty(id, delta, prescriptionKey = null) {
    setCart((prev) =>
      prev
        .map((it) => {
          const isTarget = prescriptionKey
            ? it.id === id && it.prescriptionKey === prescriptionKey
            : it.id === id && !it.fromPrescription;
          return isTarget ? { ...it, qty: Math.max(1, it.qty + delta) } : it;
        })
        .filter(Boolean),
    );
  }

  function removeFromCart(id, prescriptionKey = null) {
    setCart((prev) =>
      prev.filter((it) => {
        if (prescriptionKey) {
          return !(it.id === id && it.prescriptionKey === prescriptionKey);
        }
        return !(it.id === id && !it.fromPrescription);
      }),
    );
  }

  function handleCategoryChange(category) {
    setActiveCategory(category);
    setActiveType("All");
    setActiveIllness("All");
    setActiveBrand("All");
  }

  function processPrescriptionFile(file) {
    if (!file) return;
    const isAllowed =
      file.type?.startsWith("image/") ||
      file.type === "application/pdf" ||
      /\.(jpe?g|png|gif|webp|pdf)$/i.test(file.name || "");
    if (!isAllowed) return;

    const preview = URL.createObjectURL(file);
    setPrescription(Object.assign(file, { preview }));

    const detected = extractMedicinesFromPrescription(file, medicinesRef.current);
    setPrescriptionItems(detected);
    setFullPackMap({});
    syncPrescriptionCart(detected, {});
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    processPrescriptionFile(f);
    e.target.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    processPrescriptionFile(f);
  }

  function toggleFullPack(rxKey) {
    setFullPackMap((prev) => {
      const next = { ...prev, [rxKey]: !prev[rxKey] };
      syncPrescriptionCart(prescriptionItems, next);
      return next;
    });
  }

  function clearPrescription() {
    setPrescription(null);
    setPrescriptionItems([]);
    setFullPackMap({});
    setCart((prev) => prev.filter((it) => !it.fromPrescription));
  }

  function placeOrder(e) {
    e.preventDefault();
    alert(`Order placed — total: ${formatRs(subtotal)} (You saved ${formatRs(totalSavings)})`);
    setCheckoutOpen(false);
    setCart([]);
    setPrescription(null);
    setPrescriptionItems([]);
    setFullPackMap({});
  }

  function setFormField(key, value) {
    setMedicineForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMedicineImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setFormError("Please choose a valid image file (JPG, PNG, WebP).");
      return;
    }
    setFormError("");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openAddMedicine() {
    setFormError("");
    setMedicineForm(EMPTY_MEDICINE_FORM);
    setImagePreview(null);
    setAddOpen(true);
  }

  function closeAddMedicine() {
    setFormError("");
    setAddOpen(false);
  }

  function handleAddMedicine(e) {
    e.preventDefault();
    const f = medicineForm;

    if (!f.name.trim()) {
      setFormError("Please enter the medicine name.");
      return;
    }
    if (!f.price || Number(f.price) <= 0) {
      setFormError("Please enter a valid price.");
      return;
    }

    const nextId =
      medicines.length > 0 ? Math.max(...medicines.map((m) => m.id)) + 1 : 1;
    const displayName = [f.name.trim(), f.dosage.trim()].filter(Boolean).join(" ");

    const newMedicine = {
      id: nextId,
      name: displayName,
      brand: f.brand.trim() || "Pharmacy",
      type: f.type,
      illness: f.illness.trim() || "General",
      category: f.category,
      price: Number(f.price) || 0,
      packSize: Number(f.packSize) || 1,
      unitLabel: f.unitLabel,
      img: imagePreview || img1,
      manufacturer: f.manufacturer.trim() || f.brand.trim() || "Pharmacy",
      description: f.description.trim() || "No description provided.",
      usage: f.usage.trim() || "As directed by your physician or pharmacist.",
      dosage: f.dosage.trim(),
      aliases: [displayName.toLowerCase()],
    };

    setMedicines((prev) => [...prev, newMedicine]);
    setMedicineForm(EMPTY_MEDICINE_FORM);
    setImagePreview(null);
    setFormError("");
    setAddOpen(false);
  }

  return (
    <div className={`pharma-root ${darkMode ? "dark" : "light"}`}>
      <div className="pharma-top">
        <div className="search-wrap">
          <label className="search">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <input
              aria-label="Search medicines"
              placeholder="Search medicines, e.g. Paracetamol"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
            />
          </label>
        </div>

        <div className="top-actions">
          {user && isAdmin ? (
            <button
              type="button"
              className="btn primary add-medicine-btn"
              onClick={openAddMedicine}
            >
              <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add New Medicine
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setCartOpen(true)}>
              <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                <circle cx="9" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
              Cart ({cart.length})
            </button>
          )}
        </div>
      </div>

      <section className="categories-bar" aria-label="Product categories">
        <div className="label">Shop by Category</div>
        <div className="category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-chip ${activeCategory === cat ? "active" : ""}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="filters">
        <div className="filter-group">
          <div className="filter-label">Type</div>
          <div className="chips">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${activeType === t ? "active" : ""}`}
                onClick={() => setActiveType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Illness</div>
          <div className="chips">
            {illnesses.map((i) => (
              <button
                key={i}
                type="button"
                className={`chip ${activeIllness === i ? "active" : ""}`}
                onClick={() => setActiveIllness(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Brand</div>
          <div className="chips">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                className={`chip ${activeBrand === b ? "active" : ""}`}
                onClick={() => setActiveBrand(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group price-group">
          <div className="filter-label">Max Price: Rs {maxPrice}</div>
          <input
            type="range"
            min="0"
            max={Math.max(maxAvailable, 3500)}
            value={maxPrice}
            onChange={(ev) => setMaxPrice(Number(ev.target.value))}
          />
        </div>
      </div>

      <div className="main-area">
        <main className="product-grid">
          <div className="category-heading">
            <h2>{activeCategory}</h2>
            <span className="muted">{filtered.length} products</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">No products match your search or filters in {activeCategory}.</div>
          ) : (
            filtered.map((p) => (
              <article key={p.id} className="card">
                <div className="card-image">
                  <img src={p.img} alt={p.name} />
                  <span className="card-category-badge">{p.category}</span>
                </div>
                <div className="card-body">
                  <h3 className="p-name">{p.name}</h3>
                  <div className="p-meta">
                    {p.brand} • {p.type}
                  </div>
                  <div className="p-illness">Use: {p.illness}</div>
                  <div className="p-pack muted">Pack: {p.packSize} {p.unitLabel}{p.packSize > 1 ? "s" : ""}</div>
                  <div className="card-footer">
                    <div className="price">
                      <div className="price-original muted" style={{ fontSize: 12 }}>
                        <s>{formatRs(p.price)}</s>
                      </div>
                      <div className="price-discounted">{formatRs(discountedPrice(p.price))}</div>
                      <div className="price-note muted" style={{ fontSize: 12 }}>
                        {(DISCOUNT_RATE * 100).toFixed(0)}% off
                      </div>
                    </div>
                    <div className="card-actions">
                      <button type="button" className="btn outline" onClick={() => setSelectedProduct(p)}>
                        Details
                      </button>
                      <button type="button" className="btn primary" onClick={() => addToCart(p)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </main>

        <aside className="side-panel">
          <div className="prescription">
            <h4>Upload Prescription</h4>
            <p className="prescription-hint">
              Upload your prescription — medicines will auto-add to cart as per dosage (not full pack).
            </p>
            <label
              className={`upload-box ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input type="file" accept="image/*,application/pdf" onChange={handleFile} />
              <div className="upload-content">
                <svg className="icon big" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <rect x="3" y="15" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                <div className="small">
                  {dragActive ? "Drop prescription here" : "Drag & drop or click to upload"}
                </div>
                <div className="hint">Accepted: JPG, PNG, PDF</div>
              </div>
            </label>

            {prescription && (
              <div className="preview">
                {prescription.type?.startsWith("image/") ? (
                  <img src={prescription.preview} alt="prescription" />
                ) : (
                  <div className="preview-pdf">PDF</div>
                )}
                <div className="preview-meta">
                  <div>{prescription.name}</div>
                  <div className="muted">{Math.round(prescription.size / 1024)} KB</div>
                </div>
                <button type="button" className="btn small ghost" onClick={clearPrescription}>
                  Remove
                </button>
              </div>
            )}

            {parsedPrescription.length > 0 && (
              <div className="rx-detected">
                <h5>Detected from prescription</h5>
                <p className="rx-summary muted">
                  {parsedPrescription.filter((r) => r.available).length} available •{" "}
                  {parsedPrescription.filter((r) => !r.available).length} not available
                </p>
                {parsedPrescription.map((row) =>
                  row.available ? (
                    <div key={row.key} className="rx-item">
                      <div className="rx-item-head">
                        <strong>{row.product.name}</strong>
                        <span className="rx-qty-badge">
                          {row.qty} {row.unitLabel}
                          {row.qty > 1 ? "s" : ""}
                          {row.useFullPack ? " (full pack)" : " (as prescribed)"}
                        </span>
                      </div>
                      <div className="rx-item-meta muted">
                        {row.frequency} • {row.duration} → {row.prescribedQty} {row.unitLabel}
                        {row.prescribedQty > 1 ? "s" : ""} needed
                      </div>
                      {row.packSize > 1 && (
                        <button
                          type="button"
                          className={`btn small ${row.useFullPack ? "primary" : "outline"}`}
                          onClick={() => toggleFullPack(row.key)}
                        >
                          {row.useFullPack
                            ? `Using full pack (${row.packSize})`
                            : `Add full pack (${row.packSize} ${row.unitLabel}s)`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div key={row.key} className="rx-item rx-item-unavailable">
                      <div className="rx-item-head">
                        <strong>{row.rawName}</strong>
                        <span className="rx-unavailable-badge">Unavailable</span>
                      </div>
                      <div className="rx-item-meta muted">
                        {row.frequency} • {row.duration}
                      </div>
                  <p className="rx-unavailable-msg">
                    This medicine is not available
                  </p>
                  <p className="rx-unavailable-hint muted">
                    Not added to cart — currently out of stock in pharmacy
                  </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="quick-info">
            <div className="qi-row">
              <strong>Free delivery</strong> over Rs 1000
            </div>
            <div className="qi-row">Secure payments • 24/7 support</div>
            <div className="qi-row">Verified sellers</div>
          </div>

          <div className="checkout-area">
            <div className="subtotal">
              Subtotal: <strong>{formatRs(subtotal)}</strong>
            </div>
            {totalSavings > 0 && <div className="savings muted">You save: {formatRs(totalSavings)}</div>}
            <div className="checkout-buttons">
              <button type="button" className="btn ghost" onClick={() => setCartOpen(true)}>
                View Cart
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => setCheckoutOpen(true)}
                disabled={cart.length === 0}
              >
                Checkout
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className={`cart-drawer ${cartOpen ? "open" : ""}`}>
        <div className="drawer-head">
          <div className="title">Your Cart</div>
          <button type="button" className="close" onClick={() => setCartOpen(false)} aria-label="Close cart">
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty">Cart is empty</div>
          ) : (
            cart.map((it) => {
              const dp = discountedPrice(it.price);
              const lineTotal = dp * it.qty;
              const lineSavings = (it.price - dp) * it.qty;
              return (
                <div className="cart-item" key={`${it.id}-${it.fromPrescription ? it.prescriptionKey : "manual"}`}>
                  <img src={it.img} alt={it.name} />
                  <div className="ci-meta">
                    <div className="ci-name">{it.name}</div>
                    <div className="muted">{it.brand}</div>
                    {it.fromPrescription && (
                      <div className="rx-cart-note">
                        Rx: {it.useFullPack ? `Full pack (${it.packSize})` : `${it.prescribedQty} as prescribed`}
                      </div>
                    )}
                    <div className="ci-controls">
                      <button
                        type="button"
                        className="qty"
                        onClick={() => changeQty(it.id, -1, it.prescriptionKey || null)}
                      >
                        -
                      </button>
                      <span className="qty-num">{it.qty}</span>
                      <button
                        type="button"
                        className="qty"
                        onClick={() => changeQty(it.id, +1, it.prescriptionKey || null)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="ci-right">
                    <div className="ci-price">
                      <div style={{ fontSize: 12 }} className="muted">
                        <s>{formatRs(it.price)}</s>
                      </div>
                      <div>
                        {formatRs(dp)}{" "}
                        <span className="muted" style={{ fontSize: 12 }}>
                          / pack
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Line: {formatRs(lineTotal)}
                      </div>
                      {lineSavings > 0 && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Saved {formatRs(lineSavings)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn small ghost"
                      onClick={() => removeFromCart(it.id, it.prescriptionKey || null)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="drawer-foot">
          <div className="total">
            <div>
              Original: <span className="muted">{formatRs(originalTotal)}</span>
            </div>
            <div>
              Total: <strong>{formatRs(subtotal)}</strong>
            </div>
            {totalSavings > 0 && <div className="muted">You saved {formatRs(totalSavings)}</div>}
          </div>
          <div className="drawer-actions">
            <button type="button" className="btn ghost" onClick={() => setCartOpen(false)}>
              Continue shopping
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setCheckoutOpen(true);
                setCartOpen(false);
              }}
              disabled={cart.length === 0}
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      {checkoutOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <button type="button" className="modal-close" onClick={() => setCheckoutOpen(false)}>
              ✕
            </button>
            <h3>Checkout</h3>
            <form onSubmit={placeOrder}>
              <div className="form-row">
                <input name="name" required placeholder="Full name" />
                <input name="phone" required placeholder="Phone number" />
              </div>
              <input name="address" required placeholder="Delivery address" />
              <div className="form-row">
                <label className="radio">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />{" "}
                  Cash on Delivery
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />{" "}
                  Card / Online
                </label>
                {paymentMethod === "card" && (
                  <div className="card-payment">
                    <input type="text" placeholder="Card Holder Name" required />
                    <input type="text" placeholder="Card Number" maxLength="16" required />
                    <div className="form-row">
                      <input type="text" placeholder="MM/YY" required />
                      <input type="text" placeholder="CVV" maxLength="3" required />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12 }} className="order-summary">
                <div>
                  Subtotal: <strong>{formatRs(subtotal)}</strong>
                </div>
                {totalSavings > 0 && <div className="muted">You saved {formatRs(totalSavings)}</div>}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setCheckoutOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={cart.length === 0}>
                  Place order ({formatRs(subtotal)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedProduct(null)}
        >
          <div className="modal-card details" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close details"
            >
              ✕
            </button>
            <div className="details-body">
              <div className="details-image">
                <img src={selectedProduct.img} alt={selectedProduct.name} />
              </div>
              <div className="details-info">
                <h3 className="p-name">{selectedProduct.name}</h3>
                <div className="p-meta">
                  {selectedProduct.brand} • {selectedProduct.type} • {selectedProduct.category}
                </div>
                <div className="p-illness">Use: {selectedProduct.illness}</div>
                <div className="desc">
                  <div>
                    <strong>Manufacturer:</strong> {selectedProduct.manufacturer || selectedProduct.brand}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {selectedProduct.description}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Usage:</strong> {selectedProduct.usage}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Pack size:</strong> {selectedProduct.packSize} {selectedProduct.unitLabel}
                    {selectedProduct.packSize > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="price" style={{ marginTop: 8 }}>
                  <div className="price-original muted" style={{ fontSize: 12 }}>
                    <s>{formatRs(selectedProduct.price)}</s>
                  </div>
                  <div className="price-discounted">{formatRs(discountedPrice(selectedProduct.price))}</div>
                  <div className="price-note muted" style={{ fontSize: 12 }}>
                    {(DISCOUNT_RATE * 100).toFixed(0)}% off
                  </div>
                </div>
                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn ghost" onClick={() => setSelectedProduct(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div
          className="modal-backdrop add-medicine-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeAddMedicine}
        >
          <div
            className="modal-card add-medicine-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeAddMedicine}
              aria-label="Close add medicine"
            >
              ✕
            </button>

            <h3 className="add-medicine-heading">Add New Medicine</h3>
            <p className="add-medicine-subtitle">
              Fill in the details below to add a new medicine to the pharmacy.
            </p>

            {formError && <div className="add-medicine-error">{formError}</div>}

            <form className="add-medicine-form" onSubmit={handleAddMedicine}>
              <div className="add-medicine-grid">
                <div className="field">
                  <label>Medicine Name *</label>
                  <input
                    type="text"
                    value={medicineForm.name}
                    onChange={(e) => setFormField("name", e.target.value)}
                    placeholder="e.g. Paracetamol"
                  />
                </div>
                <div className="field">
                  <label>Dosage / Strength</label>
                  <input
                    type="text"
                    value={medicineForm.dosage}
                    onChange={(e) => setFormField("dosage", e.target.value)}
                    placeholder="e.g. 500mg / 250mg / 100ml"
                  />
                </div>
                <div className="field">
                  <label>Category *</label>
                  <select
                    value={medicineForm.category}
                    onChange={(e) => setFormField("category", e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Type *</label>
                  <select
                    value={medicineForm.type}
                    onChange={(e) => setFormField("type", e.target.value)}
                  >
                    {MEDICINE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Brand</label>
                  <input
                    type="text"
                    value={medicineForm.brand}
                    onChange={(e) => setFormField("brand", e.target.value)}
                    placeholder="e.g. MediCure"
                  />
                </div>
                <div className="field">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    value={medicineForm.manufacturer}
                    onChange={(e) => setFormField("manufacturer", e.target.value)}
                    placeholder="e.g. MediCure Labs"
                  />
                </div>
                <div className="field">
                  <label>Pack Size *</label>
                  <input
                    type="number"
                    min="1"
                    value={medicineForm.packSize}
                    onChange={(e) => setFormField("packSize", e.target.value)}
                    placeholder="e.g. 10 tablets"
                  />
                </div>
                <div className="field">
                  <label>Unit</label>
                  <select
                    value={medicineForm.unitLabel}
                    onChange={(e) => setFormField("unitLabel", e.target.value)}
                  >
                    {UNIT_LABELS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Price (Rs) *</label>
                  <input
                    type="number"
                    min="0"
                    value={medicineForm.price}
                    onChange={(e) => setFormField("price", e.target.value)}
                    placeholder="e.g. 250"
                  />
                </div>
                <div className="field">
                  <label>Used For (Indication)</label>
                  <input
                    type="text"
                    value={medicineForm.illness}
                    onChange={(e) => setFormField("illness", e.target.value)}
                    placeholder="e.g. Fever, Pain, Cough"
                  />
                </div>
              </div>

              <div className="field">
                <label>Usage Instructions</label>
                <textarea
                  rows="2"
                  value={medicineForm.usage}
                  onChange={(e) => setFormField("usage", e.target.value)}
                  placeholder="e.g. Adults: 500mg every 4–6 hours as needed. Do not exceed 4g/day."
                />
              </div>

              <div className="field">
                <label>Detailed Description</label>
                <textarea
                  rows="3"
                  value={medicineForm.description}
                  onChange={(e) => setFormField("description", e.target.value)}
                  placeholder="Add a detailed description of the medicine, its uses and any warnings..."
                />
              </div>

              <div className="field">
                <label>Medicine Image</label>
                <label className={`image-upload-box ${imagePreview ? "has-image" : ""}`}>
                  <input type="file" accept="image/*" onChange={handleMedicineImage} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="medicine preview" />
                  ) : (
                    <span className="image-upload-placeholder">
                      <svg className="icon big" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 16V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                        <path d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                        <rect x="3" y="15" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                      </svg>
                      <span>Click to upload an image</span>
                      <span className="hint">Accepted: JPG, PNG, WebP</span>
                    </span>
                  )}
                </label>
              </div>

              <div className="modal-actions add-medicine-actions">
                <button type="button" className="btn ghost" onClick={closeAddMedicine}>
                  Cancel
                </button>
                <button type="submit" className="btn primary upload-btn">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
