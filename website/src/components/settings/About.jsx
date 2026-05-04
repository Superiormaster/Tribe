// src/components/About.jsx
import RevealOnScroll from "../RevealOnScroll"

export default function About() {
  const frontendSkills = ["reactjs", "tailwindcss", "Javascript", "HTML", "CSS"];
  const backendSkills = ["node.js", "python Flask API", "MongoDB", "FastAPI", "Django API"];

  return (
    <section className="flex min-h-screen justify-center items-center text-white py-20 overflow-hidden">
      <RevealOnScroll>
        <div className="max-w-3xl mx-auto text-center z-10 px-4">
          <h2 className="font-bold text-3xl mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">About Me</h2>
          <div className="rounded-xl border border-white/10 p-8 hover:-transparent-y-1 transition-all">
            <p className="text-gray-300 mb-6">Passionate developer with expertise in building scalabe web applications and creative innovative solutions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl hover:-transparent-y-1 transition-all">
                <h3 className="mb-4 text-xl font-bold">Frontend</h3>
                <div className="flex flex-wrap gap-2">
                  {frontendSkills.map((tech, key) => (
                    <span key={key} className="bg-blue-500/10 text-blue-500 py-1 px-3 rounded-full text-sm hover:bg-blue-500/20 hover:shadow[0_2px_8px_rgba(59,136,246,0.2)] transition">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-6 rounded-xl hover:-transparent-y-1 transition-all">
                <h3 className="mb-4 text-xl font-bold">Backend</h3>
                <div className="flex flex-wrap gap-2">
                  {backendSkills.map((tech, key) => (
                    <span key={key} className="bg-blue-500/10 text-blue-500 py-1 px-3 rounded-full text-sm hover:bg-blue-500/20 hover:shadow[0_2px_8px_rgba(59,136,246,0.2)] transition">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 mt-8">
            <div className="p-6 rounded-xl border border-white/10 hover:-transparent-y-1 transition-all">
              <h3 className="mb-4 text-xl font-bold">Education</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li className="list-outside">
                  <strong>Relevant Courseworks: Web development, App development</strong>
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-white/10 hover:-transparent-y-1 transition-all">
              <h3 className="mb-4 text-xl font-bold">Work Experiences</h3>
              <div className="space-y-4 text-gray-300">
                <div className="">
                  <h4 className="font-semibold">Software</h4>
                  <p>Developed and maintained websites.</p>
                </div>
                <div className="">
                  <h4 className="font-semibold">Software</h4>
                  <p>Developed and maintained playstore apps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}