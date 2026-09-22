import React, { useContext, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./Slide.css";
import AIHealthGuide from '../Theme/Popupchat/AIHealthGuide';
import { FaRobot, FaCapsules, FaCommentDots, FaUserMd, FaShieldAlt, FaFileAlt } from 'react-icons/fa';
import image4 from "../images/4.jpeg";
import image5 from "../images/5.jpeg";
import image6 from "../images/6.jpeg"; 
import image7 from "../images/7.jpeg";
import { ThemeContext } from "../Theme/ThemeContext"; 
// import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
const foodItems = [
  {
    title: "Blood Pressure Monitor",
    price: "Rs 3200",
    rating: 4,
    image: image5,
    type: "Device",
    use: "Home blood pressure monitoring",
    description: "Automatic upper-arm monitor for regular blood pressure checks at home.",
    pack: "1 device with cuff",
  },
  {
    title: "Digital Thermometer",
    price: "Rs 900",
    rating: 5,
    image: image6,
    type: "Device",
    use: "Checking body temperature",
    description: "Quick digital thermometer suitable for routine temperature measurement.",
    pack: "1 device",
  },
  {
    title: "Medical First Aid Kit",
    price: "Rs 2500",
    rating: 4.5,
    image: image4,
    type: "Medical Device",
    use: "Basic first aid and wound care",
    description: "A practical collection of essential supplies for everyday first aid needs.",
    pack: "1 complete kit",
  },
  {
    title: "Travel Wellness Kit",
    price: "Rs 1800",
    rating: 4.5,
    image: image7,
    type: "Health Supplement",
    use: "Keeping essential health supplies together while travelling",
    description: "Compact wellness essentials arranged in a convenient travel-ready kit.",
    pack: "1 kit",
  },
];

const careFeatures = [
  { 
    icon: <FaCommentDots size={24} />, 
    title: "Basic Guidance", 
    desc: "Get answers to common health questions" 
  },
  { 
    icon: <FaUserMd size={24} />, 
    title: "Find the Right Doctor", 
    desc: "We connect you with the most relevant specialists" 
  },
  { 
    icon: <FaShieldAlt size={24} />, 
    title: "Trusted & Verified", 
    desc: "All doctors are verified and highly rated" 
  },
  { 
    icon: <FaFileAlt size={24} />, 
    title: "Manage Everything", 
    desc: "Prescriptions, reports & records in one place" 
  },
];

const Slide = () => {
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div className={`trending-container ${darkMode ? "dark" : "light"}`}>
      <h2 className="trending-subtitle">
        <span className="highlight"> Hot Deals</span> – With Hot Medical
        Products
      </h2>

      {/* Hot Deals Slider */}
      <Swiper
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        modules={[Navigation, Pagination, Autoplay]}
        breakpoints={{
          640: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
      >
        {foodItems.map((item, index) => (
          <SwiperSlide key={index}>
            <div className="food-card">
              <img src={item.image} alt={item.title} className="food-image" />
              <div className="food-price">{item.price}</div>
              <div className="food-info">
                <div className="food-title">{item.title}</div>
                <div className="food-rating">
                  {Array.from({ length: Math.floor(item.rating) }).map(
                    (_, i) => (
                      <span key={i}>⭐</span>
                    ),
                  )}
                  {item.rating % 1 !== 0 && <span>⭐</span>}
                  <span className="rating-count">({item.rating})</span>
                </div>
                <div className="food-actions">
                  <button
                    type="button"
                    className="food-action food-details"
                    onClick={() => setSelectedProduct(item)}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="food-action food-cart"
                    onClick={() => navigate("/pharmacy", { state: { hotDeal: item } })}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Features Section */}
      <section className="features-section">
        <h3>Our Key Features</h3>
        <div className="features-grid">
          <div className={`feature-card ${darkMode ? "dark" : "light"}`}>
            <FaCapsules size={40} />
            <h4>Pharmacy</h4>
            <p>
              Order medicines and health products from our trusted pharmacy.
            </p>
          </div>
          <div className={`feature-card ${darkMode ? "dark" : "light"}`}>
            <FaRobot size={40} />
            <h4> Health Guide</h4>
            <p>Get instant health suggestions and routines.</p>
          </div>
        </div>
      </section>

      {/* Need Help Finding the Right Care Section */}
      <section
        className={`care-assistant-section ${darkMode ? "dark" : "light"}`}
      >
        <div className="care-assistant-container">
          {/* Left Side */}
          <div className="care-assistant-left">
            <div className="assistant-illustration">
              <div className="robot-circle">
                <FaRobot size={80} className="robot-icon" />
              </div>
              <div className="chat-bubble bubble-1">
                <FaCommentDots size={14} />
              </div>
              <div className="chat-bubble bubble-2">
                <FaCommentDots size={14} />
              </div>
            </div>
            <h2 className="care-title">Need Help Finding the Right Care?</h2>
            <p className="care-desc">
              Get initial guidance through our smart assistant and find the
              right doctor for your health needs.
            </p>
          </div>

          {/* Right Side */}
          <div className="care-assistant-right">
            <div className="care-features-grid">
              {careFeatures.map((feature, index) => (
                <div
                  className={`care-feature-card ${darkMode ? "dark" : "light"}`}
                  key={index}
                >
                  <div className="care-feature-icon">{feature.icon}</div>
                  <h4 className="care-feature-title">{feature.title}</h4>
                  <p className="care-feature-desc">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className={`care-action-bar ${darkMode ? "dark" : "light"}`}>
              <span className="help-text">How can we help you today?</span>
                <div className="care-buttons">
                <button
                  className={`care-btn chat-btn ${darkMode ? "dark" : "light"}`}
                  onClick={() => navigate("/ai-health-guide")}
                >
                  <FaCommentDots /> Chat with Assistant
                </button>

                <span className="or-text">or</span>
                <button
                  className={`care-btn doctors-btn ${darkMode ? "dark" : "light"}`}
                  onClick={() => navigate("/ai-health-guide", { state: { showAllDoctors: true } })}
                >
                  <FaUserMd /> View Top Doctors
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        className={`testimonials-section ${darkMode ? "dark" : "light"}`}
      >
        <h2 className="testimonials-title">What Our Patients Say</h2>
        <p className="testimonials-subtitle">
          Medi Assist helps patients manage appointments, consultations, and
          healthcare services more efficiently. Here's what our users say.
        </p>
        <div className="testimonials-grid">
          {[
            {
              image: image5,
              text: "Medi Assist made booking doctor appointments quick and hassle-free. The process is simple and convenient.",
            },
            {
              image: image6,
              text: "I can easily track my consultations and medical records. The platform is user-friendly and reliable.",
            },
            {
              image: image4,
              text: "The appointment management system helped me save time and avoid long waiting queues at the clinic",
            },
          ].map((item, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-avatar-wrapper">
                <img
                  src={item.image}
                  alt="Client"
                  className="testimonial-avatar"
                />
              </div>
              <p className="testimonial-text">"{item.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {selectedProduct && (
        <div
          className="slide-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedProduct(null)}
        >
          <div className="slide-product-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="slide-modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              x
            </button>
            <img src={selectedProduct.image} alt={selectedProduct.title} />
            <div className="slide-product-modal-content">
              <span className="slide-modal-type">{selectedProduct.type}</span>
              <h3>{selectedProduct.title}</h3>
              <strong className="slide-modal-price">{selectedProduct.price}</strong>
              <p><b>Used for:</b> {selectedProduct.use}</p>
              <p><b>What is in the pack:</b> {selectedProduct.pack}</p>
              <p>{selectedProduct.description}</p>
              <button
                type="button"
                className="slide-modal-cart"
                onClick={() => navigate("/pharmacy", { state: { hotDeal: selectedProduct } })}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <AIHealthGuide />
    </div>
  );
};

export default Slide;