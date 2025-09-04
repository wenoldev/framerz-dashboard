'use client'
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ScanLine } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-10">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1"
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Scan. Play. <span className="text-indigo-400">Experience AR</span>
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Transform static images into immersive AR experiences. Simply scan an
            image and watch videos come alive on a 3D plane.
          </p>

          <div className="flex gap-4">
            <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
              <ScanLine className="w-5 h-5 mr-2" /> Try Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-500 text-gray-200 hover:bg-gray-800"
            >
              <Play className="w-5 h-5 mr-2" /> Watch Video
            </Button>
          </div>
        </motion.div>

        {/* Right Content: Mock AR Preview */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 flex justify-center"
        >
          <div className="relative w-[320px] h-[400px] bg-gray-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Image Placeholder */}
            <img
              src="/placeholder-image.jpg"
              alt="AR marker"
              className="w-full h-full object-cover opacity-80"
            />

            {/* Floating Video Plane Mock */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute top-10 left-1/2 -translate-x-1/2 w-56 h-32 bg-black border border-indigo-500 shadow-lg rounded-xl flex items-center justify-center"
            >
              <Play className="w-10 h-10 text-indigo-400" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16 grid md:grid-cols-3 gap-10 text-center">
        {[
          { title: "Easy Integration", desc: "Plug & play SDK for web & mobile apps." },
          { title: "Immersive AR", desc: "Bring your content to life in 3D planes." },
          { title: "Cross-Platform", desc: "Works seamlessly on iOS, Android, and WebXR." },
        ].map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
            className="bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-indigo-500/20"
          >
            <h3 className="text-xl font-semibold mb-3 text-indigo-400">{f.title}</h3>
            <p className="text-gray-300">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
