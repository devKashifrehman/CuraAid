import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { ThemeContext } from "../Theme/ThemeContext";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "./Aboutus.css";
import Intro from "./Intro";

// Images
import img1 from "../images/10.png";
import img2 from "../images/11.png";
import img3 from "../images/12.png";
import img4 from "../images/13.webp";

const slides = [
  {
    title: "Your Virtual Health Companion",
    desc: "Experience a 95% accurate AI-powered medical chatbot...",
    btnText: "Try Now",
    btnClass: "green",
    img: img1,
    action: { path: "/ai-health-guide" },
  },
  {
    title: "Specialized AI for Better Care",
    desc: "Our advanced AI observes your symptoms...",
    btnText: "Start Consultation",
    btnClass: "blue",
    img: img2,
    action: { path: "/ai-health-guide", state: { showAllDoctors: true } },
  },
  {
    title: "Medicines Delivered to Your Door",
    desc: "Upload your doctor’s prescription and get medicines fast.",
    btnText: "Order Now",
    btnClass: "yellow",
    img: img3,
    action: { path: "/pharmacy" },
  },
  {
    title: "Help When You Need It Most",
    desc: "In case of emergencies, our chatbot connects you to a professional.",
    btnText: "Get Help",
    btnClass: "red",
    img: img4,
    action: {
      path: "/ai-health-guide",
      state: {
        userMessage: "This is an emergency. I need immediate medical help.",
        intent: "emergency",
      },
    },
  },
];

export default function OurStoryCarousel() {
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  return (
    <div className={`ourstory-carousel ${darkMode ? "dark" : "light"}`}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 4200, disableOnInteraction: false }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={true}
        speed={900}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div className="story-slide">
              <img src={slide.img} alt={slide.title} className="story-bg" />
              <div className="story-overlay" />
              <div className="story-content">
                <h2>
                  <span className="highlight">{slide.title}</span>
                </h2>
                <p>{slide.desc}</p>
                <button
                  type="button"
                  className={`btn ${slide.btnClass}`}
                  onClick={() => navigate(slide.action.path, { state: slide.action.state })}
                >
                  {slide.btnText}
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <Intro />
    </div>
  );
}