import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Pagination,
  Autoplay,
  EffectFade
} from "swiper/modules";
import { useNavigate } from "react-router-dom";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade"; 

import "./Hero.css";
import "./Slide";

import image1 from "../images/20.png";
import image2 from "../images/21.png";
import image3 from "../images/22.png";
import Slide from "./Slide";

const Hero = () => {
  const navigate = useNavigate();

  return ( 
    <div className="hero-container">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1000}
        loop={true}
        autoplay={{ delay: 4000 }}
        navigation
        pagination={{ clickable: true }}
      >
        <SwiperSlide>
          <div className="hero-slide">
            <img src={image1} alt="AI Health" /> 
            <div className="hero-content">
              <h1> Health Assistant </h1>
              <p>Smart medical guidance instantly.</p>
              <button
                className="btn" id="herobtn"
                onClick={() => navigate("/ai-health-guide")}
              >
                Start Intial Guideance
              </button>
            </div>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div className="hero-slide">
            <img src={image2} alt="Pharmacy" />
            <div className="hero-content">
              <h1>Trusted Online Pharmacy</h1>
              <p>Order genuine medicines safely.</p>
              <button
                className="btn" id="herobtn"
                onClick={() => navigate("/pharmacy")}
              >
                Visit Pharmacy
              </button>
            </div>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div className="hero-slide">
            <img src={image3} alt="Health Care" />
            <div className="hero-content">
              <h1>Your Health. Our Priority.</h1>
              <p>Intial Guidance + Pharmacy in one place.</p>
               <button
                className="btn" id="herobtn"
                onClick={() => navigate("/about")}
              >
                Learn More
              </button>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
      <Slide/>
    </div>
  );
};

export default Hero;
