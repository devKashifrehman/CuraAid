import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./opd.css";
import { ThemeContext } from "../../Theme/ThemeContext";
import { AuthContext } from "../../HeadFoot/Auth/AuthContext";
import {
  FaTrophy,
  FaStar,
  FaPhone,
  FaComments,
  FaHeartbeat,
  FaBrain,
  FaBandAid,
  FaBaby,
  FaUserMd,
  FaTooth,
  FaEye,
  FaFemale,
  FaMicrophone,
  FaStop,
  FaLock,
  FaTimes,
  FaCheckCircle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCalendarCheck,
} from "react-icons/fa";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// ============================================================
// JSON DATA - CONTENT
// ============================================================
const CONTENT = {
  en: {
    welcome:
      " Welcome to Medi Assist! I'm your health assistant. Describe your symptoms or select a specialist below.",
    empathy: [
      "I understand how you're feeling. Let me help you with that.",
      "Thank you for sharing the details. I'll find the right doctor for you.",
      "I hear you. Let's figure this out together.",
      "I'm here to help. Let me assist you in finding the best specialist.",
    ],
    askAge:
      "I understand. Before I recommend a doctor, may I know your age please?",
    askDuration:
      "How long have you been experiencing these symptoms? (e.g., 3 days, 1 week)",
    askSymptoms:
      "Could you please describe your symptoms in more detail? This will help me find the most suitable specialist.",
    emergency:
      "This sounds like an emergency! Please seek immediate medical attention. I'm showing you the nearest available doctors.",
    doctorFound: "I have found the most suitable doctors for your condition:",
    confirmCondition: (dept, confidence) =>
      `Based on your symptoms, I recommend consulting a ${dept} (${Math.round(confidence * 100)}% confidence).`,
    top1Prompt:
      "Based on your symptoms, I can recommend the most suitable available doctor. Would you like to view my recommendation?",
    top1Response: (doc) =>
      `Based on your symptoms, I recommend Dr. ${doc.name} (${doc.specialization}) — rating ${doc.rating}/5, ${doc.experience} years of experience. Currently ${doc.status}.`,
    allDoctorsPrompt:
      "You can view all available doctors above or select a specialist from the list.",
    consultStart:
      "You can now discuss your health concerns directly with the doctor.",
    calling: (doc) => `Connecting you with Dr. ${doc.name}... Please wait.`,
    greetingFallback:
      "Hello! How can I help you today? Please describe your symptoms so I can find the right specialist for you.",
    vagueFallback:
      "I'm here to help with medical queries. Please describe your symptoms in more detail. For example: fever, cough, headache, chest pain, etc.",
    multipleSpecialists:
      "Based on your symptoms, multiple specialists may be suitable. Here are the top matches:",
  },
  ur: {
    welcome:
      "Medi Assist میں خوش آمدید! میں آپ کا ہیلتھ اسسٹنٹ ہوں۔ اپنی علامات بیان کریں یا نیچے ماہر کا انتخاب کریں۔",
    empathy: [
      "میں سمجھتا ہوں کہ آپ کیسا محسوس کر رہے ہیں۔ میں آپ کی مدد کروں گا۔",
      "تفصیلات کا شکریہ۔ میں آپ کے لیے بہترین ڈاکٹر ڈھونڈوں گا۔",
      "میں آپ کی بات سن رہا ہوں۔ مل کر حل نکالیں گے۔",
      "میں حاضر ہوں۔ آپ کو بہترین ماہر تلاش کرنے میں مدد کروں گا۔",
    ],
    askAge:
      "میں سمجھ گیا۔ ڈاکٹر تجویز کرنے سے پہلے، کیا آپ اپنی عمر بتا سکتے ہیں؟",
    askDuration: "یہ علامات کب سے ہیں؟ (مثال: 3 دن، 1 ہفتہ)",
    askSymptoms:
      "براہ کرم اپنی علامات مزید تفصیل سے بیان کریں۔ اس سے مجھے بہترین ماہر تلاش کرنے میں مدد ملے گی۔",
    emergency:
      "یہ ایمرجنسی لگتا ہے! براہ کرم فوری طبی امداد حاصل کریں۔ میں قریبی دستیاب ڈاکٹر دکھا رہا ہوں۔",
    doctorFound: "میں نے آپ کی حالت کے لیے بہترین ڈاکٹرز تلاش کر لیے ہیں:",
    confirmCondition: (dept, confidence) =>
      `آپ کی علامات کی بنیاد پر، میں ${dept} سے مشورہ تجویز کرتا ہوں (${Math.round(confidence * 100)}% اعتماد)۔`,
    top1Prompt:
      "آپ کی علامات کی بنیاد پر، میں سب سے موزوں دستیاب ڈاکٹر تجویز کر سکتا ہوں۔ کیا آپ میری سفارش دیکھنا چاہیں گے؟",
    top1Response: (doc) =>
      `آپ کی علامات کی بنیاد پر، میں ڈاکٹر ${doc.name} (${doc.specialization}) تجویز کرتا ہوں — ریٹنگ ${doc.rating}/5, ${doc.experience} سال کا تجربہ۔ فی الحال ${doc.status}۔`,
    allDoctorsPrompt:
      "آپ اوپر تمام دستیاب ڈاکٹر دیکھ سکتے ہیں یا فہرست سے کوئی ماہر منتخب کر سکتے ہیں۔",
    consultStart:
      "آپ اب براہ راست ڈاکٹر سے اپنی صحت کے مسائل پر گفتگو کر سکتے ہیں۔",
    calling: (doc) =>
      `ڈاکٹر ${doc.name} سے منسلک کر رہا ہوں... براہ کرم انتظار کریں۔`,
    greetingFallback:
      "ہیلو! آج میں کیسے مدد کر سکتا ہوں؟ براہ کرم اپنی علامات بیان کریں تاکہ میں آپ کے لیے صحیح ماہر تلاش کر سکوں۔",
    vagueFallback:
      "میں طبی سوالات میں مدد کے لیے ہوں۔ براہ کرم اپنی علامات مزید تفصیل سے بیان کریں۔ مثلاً: بخار، کھانسی، سر درد، سینے کا درد وغیرہ۔",
    multipleSpecialists:
      "آپ کی علامات کی بنیاد پر، متعدد ماہرین موزوں ہو سکتے ہیں۔ یہ ہیں ٹاپ میچز:",
  },
  roman: {
    welcome:
      "OPD mein khush amdeed! Main apka health assistant hoon. Apni alamaat bayan karein ya neechay specialist ka intekhab karein.",
    empathy: [
      "Main samajhta hoon ke ap kaisay mehsoos kar rahay hain. Main apki madad karunga.",
      "Tafseelaat ka shukriya. Main apke liye behtareen doctor dhoondunga.",
      "Main apki baat sun raha hoon. Mil kar hal nikalte hain.",
      "Main hazir hoon. Apko behtareen maahir talash karne mein madad karunga.",
    ],
    askAge:
      "Main samajh gaya. Doctor tajweez karne se pehle, kya ap apni umar bata sakte hain?",
    askDuration: "Ye alamaat kab se hain? (Misaal: 3 din, 1 hafta)",
    askSymptoms:
      "Barah-e-meharbani apni alamaat mazeed tafseel se bayan karein. Is se mujhe behtareen maahir talash karne mein madad milegi.",
    emergency:
      "Ye emergency lagta hai! Barah-e-meharbani fori tibbi imdad hasil karein. Main qareebi dastiyab doctor dikha raha hoon.",
    doctorFound:
      "Maine apki halat ke liye behtareen doctors talash kar liye hain:",
    confirmCondition: (dept, confidence) =>
      `Apki alamaat ki buniyad par, main ${dept} se mashwara tajweez karta hoon (${Math.round(confidence * 100)}% confidence).`,
    top1Prompt:
      "Apki alamaat ki buniyad par, main sab se mozoon dastiyab doctor tajweez kar sakta hoon. Kya ap meri sifarish dekhna chahenge?",
    top1Response: (doc) =>
      `Apki alamaat ki buniyad par, main Dr. ${doc.name} (${doc.specialization}) tajweez karta hoon — rating ${doc.rating}/5, ${doc.experience} saal ka tajurba. Filhaal ${doc.status}۔`,
    allDoctorsPrompt:
      "Ap ooper tamam dastiyab doctor dekh sakte hain ya list se koi maahir muntakhib kar sakte hain.",
    consultStart:
      "Ap ab barah-e-raast doctor se apni sehat ke masail par guftagu kar sakte hain.",
    calling: (doc) =>
      `Doctor ${doc.name} se munsalik kar raha hoon... Barah-e-meharbani intezaar karein.`,
    greetingFallback:
      "Hello! Aaj mein kaise madad kar sakta hoon? Barah-e-meharbani apni alamaat bayan karein taake main apke liye sahi maahir talash kar sakon.",
    vagueFallback:
      "Main tibbi sawalaat mein madad ke liye hoon. Barah-e-meharbani apni alamaat mazeed tafseel se bayan karein. Misaalan: bukhar, khansi, sar dard, seenay ka dard waghera.",
    multipleSpecialists:
      "Apki alamaat ki buniyad par, mutaaddid maahireen mozoon ho sakte hain. Ye hain top matches:",
  },
};

// ============================================================
// API-BASED DOCTOR FETCHING
// ============================================================
const fetchDoctorsBySpecialty = async (specialty) => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/opd/doctors/specialty/${encodeURIComponent(specialty)}`,
      { timeout: 8000 }
    );
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch {
    return [];
  }
};

const fetchAvailableDoctors = async () => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/opd/doctors/available`,
      { timeout: 8000 }
    );
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch {
    return [];
  }
};

const fetchSpecialties = async () => {
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/opd/specialties`,
      { timeout: 8000 }
    );
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch {
    return [];
  }
};

const SPECIALIST_ICON_MAP = {
  Cardiologist: FaHeartbeat,
  Neurologist: FaBrain,
  Dermatologist: FaBandAid,
  Pediatrician: FaBaby,
  "General Physician": FaUserMd,
  Dentist: FaTooth,
  "Eye Specialist": FaEye,
  Psychologist: FaBrain,
  Gynecologist: FaFemale,
};
const getSpecialistIcon = (name) => SPECIALIST_ICON_MAP[name] || FaUserMd;

let _doctorCache = {};
const getCachedDoctors = async (key, fetcher) => {
  if (_doctorCache[key] && Date.now() - _doctorCache[key].ts < 60000) {
    return _doctorCache[key].data;
  }
  const data = await fetcher();
  _doctorCache[key] = { data, ts: Date.now() };
  return data;
};

// ============================================================
// NLP MODULES
// ============================================================

// ── SYMPTOMS MAPPING (300+ Symptoms) ──
const symptomsMapping = {
  pain: {
    en: ["pain", "ache", "aching", "hurts", "hurt", "sore", "discomfort"],
    ur: ["درد", "تکلیف"],
    roman: ["dard", "taklif", "takleef", "drd"],
  },
  fever: {
    en: ["fever", "temp", "temperature", "pyrexia", "high temp", "hot body"],
    ur: ["بخار", "تب", "گرمی"],
    roman: ["bukhar", "bukhaar", "fver", "feever", "garmi", "garam"],
  },
  cough: {
    en: ["cough", "coughing", "dry cough", "wet cough", "coughing"],
    ur: ["کھانسی", "کھانس"],
    roman: ["khansi", "khaansi", "khansy", "khasi", "khansee"],
  },
  cold: {
    en: ["cold", "flu", "runny nose", "stuffy nose", "nasal congestion"],
    ur: ["زکام", "نزلہ", "سردی"],
    roman: ["sardi", "zukam", "zukaam", "nazla"],
  },
  weakness: {
    en: ["weakness", "weak", "tired", "fatigue", "exhausted", "lethargy"],
    ur: ["کمزوری", "تھکاوٹ"],
    roman: ["kamzori", "kamzoori", "thakan"],
  },
  headache: {
    en: ["headache", "head pain", "migraine", "migrane", "headche"],
    ur: ["سر درد", "سردرد"],
    roman: ["sar dard", "sir dard", "sir mein dard", "maigrain"],
  },
  nausea: {
    en: ["nausea", "nauseous", "vomiting", "vomit", "puke", "queasiness"],
    ur: ["متلی", "الٹی"],
    roman: ["matli", "ulti", "ultee"],
  },
  bodyPain: {
    en: ["body ache", "body pain", "muscle pain", "bodyache"],
    ur: ["جسم درد", "پورے جسم میں درد"],
    roman: ["jism dard", "poora jism dard", "badan dard", "badan mein dard"],
  },
  chestPain: {
    en: ["chest pain", "chest ache", "chest tightness"],
    ur: ["سینے میں درد", "چھاتی کا درد"],
    roman: ["seena dard", "sina dard", "chest mein dard", "seene mein dard"],
  },
  heartPain: {
    en: ["heart pain", "cardiac pain", "heart ache", "hartache"],
    ur: ["دل کا درد", "دل میں درد"],
    roman: ["dil mein dard", "dil dard"],
  },
  breathShort: {
    en: [
      "shortness of breath",
      "breathing problem",
      "breathless",
      "cant breathe",
      "can't breathe",
      "breathing difficulty",
    ],
    ur: ["سانس پھولنا", "سانس نہ آنا", "دم گھٹنا"],
    roman: ["dam ghutna", "saans phoolna", "saans nahi ata", "saans nhi ata"],
  },
  heartRace: {
    en: ["palpitation", "heart racing", "fast heartbeat", "tachycardia"],
    ur: ["دل کی دھڑکن تیز ہونا", "دل دھڑکنا"],
    roman: ["dil tez dharak", "dil dhadak"],
  },
  skinRash: {
    en: ["rash", "skin rash", "skin problem", "itching", "itchy", "itch"],
    ur: ["خارش", "جلد کی الرجی", "چمڑی"],
    roman: ["kharish", "khujli", "chamri"],
  },
  acne: {
    en: ["pimple", "pimples", "zit", "blackhead", "whitehead", "acne"],
    ur: ["مہاسے", "دانے"],
    roman: ["muhase", "muhasay"],
  },
  skinSpots: {
    en: ["spot", "spots", "patch", "dark spot", "blemish"],
    ur: ["داغ", "پھبیاں"],
    roman: ["daag", "dag"],
  },
  allergy: {
    en: [
      "allergy",
      "allergic",
      "alergy",
      "allerji",
      "allergic reaction",
      "hives",
      "urticaria",
    ],
    ur: ["الرجی", "حساسیت"],
    roman: ["allergy", "allergic"],
  },
  skinDry: {
    en: ["dry skin", "flaky skin", "eczema", "psoriasis", "dermatitis"],
    ur: ["خشک جلد", "ایگزیما"],
    roman: ["khushki"],
  },
  toothPain: {
    en: ["tooth pain", "toothache", "molar pain", "dental pain"],
    ur: ["دانت درد", "دانت میں درد"],
    roman: ["dant dard", "daant dard", "dant mein dard", "daant mein dard"],
  },
  gumPain: {
    en: ["gum pain", "gum bleeding", "bleeding gums", "swollen gum"],
    ur: ["مسوڑھوں کا درد", "مسوڑھوں سے خون"],
    roman: ["masora dard", "masura dard"],
  },
  cavity: {
    en: ["cavity", "cavities", "tooth decay", "caries", "chipped tooth"],
    ur: ["دانت میں سڑن", "کھوکھا"],
    roman: ["khokha"],
  },
  jawPain: {
    en: ["jaw pain", "jaw ache", "tmj", "jaw swelling"],
    ur: ["جبڑے کا درد", "جبڑے کی سوجن"],
    roman: ["jabra dard"],
  },
  eyePain: {
    en: ["eye pain", "eyes hurt", "eye ache"],
    ur: ["آنکھ درد", "آنکھ میں درد"],
    roman: ["aankh dard", "ankh dard", "aankh mein dard"],
  },
  blurVision: {
    en: ["blurry vision", "blur vision", "can't see clearly", "vision problem"],
    ur: ["دھندلا نظر", "نظر کمزور"],
    roman: ["dhundhla", "dhundhli nazar", "nazar kamzor"],
  },
  redEye: {
    en: ["red eye", "pink eye", "conjunctivitis", "sore eye", "eye infection"],
    ur: ["آنکھ لال", "آنکھوں کی سوزش"],
    roman: ["aankh lal"],
  },
  wateringEye: {
    en: ["watering eye", "teary eye", "eyes watering", "tearing eye"],
    ur: ["آنکھوں سے پانی", "آنسو"],
    roman: ["aankh se pani", "eyes watering"],
  },
  stress: {
    en: ["stress", "stres", "strss", "tension", "worried", "worry"],
    ur: ["دباؤ", "تناؤ", "پریشانی"],
    roman: ["tension", "tenshun", "pareshan", "preshan"],
  },
  anxiety: {
    en: ["anxiety", "anxious", "anksiety", "panic attack", "panic", "phobia"],
    ur: ["پریشانی", "خوف", "گھبراہٹ"],
    roman: ["ghabrahat", "anxiety", "anxious"],
  },
  depression: {
    en: ["depression", "depressed", "depresion", "sad", "hopeless"],
    ur: ["افسردگی", "اداسی", "مایوسی"],
    roman: ["udaas", "udas", "dil bujha"],
  },
  sleep: {
    en: ["sleep problem", "insomnia", "sleepless", "cant sleep", "can't sleep"],
    ur: ["نیند نہیں آنا", "بے خوابی"],
    roman: ["neend nahi", "neend na ana", "nind nhi", "raat ko neend"],
  },
  mental: {
    en: [
      "mental health",
      "mental problem",
      "overthinking",
      "negative thoughts",
      "mood swings",
    ],
    ur: ["دماغی صحت", "ذہنی دباؤ"],
    roman: ["dimag thaka", "overthinking"],
  },
  period: {
    en: ["period", "periods", "menstrual", "menstruation", "irregular period"],
    ur: ["حیض", "ماہواری", "پیریڈ"],
    roman: ["haiz", "masik", "mc problem"],
  },
  pregnancy: {
    en: ["pregnancy", "pregnant", "baby", "expecting", "conception"],
    ur: ["حمل", "بچہ"],
    roman: ["hamla", "hamal", "baby", "expecting"],
  },
  pelvicPain: {
    en: [
      "pelvic pain",
      "lower abdominal pain",
      "lower belly pain",
      "pelvis",
      "ovary pain",
      "uterus pain",
    ],
    ur: ["پیٹ کے نیچے درد", "pelvic درد"],
    roman: ["pet ke neeche dard", "lower belly pain", "pelvis"],
  },
  bleeding: {
    en: ["abnormal bleeding", "vaginal bleeding", "bleeding", "spotting"],
    ur: ["غیر معمولی خون", "خون"],
    roman: ["bleeding", "spotting"],
  },
  dizziness: {
    en: ["dizziness", "dizzy", "lightheaded", "vertigo"],
    ur: ["چکر", "چکرانا"],
    roman: ["chakkar", "chakrana"],
  },
  stomach: {
    en: ["stomach pain", "abdominal pain", "belly ache", "stomach ache"],
    ur: ["پیٹ کا درد"],
    roman: ["pet ka dard"],
  },
  diabetes: {
    en: ["diabetes", "high blood sugar", "sugar", "diabetic"],
    ur: ["ذیابیطس", "شوگر"],
    roman: ["zabitis", "sugar", "diabetes"],
  },
  bloodPressure: {
    en: ["blood pressure", "high bp", "low bp", "hypertension"],
    ur: ["بلڈ پریشر", "پریشر"],
    roman: ["blood pressure", "bp", "pressure"],
  },
  acidity: {
    en: ["acidity", "heartburn", "acid reflux", "indigestion"],
    ur: ["تیزابیت", "ایسڈ"],
    roman: ["tezabit", "acidity", "acid"],
  },
  hairFall: {
    en: ["hair fall", "hair loss", "balding", "alopecia"],
    ur: ["بالوں کا گرنا", "گنج پن"],
    roman: ["balon ka girna", "ganjapan"],
  },
  backPain: {
    en: ["back pain", "lower back pain", "backache", "lumbago"],
    ur: ["کمر کا درد", "پیٹھ کا درد"],
    roman: ["kamar ka dard", "peeth ka dard"],
  },
  neckPain: {
    en: ["neck pain", "stiff neck", "cervical pain"],
    ur: ["گردن کا درد", "گردن میں اکڑن"],
    roman: ["gardan ka dard", "gardan mein akran"],
  },
  jointPain: {
    en: ["joint pain", "arthritis", "joint ache", "swollen joints"],
    ur: ["جوڑوں کا درد", "گٹھیا"],
    roman: ["jorhon ka dard", "gathiya"],
  },
  swelling: {
    en: ["swelling", "inflamed", "swollen", "edema"],
    ur: ["سوجن", "ورم"],
    roman: ["soojan", "waram"],
  },
  constipation: {
    en: ["constipation", "difficulty passing stool", "hard stool"],
    ur: ["قبض", "پاخانہ نہ آنا"],
    roman: ["qabz", "pakhana na ana"],
  },
  diarrhea: {
    en: ["diarrhea", "loose motions", "diarrhoea", "watery stool"],
    ur: ["اسہال", "پتلی پاخانہ"],
    roman: ["isahal", "patali pakhana"],
  },
  weight: {
    en: ["weight gain", "weight loss", "overweight", "obesity"],
    ur: ["وزن", "موٹاپا"],
    roman: ["weight", "motapa"],
  },
  appetite: {
    en: ["loss of appetite", "no appetite", "not eating", "anorexia"],
    ur: ["بھوک نہ لگنا", "بھوک کم"],
    roman: ["bhook na lagna", "bhook kam"],
  },
  thirst: {
    en: ["excessive thirst", "thirsty", "dry mouth", "polydipsia"],
    ur: ["پیاس لگنا", "منہ خشک"],
    roman: ["piyas lagna", "muh khushk"],
  },
  urination: {
    en: ["frequent urination", "urination", "burning urine", "UTI"],
    ur: ["بار بار پیشاب", "پیشاب میں جلن"],
    roman: ["bar bar peshab", "peshab mein jalan"],
  },
  memory: {
    en: ["memory loss", "forgetful", "confusion", "dementia"],
    ur: ["یادداشت کم", "بھولنا", "الجھن"],
    roman: ["yaadash kam", "bhoolna", "uljhan"],
  },
  mood: {
    en: ["mood swings", "irritable", "anger", "emotional"],
    ur: ["موڈ بدلنا", "چڑچڑا پن", "غصہ"],
    roman: ["mood badalna", "chirchira pan", "ghussa"],
  },
  feverish: {
    en: ["feverish", "chills", "shivering", "cold sweat"],
    ur: ["کپکپی", "تھرتھراہٹ", "سردی لگنا"],
    roman: ["kapkapi", "thartharahat", "sardi lagna"],
  },
  infection: {
    en: ["infection", "infectious", "bacterial", "viral"],
    ur: ["انفیکشن", "بیماری"],
    roman: ["infection", "bimari"],
  },
  wound: {
    en: ["wound", "cut", "injury", "bruise", "burn"],
    ur: ["زخم", "چوٹ", "جلن"],
    roman: ["zakhm", "chot", "jalan"],
  },
};

// ── INTENTS ──
const intents = {
  Cardiologist: {
    primary: ["chestPain", "heartPain", "breathShort"],
    secondary: ["heartRace", "dizziness"],
    keywords: [
      "heart",
      "dil",
      "cardiac",
      "angina",
      "artery",
      "bp",
      "blood pressure",
      "hypertension",
      "palpitations",
    ],
    severity: "high",
    weight: [4, 2],
  },
  Neurologist: {
    primary: ["headache", "dizziness", "memory"],
    secondary: ["nausea", "mood"],
    keywords: [
      "brain",
      "nerve",
      "seizure",
      "stroke",
      "paralysis",
      "head injury",
      "migraine",
    ],
    severity: "medium",
    weight: [4, 2],
  },
  Dermatologist: {
    primary: ["skinRash", "allergy", "acne"],
    secondary: ["skinSpots", "skinDry", "hairFall"],
    keywords: ["skin", "face", "chamri", "khujli", "jild", "eczema"],
    severity: "low",
    weight: [4, 2],
  },
  Pediatrician: {
    primary: ["baby", "child"],
    secondary: ["fever", "cough", "cold", "vomiting"],
    keywords: ["growth", "vaccination", "development", "infant", "toddler"],
    severity: "medium",
    weight: [4, 2],
  },
  "General Physician": {
    primary: ["fever", "cough", "cold", "bodyPain", "pain"],
    secondary: ["headache", "weakness", "nausea", "stomach", "diarrhea"],
    keywords: [
      "flu",
      "sick",
      "ill",
      "tabiyat",
      "bimar",
      "bemari",
      "general",
      "checkup",
    ],
    severity: "low",
    weight: [3, 1],
  },
  Dentist: {
    primary: ["toothPain", "gumPain"],
    secondary: ["cavity", "jawPain", "bleeding"],
    keywords: ["tooth", "teeth", "dental", "dant", "daant", "masora", "gum"],
    severity: "medium",
    weight: [4, 2],
  },
  "Eye Specialist": {
    primary: ["eyePain", "blurVision"],
    secondary: ["redEye", "wateringEye", "dizziness"],
    keywords: ["eye", "eyes", "aankh", "ankh", "vision", "nazar", "dekhna"],
    severity: "medium",
    weight: [4, 2],
  },
  Psychologist: {
    primary: ["stress", "anxiety", "depression"],
    secondary: ["sleep", "mental", "mood"],
    keywords: [
      "mental",
      "psychology",
      "psychiatry",
      "emotion",
      "feel",
      "therapy",
    ],
    severity: "medium",
    weight: [4, 2],
  },
  Gynecologist: {
    primary: ["period", "pregnancy", "pelvicPain"],
    secondary: ["bleeding", "nausea"],
    keywords: [
      "gynecology",
      "gynae",
      "female",
      "uterus",
      "ovary",
      "cervix",
      "menopause",
    ],
    severity: "medium",
    weight: [4, 2],
  },
};

// ── EMERGENCY TERMS ──
const emergencyTerms = [
  "emergency",
  "urgent",
  "immediate",
  "critical",
  "heart attack",
  "chest pain",
  "cannot breathe",
  "cant breathe",
  "shortness of breath",
  "saans nahi",
  "dam ghutna",
  "unconscious",
  "behoshi",
  "severe bleeding",
  "heart failure",
  "stroke",
  "paralysis",
  "seizure",
  "convulsion",
  "collapse",
  "faint",
  "behosh",
  "severe chest",
  "crushing chest",
  "accident",
];

// ── GREETINGS ──
const greetings = [
  "hi",
  "hello",
  "hey",
  "salam",
  "assalam",
  "salamualikum",
  "walaikum",
  "greetings",
  "howdy",
  "ok",
  "okay",
  "fine",
  "alright",
  "sure",
  "yes",
  "no",
  "thanks",
  "thank",
  "thankyou",
  "bye",
  "goodbye",
  "good",
  "morning",
  "evening",
  "afternoon",
  "night",
  "how",
  "are",
  "you",
  "what",
  "who",
  "when",
  "where",
  "khairiat",
  "shukriya",
  "shukria",
  "accha",
  "theek",
  "thek",
];

// ── GENERAL HEALTH TERMS ──
const generalHealthTerms = [
  "bimar",
  "bemari",
  "mariz",
  "sick",
  "illness",
  "health",
  "symptom",
  "symptoms",
  "problem",
  "issue",
  "tabiyat",
  "dard",
  "pain",
  "ache",
  "doctor",
  "checkup",
  "dawai",
  "dawa",
  "ilaj",
  "treatment",
  "hospital",
  "clinic",
  "consult",
  "disease",
  "condition",
  "complaint",
  "suffering",
  "hurting",
  "ailing",
];

// ── ROMAN URDU TOKENS ──
const romanUrduTokens = [
  "hai",
  "hoon",
  "hain",
  "tha",
  "thi",
  "the",
  "raha",
  "rahi",
  "rahe",
  "main",
  "mein",
  "ap",
  "aap",
  "tum",
  "hum",
  "woh",
  "ye",
  "ya",
  "nahi",
  "nhi",
  "nehi",
  "kya",
  "kay",
  "ka",
  "ki",
  "ke",
  "ko",
  "se",
  "par",
  "pe",
  "per",
  "aur",
  "or",
  "lekin",
  "magar",
  "kyun",
  "kab",
  "kahan",
  "kaise",
  "kitna",
  "kitni",
  "bahut",
  "bohat",
  "thora",
  "zyada",
  "ziyada",
  "kam",
  "aaj",
  "kal",
  "ajj",
  "aaaj",
  "ma",
  "mai",
  "mera",
  "meri",
  "mere",
  "tera",
  "teri",
  "tere",
  "apna",
  "apni",
  "hamara",
  "hamari",
  "sab",
  "saab",
  "koi",
  "kuch",
  "kisi",
  "jab",
  "tab",
  "phir",
  "then",
  "wahan",
  "yahan",
  "idhar",
  "udhar",
  "andar",
  "bahar",
  "neechay",
  "ooper",
  "upper",
  "upar",
  "ge",
  "gi",
  "ga",
  "ho",
  "hoon",
  "hon",
  "hun",
  "raha",
  "rahi",
  "rahe",
];

const romanUrduPhrases = [
  "dam ghutna",
  "saans phoolna",
  "sar dard",
  "sir dard",
  "pait dard",
  "dant dard",
  "daant dard",
  "ankh dard",
  "aankh dard",
  "bukhar hai",
  "khansi hai",
  "tabiyat kharab",
  "mujhe dard",
  "mujha dard",
  "doctor chahiye",
  "neend nahi",
  "nind nhi",
  "pet mein dard",
  "seene mein dard",
  "dil mein dard",
  "aankh mein dard",
];

const englishTokens = [
  "the",
  "is",
  "are",
  "am",
  "i",
  "you",
  "my",
  "me",
  "have",
  "has",
  "feel",
  "feeling",
  "pain",
  "fever",
  "cough",
  "cold",
  "flu",
  "headache",
  "vomiting",
  "weakness",
  "doctor",
  "help",
  "symptoms",
  "problem",
  "issue",
  "chest",
  "heart",
  "breathing",
  "skin",
  "eye",
  "vision",
  "tooth",
  "gum",
  "stress",
  "anxiety",
  "depression",
  "tired",
  "itching",
  "rash",
  "acne",
  "period",
  "pregnancy",
  "sleep",
  "blurry",
];

// ── LANGUAGE DETECTOR ──
const detectLanguage = (text) => {
  if (!text || typeof text !== "string") return "en";
  const clean = text.trim();
  if (!clean) return "en";

  const urduChars = clean.match(/[\u0600-\u06FF\u0750-\u077F]/g)?.length || 0;
  if (urduChars >= 2 || urduChars / clean.length > 0.18) return "ur";

  const lower = clean.toLowerCase();
  const tokens = lower.match(/[a-z]+/g) || [];

  const phraseScore = romanUrduPhrases.reduce(
    (s, p) => s + (lower.includes(p) ? 3 : 0),
    0,
  );
  const romanScore =
    tokens.reduce((s, t) => s + (romanUrduTokens.includes(t) ? 1 : 0), 0) +
    phraseScore;

  const englishScore = tokens.reduce(
    (s, t) => s + (englishTokens.includes(t) ? 1 : 0),
    0,
  );

  if (romanScore >= 2 && romanScore >= englishScore) return "roman";
  if (romanScore >= 1 && tokens.length <= 3 && englishScore === 0)
    return "roman";
  return "en";
};

const getRecognitionLang = (lang) => {
  const map = { en: "en-US", ur: "ur-PK", roman: "ur-PK" };
  return map[lang] || "en-US";
};

// ── TEXT NORMALIZER ──
const normalizeElongated = (text) => {
  return text.replace(/(.)\1{2,}/g, "$1$1");
};

const normalizeWhitespace = (text) => {
  return text.trim().replace(/\s+/g, " ");
};

const fixCommonTypos = (text) => {
  const typoMap = {
    fver: "fever",
    feever: "fever",
    cof: "cough",
    cofing: "coughing",
    headche: "headache",
    hartache: "heartache",
    maigrain: "migraine",
    migrane: "migraine",
    blury: "blurry",
    breathng: "breathing",
    stres: "stress",
    strss: "stress",
    anksiety: "anxiety",
    depresion: "depression",
    hert: "heart",
    hart: "heart",
    toot: "tooth",
    dat: "dant",
    nind: "neend",
    nhi: "nahi",
    bimaar: "bimar",
    bukhaar: "bukhar",
    zukaam: "zukam",
    khaansi: "khansi",
    ultee: "ulti",
    takleef: "taklif",
    tenshun: "tension",
    preshan: "pareshan",
    gya: "gaya",
    gyi: "gayi",
    btao: "batao",
    liyeh: "liye",
    pher: "phir",
    huwi: "hui",
    huwa: "hua",
    mujha: "mujhe",
    mari: "meri",
    umer: "umar",
    umr: "umar",
    thek: "theek",
    thoda: "thora",
    bohot: "bahut",
    ziyada: "zyada",
  };

  let result = text.toLowerCase();
  Object.entries(typoMap).forEach(([typo, correct]) => {
    const regex = new RegExp(`\\b${typo}\\b`, "gi");
    result = result.replace(regex, correct);
  });
  return result;
};

const normalizeText = (text) => {
  if (!text || typeof text !== "string") return "";
  let normalized = text;
  normalized = normalizeElongated(normalized);
  normalized = fixCommonTypos(normalized);
  normalized = normalizeWhitespace(normalized);
  return normalized;
};

// ── TOKENIZER ──
const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
};

// ── MATCHER ──
const levenshtein = (a, b) => {
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const fuzzyMatch = (token, keyword) => {
  if (!token || !keyword) return false;
  const t = token.toLowerCase();
  const k = keyword.toLowerCase();

  if (t === k) return true;
  if (k.length <= 3) return t === k;

  const threshold = k.length <= 5 ? 1 : k.length <= 8 ? 2 : 3;
  return levenshtein(t, k) <= threshold;
};

const fuzzyIncludes = (tokens, keywords) => {
  if (!Array.isArray(keywords)) keywords = [keywords];
  return keywords.some((kw) => {
    const kwParts = kw.toLowerCase().split(/\s+/);
    if (kwParts.length === 1) {
      return tokens.some((t) => fuzzyMatch(t, kwParts[0]));
    }
    for (let i = 0; i <= tokens.length - kwParts.length; i++) {
      if (kwParts.every((part, j) => fuzzyMatch(tokens[i + j], part))) {
        return true;
      }
    }
    return false;
  });
};

const calculateMatchScore = (
  tokens,
  primaryKeywords,
  secondaryKeywords = [],
  weights = [3, 1],
) => {
  let score = 0;
  for (const family of primaryKeywords) {
    if (fuzzyIncludes(tokens, family)) score += weights[0];
  }
  for (const family of secondaryKeywords) {
    if (fuzzyIncludes(tokens, family)) score += weights[1];
  }
  return score;
};

// ── GET SYMPTOMS FOR LANGUAGE ──
const getSymptomsForLang = (lang) => {
  const result = {};
  Object.entries(symptomsMapping).forEach(([key, langs]) => {
    result[key] = langs[lang] || langs.en || [];
  });
  return result;
};

// ── BUILD KEYWORD FAMILIES ──
const buildKeywordFamilies = (intentKey, lang) => {
  const intent = intents[intentKey];
  const symptoms = getSymptomsForLang(lang);

  const primary = intent.primary.map((key) => symptoms[key] || [key]).flat();
  const secondary = intent.secondary
    .map((key) => symptoms[key] || [key])
    .concat(intent.keywords || [])
    .flat();

  return { primary, secondary, weight: intent.weight };
};

// ── SCORE INTENT ──
const scoreIntent = (text, lang = "en") => {
  const normalized = normalizeText(text);
  const tokens = tokenize(normalized);

  const results = [];

  for (const [dept, intent] of Object.entries(intents)) {
    const { primary, secondary, weight } = buildKeywordFamilies(dept, lang);
    const score = calculateMatchScore(tokens, primary, secondary, weight);

    if (score > 0) {
      results.push({
        dept,
        score,
        severity: intent.severity,
        confidence: Math.min(score / (weight[0] * primary.length + 1), 1),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return {
      dept: "General Physician",
      score: 0,
      severity: "low",
      confidence: 0,
      alternatives: [],
    };
  }

  return {
    dept: results[0].dept,
    score: results[0].score,
    severity: results[0].severity,
    confidence: results[0].confidence,
    alternatives: results.slice(1, 4),
  };
};

// ── DETECT DEPARTMENT ──
const detectDepartment = (text, lang = "en") => {
  const result = scoreIntent(text, lang);
  if (result.score === 0 || !result.dept) {
    return {
      dept: "General Physician",
      sev: "low",
      confidence: 0,
      alternatives: [],
    };
  }
  return {
    dept: result.dept,
    sev: result.severity,
    confidence: result.confidence,
    alternatives: result.alternatives || [],
  };
};

// ── HAS SYMPTOMS ──
const hasSymptoms = (text, lang = "en") => {
  const normalized = normalizeText(text);
  const tokens = tokenize(normalized);
  const symptoms = getSymptomsForLang(lang);
  const allSymptoms = Object.values(symptoms).flat();

  return fuzzyIncludes(tokens, [...allSymptoms, ...generalHealthTerms]);
};

// ── IS EMERGENCY ──
const isEmergency = (text) => {
  const normalized = normalizeText(text);
  const tokens = tokenize(normalized);
  return fuzzyIncludes(tokens, emergencyTerms);
};

// ── IS GREETING ONLY ──
const isGreetingOnly = (text, lang = "en") => {
  const lower = text.toLowerCase().trim();
  if (lower.length < 3) return true;
  if (hasSymptoms(text, lang)) return false;

  const tokens = tokenize(lower);
  const greetingCount = tokens.filter((t) =>
    greetings.some((g) => g === t),
  ).length;

  return greetingCount / tokens.length >= 0.7;
};

// ── ENTITY EXTRACTOR ──
const extractAge = (text) => {
  const patterns = [
    /(\d+)\s*(?:saal|sal|year|years|yr|yrs)\b/i,
    /(?:umar|age|umr|umer|ummar)\s*(?:hai\s*|he\s*|hy\s*)?(\d+)/i,
    /(\d+)\s*(?:saal|sal|year|years|yr)\s*(?:ka|ki|old|ka hon|ki hon|ka hoon)\b/i,
    /(?:main|meri|mera|ap ki|apki)\s+(\d+)\s*(?:saal|sal|year)/i,
    /(?:i am|i'm|im)\s*(\d+)\s*(?:years?|yrs?)?\s*(?:old)?/i,
    /(?:age\s*[:=]\s*)(\d+)/i,
    /(\d+)\s*(?:baras|bers)\b/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1], 10);
  }

  const standalone = text.match(/\b(\d{1,3})\b/);
  if (standalone) {
    const val = parseInt(standalone[1], 10);
    if (val >= 1 && val <= 120) return val;
  }
  return null;
};

const extractDuration = (text) => {
  const patterns = [
    /(\d+)\s*(?:day|days|din|dino|dina)\b/i,
    /(\d+)\s*(?:week|weeks|hafta|hafte|haftay)\b/i,
    /(\d+)\s*(?:month|months|mahina|mahine|maheene)\b/i,
    /(?:since|for|se)\s*(\d+)\s*(?:day|days|din)/i,
    /(\d+)\s*(?:din|dino)\s*(?:se|ho gaye|ho gaya|hua hai|se hai)\b/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { value: parseInt(m[1], 10), unit: "days" };
  }

  if (/kal se|since yesterday/i.test(text)) return { value: 1, unit: "days" };
  if (/parson se|since the day before/i.test(text))
    return { value: 2, unit: "days" };
  return null;
};

// ============================================================
// MAIN OPD COMPONENT
// ============================================================

const OPD = () => {
  const { darkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  /* ── UI State ── */
  const [messages, setMessages] = useState([
    { role: "bot", content: "welcome" },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [showAllDoctorsMode, setShowAllDoctorsMode] = useState(false);

  /* ── Login Warning Popup ── */
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [warningHiding, setWarningHiding] = useState(false);
  const warningTimeoutRef = useRef(null);

  /* ── Specialists Data (fetched from API) ── */
  const [specialties, setSpecialties] = useState([]);
  const specialtiesRef = useRef(specialties);
  useEffect(() => {
    specialtiesRef.current = specialties;
  }, [specialties]);

  useEffect(() => {
    fetchSpecialties().then((list) => {
      if (list.length) setSpecialties(list);
    });
  }, []);

  /* ── Chatbot Flow State ── */
  const [flowState, setFlowState] = useState("idle");
  const flowStateRef = useRef(flowState);
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  const [userProfile, setUserProfile] = useState({
    symptoms: "",
    duration: "",
    age: null,
    department: "General Physician",
    severity: "low",
    lang: "en",
  });
  const userProfileRef = useRef(userProfile);
  const updateProfile = (updates) => {
    const next = { ...userProfileRef.current, ...updates };
    userProfileRef.current = next;
    setUserProfile(next);
  };

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastRedirectMessageRef = useRef(null);

  // Track voice state
  const voiceDraftRef = useRef("");
  const voiceLiveRef = useRef("");
  const voiceSentRef = useRef(false);
  const handleSendRef = useRef(null);

  /* ── TTS Engine ── */
  const useTTS = () => {
    const isSpeakingRef = useRef(false);
    const queueRef = useRef([]);

    const findVoice = useCallback((langCode) => {
      if (!window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices();
      const exactMatch = voices.find((v) => v.lang === langCode);
      if (exactMatch) return exactMatch;
      const langPrefix = langCode.split("-")[0];
      return voices.find((v) => v.lang.startsWith(langPrefix)) || null;
    }, []);

    const speak = useCallback(
      (text, lang, onStart, onEnd) => {
        if (!window.speechSynthesis) {
          onEnd?.();
          return;
        }

        const doSpeak = () => {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          const langCode = getVoiceLang(lang);
          u.lang = langCode;
          u.voice = findVoice(langCode);
          u.rate = lang === "ur" || lang === "roman" ? 0.88 : 0.95;
          u.pitch = 1.05;
          u.volume = 1;
          u.onstart = () => {
            isSpeakingRef.current = true;
            onStart?.();
          };
          u.onend = () => {
            isSpeakingRef.current = false;
            onEnd?.();
            const next = queueRef.current.shift();
            if (next) doSpeak.call(null, next);
          };
          u.onerror = () => {
            isSpeakingRef.current = false;
            onEnd?.();
          };
          window.speechSynthesis.speak(u);
        };

        if (isSpeakingRef.current) {
          queueRef.current.push({ text, lang, onStart, onEnd });
        } else {
          doSpeak();
        }
      },
      [findVoice],
    );

    const stopSpeaking = useCallback(() => {
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
      queueRef.current = [];
    }, []);

    return { speak, stopSpeaking, isSpeakingRef };
  };

  const getVoiceLang = (lang) => {
    const map = { en: "en-US", ur: "ur-PK", roman: "ur-PK" };
    return map[lang] || "en-US";
  };

  const { speak } = useTTS();

  /* ── Helpers ── */
  const addMessage = useCallback((
    role,
    text,
    clickable = false,
    actionType = null,
    actionData = null,
  ) =>
    setMessages((prev) => [
      ...prev,
      { role, content: text, clickable, actionType, actionData },
    ]), []);

  const addBotReply = useCallback((
    text,
    shouldSpeak = false,
    langCode = "en",
    delay = 0,
    clickable = false,
    actionType = null,
    actionData = null,
  ) => {
    setTimeout(() => {
      addMessage("bot", text, clickable, actionType, actionData);
      if (shouldSpeak && typeof text === "string") {
        speak(text, langCode);
      }
    }, delay);
  }, [addMessage, speak]);

  const addDoctorListMessage = useCallback((doctorList, grouped = false) =>
    setMessages((prev) => [
      ...prev,
      { role: "bot", content: "doctor_list", doctors: doctorList, grouped },
    ]), []);

  const addBotMessages = useCallback((
    texts,
    shouldSpeak = false,
    langCode = "en",
    delayStep = 500,
  ) => {
    texts.forEach((txt, i) => {
      setTimeout(
        () => {
          setMessages((prev) => [...prev, { role: "bot", content: txt }]);
          if (shouldSpeak && typeof txt === "string") {
            speak(txt, langCode);
          }
        },
        delayStep * (i + 1),
      );
    });
  }, [speak]);

  /* ── Voice Recognition ── */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = getRecognitionLang(userProfileRef.current.lang);

    rec.onstart = () => {
      voiceDraftRef.current = "";
      voiceLiveRef.current = "";
      voiceSentRef.current = false;
      setInput("");
      setListening(true);
    };

    rec.onresult = (e) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i]?.[0]?.transcript || "";
        if (e.results[i].isFinal) {
          finalTranscript += `${t} `;
        } else {
          interimTranscript += `${t} `;
        }
      }

      // Accumulate final transcripts
      if (finalTranscript.trim()) {
        voiceDraftRef.current =
          `${voiceDraftRef.current} ${finalTranscript}`.trim();
        // Update input with combined text
        const combined = `${voiceDraftRef.current} ${interimTranscript}`.trim();
        if (combined) {
          setInput(combined);
          const detectedLang = detectLanguage(combined);
          updateProfile({ lang: detectedLang });
        }
      } else if (interimTranscript.trim()) {
        const combined = `${voiceDraftRef.current} ${interimTranscript}`.trim();
        if (combined) {
          setInput(combined);
          const detectedLang = detectLanguage(combined);
          updateProfile({ lang: detectedLang });
        }
      }
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        alert("Please allow microphone access to use voice input.");
      }
      setListening(false);
      // Don't auto-send on error
    };

    rec.onend = () => {
      const finalText = voiceDraftRef.current.trim() || voiceLiveRef.current.trim();
      setListening(false);
      
      // Only send if we have text and haven't sent it yet
      if (finalText && !voiceSentRef.current) {
        voiceSentRef.current = true;
        setIsVoiceInput(true);
        // Small delay to ensure state updates
        setTimeout(() => {
          handleSendRef.current?.(finalText, true);
        }, 100);
      }
    };

    recognitionRef.current = rec;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  useEffect(() => {
    const msg = location.state?.userMessage;
    if (!msg) return;

    const intent = location.state?.intent || "custom";
    const isFromDashboard = location.state?.source === "dashboard";

    // Prevent duplicate handling when React re-runs this effect or navigation
    // state is still present. This applies to every page that redirects here.
    if (lastRedirectMessageRef.current === msg) {
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch (e) {}
      return;
    }
    lastRedirectMessageRef.current = msg;

    handleSend(msg, false, intent, isFromDashboard);

    // Clear the location state so re-mounts don't re-trigger the same message
    setTimeout(() => {
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch (e) {}
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (!location.state?.showAllDoctors) return;

    setShowWelcome(false);
    setHasUserMessage(true);
    setShowAllDoctorsMode(true);
    setFlowState("showing_all_doctors");

    (async () => {
      const allDocs = await getCachedDoctors("all", fetchAvailableDoctors);
      setDoctors(allDocs);
      addDoctorListMessage(allDocs, true);
    })();

    setTimeout(() => {
      try {
        navigate(location.pathname, { replace: true, state: {} });
      } catch (e) {}
    }, 50);
  }, [location.key, location.pathname, location.state, navigate, addDoctorListMessage]);

  /* ── Doctor Ranking (async API) ── */
  const rankDoctors = useCallback(async (department, limit = null) => {
    const cacheKey = `specialty_${department}`;
    let list = await getCachedDoctors(cacheKey, () => fetchDoctorsBySpecialty(department));
    if (!list.length) {
      list = await getCachedDoctors("specialty_General Physician", () => fetchDoctorsBySpecialty("General Physician"));
    }

    list.sort((a, b) => {
      if (a.status === "online" && b.status !== "online") return -1;
      if (a.status !== "online" && b.status === "online") return 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.experience - a.experience;
    });

    return limit ? list.slice(0, limit) : list;
  }, []);

  const getAllDoctors = useCallback(async (department) => {
    return rankDoctors(department);
  }, [rankDoctors]);

  const getTop1Available = useCallback(async (department) => {
    const list = await getAllDoctors(department);
    const online = list.filter((d) => d.status === "online");
    return online.length > 0 ? online[0] : list[0];
  }, [getAllDoctors]);

  /* ── Core Symptom Flow ── */
  const showDoctorRecommendations = useCallback(async (
    fromVoice,
    lang,
    confidence,
    alternatives,
  ) => {
    setShowAllDoctorsMode(false);
    const t = CONTENT[lang] || CONTENT.en;
    const dept = userProfileRef.current.department;
    const allDocs = await rankDoctors(dept);
    const topDocs = allDocs.slice(0, 5);

    let confirmMsg = t.confirmCondition(dept, confidence || 0.8);

    if (alternatives && alternatives.length > 1 && alternatives[0].score > 0) {
      const altNames = alternatives
        .slice(0, 2)
        .map((a) => a.dept)
        .join(", ");
      confirmMsg += ` ${t.multipleSpecialists || "I also see potential matches with " + altNames + "."}`;
    }

    addBotMessages(
      [t.empathy[0], confirmMsg, t.doctorFound],
      fromVoice,
      lang,
      400,
    );

    setTimeout(() => {
      setDoctors(topDocs);
      setFlowState("showing_doctors");
      addDoctorListMessage(topDocs);
    }, 900);

    setTimeout(() => {
      addBotReply(
        t.top1Prompt,
        fromVoice,
        lang,
        0,
        true,
        "top1_available",
        dept,
      );
    }, 1200);
  }, [rankDoctors, addBotMessages, addDoctorListMessage, addBotReply]);

  const startSymptomFlow = useCallback(async (text, lang, fromVoice) => {
    const t = CONTENT[lang] || CONTENT.en;

    if (isEmergency(text)) {
      setFlowState("emergency");
      const docs = await rankDoctors("Cardiologist");
      setDoctors(docs);
      addBotMessages(
        [t.empathy[0], t.emergency, t.doctorFound],
        fromVoice,
        lang,
        500,
      );
      setTimeout(() => addDoctorListMessage(docs), 1700);
      return;
    }

    const { dept, sev, confidence, alternatives } = detectDepartment(
      text,
      lang,
    );
    const age = extractAge(text);
    const duration = extractDuration(text);

    const hasAge = age !== null || userProfileRef.current.age !== null;
    const hasDuration =
      duration !== null || userProfileRef.current.duration !== "";
    const hasSymptomsText = text.length > 5;

    updateProfile({
      symptoms: text,
      department: dept,
      severity: sev,
      age: age !== null ? age : userProfileRef.current.age,
      duration:
        duration !== null
          ? `${duration.value} days`
          : userProfileRef.current.duration,
    });

    const empathy = t.empathy[Math.floor(Math.random() * t.empathy.length)];

    if (hasAge && hasDuration && hasSymptomsText) {
      showDoctorRecommendations(fromVoice, lang, confidence, alternatives);
      return;
    }

    if (!hasAge) {
      setFlowState("asking_age");
      addBotMessages([empathy, t.askAge], fromVoice, lang, 400);
      return;
    }

    if (!hasDuration) {
      setFlowState("asking_duration");
      addBotMessages([empathy, t.askDuration], fromVoice, lang, 400);
      return;
    }

    if (!hasSymptomsText) {
      setFlowState("asking_symptoms");
      addBotMessages([empathy, t.askSymptoms], fromVoice, lang, 400);
      return;
    }

    showDoctorRecommendations(fromVoice, lang, confidence, alternatives);
  }, [rankDoctors, addBotMessages, addDoctorListMessage, showDoctorRecommendations]);

  const handleSpecializationClick = useCallback(async (specialization) => {
    if (showWelcome) setShowWelcome(false);
    setHasUserMessage(true);
    setShowAllDoctorsMode(false);

    const lang = userProfileRef.current.lang || "en";
    const t = CONTENT[lang] || CONTENT.en;

    const allDocs = await getAllDoctors(specialization);

    addMessage("bot", `Here are all ${specialization}s for you:`);

    setTimeout(() => {
      setDoctors(allDocs);
      setFlowState("showing_all_doctors");
      addDoctorListMessage(allDocs);
    }, 250);

    setTimeout(() => {
      addMessage(
        "bot",
        t.allDoctorsPrompt,
        true,
        "specialization_top1",
        specialization,
      );
    }, 500);
  }, [showWelcome, getAllDoctors, addMessage, addDoctorListMessage]);

  const handleClickableAction = useCallback(async (type, data) => {
    const lang = userProfileRef.current.lang || "en";
    const t = CONTENT[lang] || CONTENT.en;

    if (type === "top1_available") {
      addMessage("user", "Yes, please recommend the best doctor.");
      const doc = await getTop1Available(data || userProfileRef.current.department);
      setTimeout(() => {
        addMessage("bot", t.top1Response(doc));
        setDoctors([doc]);
        addDoctorListMessage([doc]);
      }, 400);
    } else if (type === "specialization_top1") {
      addMessage("user", "Show me the top doctor.");
      const doc = await getTop1Available(data);
      setTimeout(() => {
        addMessage("bot", t.top1Response(doc));
        setDoctors([doc]);
        addDoctorListMessage([doc]);
        setFlowState("showing_doctors");
      }, 400);
    }
  }, [addMessage, addDoctorListMessage, getTop1Available]);

  const showLoginWarningPopup = useCallback(() => {
    window.clearTimeout(warningTimeoutRef.current);
    setShowLoginWarning(true);
    setWarningHiding(false);
    warningTimeoutRef.current = setTimeout(() => {
      setWarningHiding(true);
      warningTimeoutRef.current = setTimeout(() => {
        setShowLoginWarning(false);
        setWarningHiding(false);
      }, 500);
    }, 10000);
  }, []);

  const closeLoginWarning = useCallback(() => {
    window.clearTimeout(warningTimeoutRef.current);
    setWarningHiding(true);
    warningTimeoutRef.current = setTimeout(() => {
      setShowLoginWarning(false);
      setWarningHiding(false);
    }, 500);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(warningTimeoutRef.current);
  }, []);

  const handleConsult = useCallback((doc) => {
    if (!doc) return;

    if (!user) {
      showLoginWarningPopup();
      return;
    }

    setSelectedDoctor(doc);
    setFlowState("consulting");

    const t = CONTENT[userProfileRef.current.lang] || CONTENT.en;
    addBotMessages(
      [
        `You are now connected with ${doc.name} (${doc.specialization}). ${t.consultStart}`,
      ],
      false,
      userProfileRef.current.lang,
      500,
    );

    navigate("/clinic", {
      state: {
        fromOPD: true,
        doctor: doc,
        patientProfile: userProfileRef.current,
      },
      replace: false,
    });
  }, [navigate, addBotMessages, user, showLoginWarningPopup]);

  const handleCall = useCallback((doc) => {
    if (!doc) return;

    setSelectedDoctor(doc);
    setFlowState("consulting");

    const t = CONTENT[userProfileRef.current.lang] || CONTENT.en;
    addMessage("bot", t.calling(doc));

    navigate("/clinic", {
      state: {
        fromOPD: true,
        doctor: doc,
        patientProfile: userProfileRef.current,
      },
      replace: false,
    });
  }, [navigate, addMessage]);

  const handleBookAppointment = useCallback((doc) => {
    if (!doc) return;

    if (!user) {
      showLoginWarningPopup();
      return;
    }

    navigate("/appointments", {
      state: {
        bookDoctor: doc,
        patientProfile: userProfileRef.current,
      },
      replace: false,
    });
  }, [navigate, user, showLoginWarningPopup]);

  const handleDashboardIntent = useCallback(
    (text, lang, fromVoice, intent) => {
      const normalized = normalizeText(text || "").toLowerCase();
      const t = CONTENT[lang] || CONTENT.en;

      if (intent === "custom") return false;

      if (
        intent === "symptom" ||
        /(new symptom|symptom|pain|fever|cough|headache|ache|disease|problem|issue|chest|breath|weakness|rash|cold)/.test(
          normalized,
        )
      ) {
        setFlowState("collecting_symptoms");
        addBotReply(
          t.askSymptoms || "Please describe your symptoms in more detail so I can help you.",
          fromVoice,
          lang,
          300,
        );
        return true;
      }

      if (
        intent === "specialist" ||
        /(specialist|doctor|consult|find a doctor|find doctor|find specialist)/.test(
          normalized,
        )
      ) {
        setFlowState("collecting_symptoms");
        addBotReply(
          "I can help you find the right specialist. Please tell me your symptoms or what you are feeling.",
          fromVoice,
          lang,
          300,
        );
        return true;
      }

      if (
        intent === "advice" ||
        /(health advice|advice|guide|help me|help)/.test(normalized)
      ) {
        setFlowState("collecting_symptoms");
        addBotReply(
          "I can guide you with general health advice. Please share your concern and I will help you.",
          fromVoice,
          lang,
          300,
        );
        return true;
      }

      if (
        intent === "tips" ||
        /(health tips|tips|tip|wellness|healthy)/.test(normalized)
      ) {
        addBotReply(
          "Here are a few general health tips: drink enough water, sleep well, stay active, and seek medical advice if symptoms persist.",
          fromVoice,
          lang,
          300,
        );
        return true;
      }

      return false;
    },
    [addBotReply],
  );

  /* ── Main Send Handler ── */
  const handleSend = useCallback(
    (
      text = input,
      fromVoice = isVoiceInput,
      intent = "custom",
      isDashboardRedirect = false,
    ) => {
      if (!text || !text.trim()) return;

      const cleanText = text.trim();
      if (showWelcome) setShowWelcome(false);
      setHasUserMessage(true);

      const lang = detectLanguage(cleanText);
      updateProfile({ lang });
      const t = CONTENT[lang] || CONTENT.en;

      // Add user message
      addMessage("user", cleanText);
      setInput("");
      setIsVoiceInput(false);

      const currentFlow = flowStateRef.current;

      if (
        isDashboardRedirect &&
        handleDashboardIntent(cleanText, lang, fromVoice, intent)
      ) {
        return;
      }

    if (currentFlow === "idle" || currentFlow === "collecting_symptoms") {
      if (!hasSymptoms(cleanText, lang)) {
        if (isGreetingOnly(cleanText, lang)) {
          addBotReply(t.greetingFallback, fromVoice, lang);
        } else {
          addBotReply(t.vagueFallback, fromVoice, lang);
        }
        return;
      }
    }

    switch (currentFlow) {
      case "idle":
      case "collecting_symptoms":
        startSymptomFlow(cleanText, lang, fromVoice);
        break;

      case "asking_age": {
        const age = extractAge(cleanText);
        const duration = extractDuration(cleanText);

        if (age !== null) updateProfile({ age });
        if (duration !== null)
          updateProfile({ duration: `${duration.value} days` });

        const hasAge = age !== null || userProfileRef.current.age !== null;
        const hasDuration =
          duration !== null || userProfileRef.current.duration !== "";

        if (hasAge && hasDuration) {
          const { confidence, alternatives } = detectDepartment(
            userProfileRef.current.symptoms || cleanText,
            lang,
          );
          showDoctorRecommendations(fromVoice, lang, confidence, alternatives);
        } else if (hasAge && !hasDuration) {
          setFlowState("asking_duration");
          addBotReply(t.askDuration, fromVoice, lang, 400);
        } else {
          addBotReply(t.askAge, fromVoice, lang, 400);
        }
        break;
      }

      case "asking_duration": {
        const duration = extractDuration(cleanText);
        const age = extractAge(cleanText);

        if (duration !== null)
          updateProfile({ duration: `${duration.value} days` });
        if (age !== null) updateProfile({ age });

        const hasAge = age !== null || userProfileRef.current.age !== null;
        const hasDuration =
          duration !== null || userProfileRef.current.duration !== "";

        if (hasAge && hasDuration) {
          const { confidence, alternatives } = detectDepartment(
            userProfileRef.current.symptoms || cleanText,
            lang,
          );
          showDoctorRecommendations(fromVoice, lang, confidence, alternatives);
        } else if (hasDuration && !hasAge) {
          setFlowState("asking_age");
          addBotReply(t.askAge, fromVoice, lang, 400);
        } else {
          addBotReply(t.askDuration, fromVoice, lang, 400);
        }
        break;
      }

      case "asking_symptoms": {
        if (hasSymptoms(cleanText, lang)) {
          const { dept, confidence, alternatives } = detectDepartment(
            cleanText,
            lang,
          );
          const age = extractAge(cleanText);
          const duration = extractDuration(cleanText);
          if (age !== null) updateProfile({ age });
          if (duration !== null)
            updateProfile({ duration: `${duration.value} days` });
          updateProfile({ symptoms: cleanText, department: dept, severity: "low" });
          showDoctorRecommendations(fromVoice, lang, confidence, alternatives);
        } else {
          addBotReply(t.askSymptoms, fromVoice, lang, 400);
        }
        break;
      }

      case "showing_doctors":
      case "showing_all_doctors":
      case "emergency":
        if (hasSymptoms(cleanText, lang)) {
          startSymptomFlow(cleanText, lang, fromVoice);
        } else {
          addBotReply(t.vagueFallback, fromVoice, lang);
        }
        break;

      case "consulting": {
        setTimeout(() => {
          const docName = selectedDoctor?.name || "Doctor";
          const reply = `${docName}: Thank you for sharing that. Is there anything else you'd like to discuss regarding your ${userProfileRef.current.department.toLowerCase()} concern?`;
          addBotReply(reply, fromVoice, lang);
        }, 600);
        break;
      }

      default:
        if (hasSymptoms(cleanText, lang)) {
          startSymptomFlow(cleanText, lang, fromVoice);
        } else {
          addBotReply(t.vagueFallback, fromVoice, lang);
        }
    }
    },
    [
      input,
      isVoiceInput,
      showWelcome,
      addMessage,
      addBotReply,
      startSymptomFlow,
      showDoctorRecommendations,
      selectedDoctor,
      handleDashboardIntent,
    ],
  );

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const groupDoctorsBySpecialization = useCallback((doctorList = []) => {
    return doctorList.reduce((groups, doctor) => {
      const key = doctor.specialization || "General Physician";
      if (!groups[key]) groups[key] = [];
      groups[key].push(doctor);
      return groups;
    }, {});
  }, []);

  /* ── Render Doctor Cards ── */
  const renderDoctorCards = useCallback(
    (doctorList = doctors, grouped = false) => {
      if (!doctorList || !doctorList.length) return null;

      const shouldGroup = grouped || showAllDoctorsMode;
      if (shouldGroup) {
        const groupedDoctors = groupDoctorsBySpecialization(doctorList);
        return (
          <div className="doctor-grouped-container">
            {Object.entries(groupedDoctors).map(([specialization, docs]) => (
              <section
                key={specialization}
                className="doctor-category-section"
              >
                <h4 className="doctor-category-title">
                  {specialization} ({docs.length})
                </h4>
                <div className="doctor-cards-container">
                  {docs.map((doc, idx) => (
                    <div
                      key={`${doc.id}-${specialization}-${idx}`}
                      className="doctor-card"
                    >
                      <div className="doctor-header">
                        <span className="doctor-name">
                          {idx + 1}. {doc.name}
                        </span>
                        <span className={`status-badge ${doc.status}`}>
                          {doc.status === "online" ? <FaCheckCircle /> : <FaTimes />}
                          {doc.status === "online" ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="doctor-details">
                        <span><FaTrophy /> {doc.specialization}</span>
                        <span><FaStar /> {doc.rating}/5</span>
                        <span><FaCalendarAlt /> {doc.experience} yrs</span>
                        <span><FaMapMarkerAlt /> {doc.location}</span>
                      </div>
                      <div className="doctor-actions">
                        <button
                          className="btn-consult"
                          onClick={() => handleConsult(doc)}
                        >
                          <><FaUserMd /> Consult</>
                        </button>
                        <button className="btn-call" onClick={() => handleCall(doc)}>
                          <><FaPhone /> Call</>
                        </button>
                        <button className="btn-book" onClick={() => handleBookAppointment(doc)}>
                          <><FaCalendarCheck /> Book</>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        );
      }

      return (
        <div className="doctor-cards-container">
          {doctorList.map((doc, idx) => (
            <div key={`${doc.id}-${idx}`} className="doctor-card">
              <div className="doctor-header">
                <span className="doctor-name">
                  {idx + 1}. {doc.name}
                </span>
                <span className={`status-badge ${doc.status}`}>
                  {doc.status === "online" ? <FaCheckCircle /> : <FaTimes />}
                  {doc.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
              <div className="doctor-details">
                <span><FaTrophy /> {doc.specialization}</span>
                <span><FaStar /> {doc.rating}/5</span>
                <span><FaCalendarAlt /> {doc.experience} yrs</span>
                <span><FaMapMarkerAlt /> {doc.location}</span>
              </div>
              <div className="doctor-actions">
                <button
                  className="btn-consult"
                  onClick={() => handleConsult(doc)}
                >
                  <><FaUserMd /> Consult</>
                </button>
                <button className="btn-call" onClick={() => handleCall(doc)}>
                  <><FaPhone /> Call</>
                </button>
                <button className="btn-book" onClick={() => handleBookAppointment(doc)}>
                  <><FaCalendarCheck /> Book</>
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    },
    [doctors, handleConsult, handleCall, handleBookAppointment, groupDoctorsBySpecialization, showAllDoctorsMode],
  );

  const getWelcomeText = useCallback(() => {
    const lang = userProfileRef.current.lang || "en";
    return CONTENT[lang]?.welcome || CONTENT.en.welcome;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      // Reset voice state
      voiceDraftRef.current = "";
      voiceLiveRef.current = "";
      voiceSentRef.current = false;
      
      // Stop any ongoing speech
      window.speechSynthesis?.cancel();
      
      // Set language
      recognitionRef.current.lang = getRecognitionLang(
        userProfileRef.current.lang,
      );
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setListening(false);
        // If already started, stop and restart
        if (error.message && error.message.includes("already started")) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (_) {}
            }, 100);
          } catch (_) {}
        }
      }
    } else {
      addBotReply(
        "Voice input is not supported in this browser. Please try Chrome or Edge.",
        false,
        userProfileRef.current.lang,
      );
    }
  }, [addBotReply]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setListening(false);
    }
  }, []);

  return (
    <div className={`opd-container ${darkMode ? "dark" : "light"}`}>
      <div
        className={
          messages.length === 1 ? "chat-window centered" : "chat-window"
        }
      >
        <div className="messages-scroll">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.content === "welcome" ? (
                showWelcome && (
                  <div className="welcome-wrapper">
                    <div className="welcome-card">{getWelcomeText()}</div>
                  </div>
                )
              ) : msg.content === "doctor_list" ? (
                <div className="chat-message bot interactive-block">
                  {renderDoctorCards(msg.doctors || [], msg.grouped)}
                </div>
              ) : msg.clickable ? (
                <div
                  className="chat-message bot clickable-message"
                  onClick={() =>
                    handleClickableAction(msg.actionType, msg.actionData)
                  }
                >
                  {msg.content}
                </div>
              ) : (
                <div className={`chat-message ${msg.role}`}>{msg.content}</div>
              )}
            </div>
          ))}

          {!hasUserMessage && specialties.length > 0 && (
            <div className="specialized-cards-row">
              {specialties.map((spec) => {
                const Icon = getSpecialistIcon(spec);
                return (
                  <div
                    key={spec}
                    className="specialized-card"
                    onClick={() => handleSpecializationClick(spec)}
                    tabIndex={0}
                  >
                    <Icon /> {spec}
                  </div>
                );
              })}
            </div>
          )}

          <div className="opd-chat">
            {hasUserMessage && (
              <>
                <div
                  className="floating-specialist-trigger"
                  onClick={() => setShowSpecialistModal(true)}
                >
                  <span aria-label="specialists">
                    <FaComments />
                  </span>
                  <small>Specialists</small>
                </div>

                {showSpecialistModal && (
                  <div
                    className="specialist-modal-overlay"
                    onClick={() => setShowSpecialistModal(false)}
                  >
                    <div
                      className="specialist-modal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="modal-header">
                        <h4>Select Specialist</h4>
                        <button
                          className="modal-close"
                          onClick={() => setShowSpecialistModal(false)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <div className="specialized-cards-row modal-row">
                        {specialties.map((spec) => {
                          const Icon = getSpecialistIcon(spec);
                          return (
                            <div
                              key={spec}
                              className="specialized-card modal-card"
                              onClick={() => {
                                handleSpecializationClick(spec);
                                setShowSpecialistModal(false);
                              }}
                              tabIndex={0}
                            >
                              <div className="card-icon">
                                <Icon />
                              </div>
                              <div className="card-text">{spec}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {flowState === "consulting" && selectedDoctor && (
              <div className="consultation-banner">
                <span>
                  <FaUserMd /> Consulting with <strong>{selectedDoctor.name}</strong>
                </span>
                <span className="status-dot online"><FaCheckCircle /> Online</span>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-controls">
          <input
            type="text"
            placeholder={
              flowState === "consulting"
                ? "Type message to doctor..."
                : "Type or speak your symptoms..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="btn-send" onClick={() => handleSend()}>
            Send
          </button>

          {!listening ? (
            <button
              className="btn-voice"
              onClick={startListening}
              title="Click to speak"
            >
              <FaMicrophone />
            </button>
          ) : (
            <button className="btn-voice listening" onClick={stopListening}>
              <FaStop />
            </button>
          )}
        </div>
      </div>

      {showLoginWarning && (
        <div
          className={`login-warning-overlay ${warningHiding ? "hide" : ""}`}
          onClick={closeLoginWarning}
        >
          <div
            className={`login-warning-popup ${warningHiding ? "hide" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="login-warning-close"
              onClick={closeLoginWarning}
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <div className="login-warning-icon"><FaLock /></div>
            <h3 className="login-warning-title">Login Required</h3>
            <p className="login-warning-msg">
              Please sign up or log in first to consult a doctor.
            </p>

            <div className="login-warning-actions">
              <button
                type="button"
                className="login-warning-btn"
                onClick={() =>
                  navigate("/login", { state: { from: location.pathname } })
                }
              >
                Login
              </button>
              <button
                type="button"
                className="login-warning-btn secondary"
                onClick={() =>
                  navigate("/signup", { state: { from: location.pathname } })
                }
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OPD; 
