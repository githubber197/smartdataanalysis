import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./footer.css";

const Footer = () => {
  const footerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      footerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
    );
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer ref={footerRef} className="footer-container">
      <div className="footer-content">
        <div className="footer-left">
          <h2 className="footer-logo">Smart Data Analytics</h2>
          <p className="footer-text">
            Empowering businesses with AI-driven insights and data intelligence.
          </p>
        </div>

        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        <div className="footer-socials">
          <h3>Follow Us</h3>
          <div className="social-icons">
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <i className="fab fa-github"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} Smart Data Analytics. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
