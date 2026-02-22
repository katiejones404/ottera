"use client";

// AboutUs.tsx
import React from "react";
import { Users, Target, Heart, Award } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[#f1ede5]">
      {/* ================= HERO (full-bleed, solid color) ================= */}
      <section
        className="relative left-1/2 -mx-[50vw] w-screen py-24 px-6 overflow-hidden"
        style={{ backgroundColor: "#c7e1ee" }} // solid hero color
      >
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10 px-6">
          <h1 className="text-[#2d5f8d] mb-6 font-display text-[64px]">About Us</h1>
          <p className="max-w-3xl mx-auto leading-relaxed text-[32px] text-[#7eabdb]">
            Keeping Communities Afloat
          </p>
        </div>

        {/* wave to page background */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-24">
            <path
              d="M0,0 C150,80 350,80 600,50 C850,20 1050,50 1200,80 L1200,120 L0,120 Z"
              fill="#f1ede5"
            />
          </svg>
        </div>
      </section>

      {/* ================= ABOUT / STORY (centered page color) ================= */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl text-[#2d5f8d] mb-6 font-[Londrina_Solid]">About Ottera</h2>
            <p className="text-lg mb-4 leading-relaxed font-[Londrina_Solid] text-[#2d5f8d]">
              Ottera is an all-in-one platform that connects people in need, volunteers, and nonprofit
              organizations in real time. We make finding local resources easy by replacing outdated
              communication methods with one reliable, accessible system, helping communities respond
              faster and more effectively.
            </p>
          </div>

          <div className="rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(126,171,219,0.3)] border-4 border-white">
            <img src="/images/volunteer.jpg" alt="Our team" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ================= VALUES BAND (FULL-BLEED SOLID) ================= */}
<section className="relative py-16 overflow-hidden">
  {/* full-width background for the band */}
  <div
    className="absolute inset-x-0 top-0 bottom-0 -z-10"
    style={{ backgroundColor: "#c7e1ee" }}
  ></div>

  {/* top decorative wave anchored to band */}
  <div className="absolute top-0 left-0 w-full pointer-events-none">
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
      <path d="M0,40 C300,100 500,20 800,60 C1000,80 1100,40 1200,60 L1200,0 L0,0 Z" fill="#c7e1ee" />
    </svg>
  </div>

  <div className="max-w-6xl mx-auto relative z-10 px-6">
    {/* ... your content (heading + grid) ... */}
  </div>

  {/* bottom wave that transitions back to page color */}
  <div className="absolute bottom-0 left-0 w-full pointer-events-none">
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
      <path d="M0,60 C200,20 400,80 600,50 C900,100 1100,40 1200,80 L1200,120 L0,120 Z" fill="#f1ede5" />
    </svg>
  </div>
</section>

      {/* ================= MISSION (centered, page color) ================= */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(126,171,219,0.3)] order-2 md:order-1 border-4 border-white">
            <img src="/images/help.png" alt="Team collaboration" className="w-full h-full object-cover" />
          </div>

          <div className="order-1 md:order-2">
            <h2 className="text-5xl text-[#2d5f8d] mb-6 font-[Londrina_Solid]">Our Mission</h2>
            <p className="text-lg mb-4 leading-relaxed font-[Londrina_Solid] text-[#2d5f8d]">
              We&apos;re on a mission to make support easier to find, easier to coordinate, and easier to trust by
              connecting people in need, volunteers, and organizations through one centralized platform.
            </p>
          </div>
        </div>
      </section>

      {/* ================= STATS (spacer-ish, optional content later) ================= */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div style={{ minHeight: 120 }} />
      </section>

      {/* ================= CTA BAND (full-bleed simple solid) ================= */}
      <section
        className="relative py-20 px-6 overflow-hidden"
        style={{ backgroundColor: "#c7e1ee", left: "50%", transform: "translateX(-50%)" }}
      >
        {/* center content (keeps rounded card look) */}
        <div className="max-w-4xl mx-auto text-center relative z-10 px-6">
          <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-12 shadow-[0_20px_60px_rgba(126,171,219,0.4)] border-4 border-white">
            <h2 className="text-5xl text-[#2d5f8d] mb-6 font-[Londrina_Solid]">Experience Ottera</h2>
            <p className="text-2xl text-[#7eabdb] mb-10 leading-relaxed font-[Londrina_Solid]">
              Need support or want to help? Let&apos;s make waves together!
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = "/signup")}
              className="bg-gradient-to-r from-[#7eabdb] to-[#2d5f8d] text-white px-10 py-5 rounded-full text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid]"
            >
              Create an Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
