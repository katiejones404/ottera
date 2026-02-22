import Link from "next/link";
export default function Home() {
  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f1ede5]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#c7e1ee] via-[#7eabdb]/40 to-[#c7e1ee] py-20 px-6 overflow-hidden min-h-[600px] flex items-center">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#7eabdb]/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left side - Text and buttons */}
            <div>
              <h1 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-[72px] leading-tight">Ottera</h1>
              <p className="text-[#7eabdb] mb-8 font-[Londrina_Solid] text-[32px] leading-relaxed">Keeping Communities Afloat</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                href="/resources/zipcode"
                className="bg-gradient-to-r from-[#7eabdb] to-[#2d5f8d] text-white px-8 py-4 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl inline-block text-center"
                >
                  Find Resources
                  </Link>
                <button 
                  onClick={scrollToHowItWorks}
                  className="bg-white/60 backdrop-blur-sm text-[#2d5f8d] px-8 py-4 rounded-full hover:bg-white/80 hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl border-2 border-white"
                >
                  How It Works
                </button>
              </div>
            </div>
            
            {/* Right side - Logo circle */}
            <div className="flex justify-center md:justify-end">
              <div className="w-80 h-80 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(126,171,219,0.4)] border-4 border-white">
                <div className="text-[#7eabdb] font-[Londrina_Solid] text-6xl">🦦</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 md:h-24">
            <path d="M0,0 C150,80 350,80 600,50 C850,20 1050,50 1200,80 L1200,120 L0,120 Z" fill="#f1ede5"></path>
          </svg>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-[56px]">How It Works</h2>
            <p className="text-[#7eabdb] font-[Londrina_Solid] text-[24px]">Getting started is easy!</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">1</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Sign Up</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Create your free account and tell us if you're seeking help, wanting to volunteer, or representing an organization.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">2</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Connect</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Browse local resources, find volunteer opportunities, or post what your community needs in real-time.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">3</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Make Waves</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Get the help you need or provide support to others. Together, we keep our communities afloat!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c7e1ee] via-[#7eabdb]/30 to-[#c7e1ee]"></div>
        <div className="absolute top-20 left-20 w-40 h-40 bg-white/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#7eabdb]/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-12 shadow-[0_20px_60px_rgba(126,171,219,0.4)] border-4 border-white">
            <h2 className="text-[#2d5f8d] mb-6 font-[Londrina_Solid] text-5xl">Ready to Dive In?</h2>
            <p className="text-[#7eabdb] mb-10 leading-relaxed font-[Londrina_Solid] text-2xl">
              Join Ottera today and be part of a community that cares! 🌊
            </p>
            <Link
            href="/signup"
            className="bg-gradient-to-r from-[#7eabdb] to-[#2d5f8d] text-white px-10 py-5 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl inline-block text-center"
            >
              Get Started Now
              </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
