'use client';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ScanLine, Upload, Zap, Users, Sparkles, ArrowRight, CheckCircle, Star } from "lucide-react";

interface MousePosition {
  x: number;
  y: number;
}

interface FloatingElementProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export default function StunningARLanding() {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const yTransform = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const FloatingElement: React.FC<FloatingElementProps> = ({ children, delay = 0, duration = 4 }) => (
    <motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="absolute"
    >
      {children}
    </motion.div>
  );

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <motion.div
          style={{
            x: mousePosition.x * 0.02,
            y: mousePosition.y * 0.02,
          }}
          className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl"
        />
        <motion.div
          style={{
            x: mousePosition.x * -0.01,
            y: mousePosition.y * -0.01,
          }}
          className="absolute top-1/2 right-20 w-96 h-96 bg-gradient-to-br from-indigo-300/15 to-purple-300/15 rounded-full blur-3xl"
        />
        <motion.div
          style={{
            x: mousePosition.x * 0.015,
            y: mousePosition.y * 0.015,
          }}
          className="absolute bottom-20 left-1/2 w-80 h-80 bg-gradient-to-br from-violet-300/20 to-purple-300/20 rounded-full blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Revolutionary AR Technology
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-black leading-tight">
                Transform
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Reality
                </span>
                <br />
                Instantly
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Upload any image and watch it come alive with stunning AR experiences. 
                <span className="font-semibold text-purple-600"> No apps, no setup</span> - just pure magic.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  <ScanLine className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-purple-200 hover:border-purple-300 text-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg group"
                >
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 border-2 border-white" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Loved by 50,000+ creators</p>
                </div>
              </div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* Main Device Mockup */}
                <div className="relative z-10 w-80 h-96 mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-2 shadow-2xl">
                  <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden relative">
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900">
                      <div className="absolute inset-4 border-2 border-purple-400/30 rounded-2xl">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm"
                        >
                          <Play className="w-12 h-12 text-purple-300" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <FloatingElement delay={0} duration={5}>
                  <div className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <ScanLine className="w-8 h-8 text-white" />
                  </div>
                </FloatingElement>

                <FloatingElement delay={1} duration={4}>
                  <div className="absolute -bottom-4 -right-8 w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-xl">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                </FloatingElement>

                <FloatingElement delay={2} duration={6}>
                  <div className="absolute top-1/4 -right-12 w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </FloatingElement>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-32 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-black text-gray-900 mb-6">
              Why Choose Our 
              <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent"> AR Platform?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade AR experiences that work seamlessly across all devices, 
              without the complexity.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "Instant Upload",
                desc: "Drop any image and get your AR marker instantly. No processing time, no waiting.",
                color: "from-purple-500 to-violet-500"
              },
              {
                icon: ScanLine,
                title: "Universal Scanning",
                desc: "Works with any camera app. No downloads needed - just point, scan, and experience.",
                color: "from-violet-500 to-indigo-500"
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Sub-second loading times with crisp HD video overlays that respond in real-time.",
                color: "from-indigo-500 to-purple-500"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200/20 to-violet-200/20 rounded-3xl transform group-hover:scale-105 transition-transform duration-300" />
                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-100">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-black text-gray-900 mb-6">
              Simple.
              <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent"> Powerful.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three steps to create stunning AR experiences that wow your audience.
            </p>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connection Lines */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-purple-200 via-violet-200 to-indigo-200 hidden lg:block" />
            
            <div className="grid lg:grid-cols-3 gap-12 relative z-10">
              {[
                { num: "01", title: "Upload Image", desc: "Drop your image and we'll generate your unique AR marker instantly", icon: Upload },
                { num: "02", title: "Scan QR Code", desc: "Share the QR code with your audience - works with any smartphone camera", icon: ScanLine },
                { num: "03", title: "Experience Magic", desc: "Watch as your image transforms into an immersive AR experience", icon: Sparkles }
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative text-center group"
                >
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border-4 border-purple-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-violet-600 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                      <step.icon className="w-12 h-12 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 max-w-xs mx-auto leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Creative Use Cases */}
      <section className="relative overflow-hidden bg-slate-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239333ea' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative z-10 py-24">
          <div className="container mx-auto px-6">
            {/* Header with Creative Layout */}
            <div className="flex flex-col lg:flex-row items-start justify-between mb-20">
              <div className="lg:w-1/2">
                <div className="inline-block px-6 py-3 bg-purple-500/20 rounded-full text-purple-300 text-sm font-medium mb-6">
                  Real World Impact
                </div>
                <h2 className="text-6xl font-black text-white leading-tight">
                  Where Reality
                  <br />
                  <span className="text-purple-400 italic">Meets Magic</span>
                </h2>
              </div>
              <div className="lg:w-1/2 lg:pl-12 mt-8 lg:mt-16">
                <p className="text-xl text-gray-300 leading-relaxed">
                  Our AR technology doesn&apos;t just add digital layers—it creates emotional connections. 
                  See how creators across industries are building unforgettable experiences.
                </p>
              </div>
            </div>

            {/* Unique Card Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Large Feature Card */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="lg:row-span-2"
              >
                <div className="relative h-96 bg-gradient-to-br from-purple-600 to-violet-700 rounded-3xl p-8 overflow-hidden group cursor-pointer">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                    <div className="absolute top-8 right-8 w-32 h-32 border-2 border-white/30 rounded-full"></div>
                    <div className="absolute bottom-12 left-8 w-20 h-20 border border-white/40 rounded-2xl rotate-45"></div>
                  </div>
                  
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-4">Event Engagement</h3>
                      <p className="text-purple-100 text-lg leading-relaxed">
                        Concert posters that play exclusive backstage footage. Wedding invites that showcase love stories. 
                        Transform every event touchpoint into a memorable experience.
                      </p>
                    </div>
                    <div className="flex items-center text-white/80 font-medium group-hover:text-white transition-colors">
                      <span className="mr-2">See Examples</span>
                      <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center group-hover:translate-x-2 transition-transform">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Two Smaller Cards */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="relative h-44 bg-white rounded-3xl p-6 shadow-xl group cursor-pointer overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200 to-violet-200 rounded-full -translate-y-6 translate-x-6 opacity-60"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Product Demos</h3>
                      <p className="text-gray-600 text-sm">Packaging that shows products in action. Catalogs that come alive.</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="relative h-44 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 group cursor-pointer overflow-hidden border border-purple-100">
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-300 to-purple-300 rounded-full translate-y-6 -translate-x-6 opacity-40"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Learning Reimagined</h3>
                      <p className="text-gray-600 text-sm">Textbooks with 3D models. Worksheets that teach through play.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-violet-50 py-24">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-purple-200 rounded-full opacity-30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute top-3/4 right-1/4 w-24 h-24 border border-violet-200 rounded-full opacity-40"
          />
          <motion.div
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 right-1/6 w-16 h-16 bg-gradient-to-br from-purple-300/20 to-violet-300/20 rounded-2xl"
          />
          <motion.div
            animate={{ x: [-30, 30, -30] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 left-1/6 w-20 h-20 bg-gradient-to-tr from-indigo-300/15 to-purple-300/15 rounded-full"
          />
        </div>

        <div className="relative z-10 container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2 fill-current" />
              Loved by Creators Worldwide
            </div>
            <h2 className="text-5xl font-black text-gray-900 mb-6">
              Don&apos;t just take our word
              <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent"> for it</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "This completely changed how we engage with our audience. Our event attendance increased by 300% after using AR invitations.",
                name: "Sarah Chen",
                title: "Creative Director",
                company: "Midnight Events",
                rating: 5,
                highlight: "300% increase"
              },
              {
                quote: "Our product demonstrations have never been more effective. Customers can see our furniture in their actual space before buying.",
                name: "Marcus Rodriguez",
                title: "Marketing Manager", 
                company: "Nordic Furniture Co.",
                rating: 5,
                highlight: "More effective demos"
              },
              {
                quote: "Students are finally excited about physics! The AR experiments make abstract concepts tangible and fun to explore.",
                name: "Dr. Emily Watson",
                title: "Physics Professor",
                company: "Berkeley University",
                rating: 5,
                highlight: "Excited students"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group"
              >
                <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100/50 h-full flex flex-col">
                  {/* Quote Mark */}
                  <div className="absolute -top-4 left-8 w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">&quot;</span>
                  </div>
                  
                  {/* Stars */}
                  <div className="flex items-center mb-4 pt-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="text-gray-700 text-lg leading-relaxed mb-6 flex-grow">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  
                  {/* Highlight Badge */}
                  <div className="inline-block px-3 py-1 bg-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6 self-start">
                    {testimonial.highlight}
                  </div>
                  
                  {/* Author */}
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.title}</div>
                      <div className="text-purple-600 text-sm font-medium">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap justify-center items-center gap-12 text-center"
          >
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 border-2 border-white" />
                ))}
              </div>
              <span className="text-gray-600 font-medium">50,000+ happy creators</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-gray-600 font-medium">4.9/5 average rating</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-6xl lg:text-7xl font-black text-gray-900 mb-8">
              Ready to Create
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                AR Magic?
              </span>
            </h2>
            
            <p className="text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join thousands of creators who are already transforming their content with our AR platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-12 py-6 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 group"
              >
                <ScanLine className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Start Free Trial
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-purple-300 hover:border-purple-400 text-purple-700 px-12 py-6 rounded-2xl font-bold text-xl group"
              >
                <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            <div className="flex justify-center items-center space-x-8 text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Setup in 30 Seconds</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}