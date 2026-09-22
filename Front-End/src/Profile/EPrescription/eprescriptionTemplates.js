// =============================================================================
// PRESCRIPTION TEMPLATE PRESETS & PERSISTENCE
// =============================================================================
import clinicLogo from "../../images/clinic-logo.png";

export const TEMPLATE_STORAGE_KEY = "curaaid-epres-template";

export const PRESCRIPTION_TEMPLATES = [
  {
    id: "curaaid-classic",
    name: "CuraAid Classic",
    description: "Logo left, center details, CuraAid brand on right",
    slipClass: "epres-tpl-classic",
    titleBarClass: "epres-bar-classic",
    showCuraAidBrand: true,
    hospitalName: "CuraAid Medical Center",
    hospitalAddress: "Smart Healthcare Platform — Pakistan",
    hospitalTel: "support@curaaid.com",
    titleText: "PRESCRIPTION SLIP",
  },
  {
    id: "hospital-navy",
    name: "Hospital Navy",
    description: "Navy header band with white clinic details",
    slipClass: "epres-tpl-navy",
    titleBarClass: "epres-bar-navy",
    showCuraAidBrand: true,
    hospitalName: "CuraAid Medical Center",
    hospitalAddress: "Smart Healthcare Platform — Pakistan",
    hospitalTel: "support@curaaid.com",
    titleText: "PRESCRIPTION SLIP",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean header with green accent bar and CuraAid brand",
    slipClass: "epres-tpl-minimal",
    titleBarClass: "epres-bar-minimal",
    showCuraAidBrand: true,
    hospitalName: "CuraAid Medical Center",
    hospitalAddress: "Smart Healthcare Platform — Pakistan",
    hospitalTel: "support@curaaid.com",
    titleText: "PRESCRIPTION SLIP",
  },
  {
    id: "professional-blue",
    name: "Professional Blue",
    description: "Bold blue title bar with bordered header",
    slipClass: "epres-tpl-blue",
    titleBarClass: "epres-bar-blue",
    showCuraAidBrand: true,
    hospitalName: "CuraAid Medical Center",
    hospitalAddress: "Smart Healthcare Platform — Pakistan",
    hospitalTel: "support@curaaid.com",
    titleText: "PRESCRIPTION SLIP",
  },
];

export const DEFAULT_TEMPLATE_ID = "curaaid-classic";

export const getTemplateById = (id) =>
  PRESCRIPTION_TEMPLATES.find((t) => t.id === id) ||
  PRESCRIPTION_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);

export const getDefaultTemplateConfig = () => {
  const preset = getTemplateById(DEFAULT_TEMPLATE_ID);
  return {
    templateId: preset.id,
    clinicLogo: clinicLogo,
    hospitalName: preset.hospitalName,
    hospitalAddress: preset.hospitalAddress,
    hospitalTel: preset.hospitalTel,
    titleText: preset.titleText,
    showCuraAidBrand: true,
  };
};

export const loadTemplateConfig = () => {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return getDefaultTemplateConfig();
    const saved = JSON.parse(raw);
    const preset = getTemplateById(saved.templateId);
    return {
      ...getDefaultTemplateConfig(),
      ...saved,
      templateId: saved.templateId || preset.id,
      showCuraAidBrand: true,
    };
  } catch {
    return getDefaultTemplateConfig();
  }
};

export const saveTemplateConfig = (config) => {
  const preset = getTemplateById(config.templateId);
  const payload = {
    templateId: preset.id,
    clinicLogo: config.clinicLogo || clinicLogo,
    hospitalName: config.hospitalName?.trim() || preset.hospitalName,
    hospitalAddress: config.hospitalAddress?.trim() || preset.hospitalAddress,
    hospitalTel: config.hospitalTel?.trim() || preset.hospitalTel,
    titleText: config.titleText?.trim() || preset.titleText,
    showCuraAidBrand: true,
  };
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
  return payload;
};

/** Header fields merged into prescription data */
export const getTemplateHeaderFields = () => {
  const config = loadTemplateConfig();
  const preset = getTemplateById(config.templateId);
  return {
    templateId: preset.id,
    slipClass: preset.slipClass,
    titleBarClass: preset.titleBarClass,
    clinicLogo: config.clinicLogo || clinicLogo,
    hospitalName: config.hospitalName || preset.hospitalName,
    hospitalAddress: config.hospitalAddress || preset.hospitalAddress,
    hospitalTel: config.hospitalTel || preset.hospitalTel,
    titleText: config.titleText || preset.titleText,
    showCuraAidBrand: true,
  };
};
