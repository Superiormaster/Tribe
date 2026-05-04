// src/sections/Contact.jsx
import { useState } from "react"
import RevealOnScroll from "@/utils/RevealOnScroll"
import emailjs from "emailjs-com"

export default function Contact() {
  const [form, setForm] = useState({ name:"", email:"", message:"" });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try{
      const res = await fetch("/api/portfolio_routes/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
  
      if (res.ok) {
        throw new Error("Request failed");
      }
        alert("Message sent!");
        setForm({ name:"", email:"", message:"" });
    } catch (err) {
        alert("Oops, Failed to send message");
    } finally {
        setLoading(false);
    }
  }
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    emailjs.sendForm(import.meta.env.VITE_SERVICE_ID, import.meta.env.VITE_TEMPLATE_ID, e.target, import.meta.env.VITE_PUBLIC_KEY).then((result) => {
      alert("Message Sent!");
      setForm({name:'', email:'', message:''});
    }).catch(() => alert("Oops! Something went wrong. Please try again."));
  };
  
  return (
    <section className="py-24 bg-gray-900 overflow-hidden min-h-screen">
      <RevealOnScroll>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">Let's Work Together</h2>
          <p className="text-gray-600 text-lg mb-8">
            For collaborations, freelance work, or project inquiries — reach out anytime.
          </p>
          
      <form onSubmit={submit} className="p-4 space-y-6 border border-rose-100">
        <h2 className="text-xl font-bold mb-3">Contact Us</h2>
        <div className="relative">
          <input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} name="name" type="text" id="name" placeholder="Name" className="w-full mb-2 py-3 px-4 border-white/10 bg-white/10 border rounded text-white transition focus:outline-none focus:bg-blue-500/5 focus:border-blue-500" required/>
        </div>
        <div className="relative">
          <input value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} id="email" name="email" type="" placeholder="example@gmail.com" className="w-full mb-2 px-4 py-3 border-white/10 bg-white/10 border rounded text-white transition focus:outline-none focus:bg-blue-500/5 focus:border-blue-500" required/>
        </div>
        <div className="relative">
          <textarea value={form.message} onChange={(e)=>setForm({...form, message:e.target.value})} id="message" name="message" rows={5} placeholder="Your Message" className="w-full mb-2 py-3 px-4 border-white/10 bg-white/10 border rounded text-white transition focus:outline-none focus:bg-blue-500/5 focus:border-blue-500" required/>
        </div>
          <button type="submit" disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition w-full relative font-medium overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(50,130,246,0.4)]"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
          <p className="mt-8 mb-8 text-sm font-bold text-gray-600">
            Or 
          </p>
          <button className="w-full px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition relative font-medium overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(50,130,246,0.4)]">
            <a
            href="mailto:ejeziepaschal@gmail.com">
            Email directly
          </a>
          </button>
          </form>
        </div>
      </RevealOnScroll>
    </section>
  );
}