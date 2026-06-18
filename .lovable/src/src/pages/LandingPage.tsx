import { CheckCircle, Sprout, Diamond, ArrowRight, BookOpen, Cpu, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Diamond size={20} className="text-black" />
            </div>
            DRAKON Suite
          </div>
          <div className="hidden md:flex items-center gap-8 text-gray-400">
            <a href="#services" className="hover:text-white transition">Garden Bloom</a>
            <a href="#services" className="hover:text-white transition">AI-DRAKON</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="https://bloom.aidrakon.tech" className="hover:text-white transition">Try Bloom</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="border border-teal-400 text-teal-400 hover:bg-teal-400/10 px-6 py-2 rounded-xl transition text-sm">
              Sign In
            </a>
            <a href="/login" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-2 rounded-xl transition text-sm">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 text-sm px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            Knowledge Platform + Agent Builder
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight max-w-3xl mx-auto leading-tight">
            Tools for teams<br />building with AI
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Manage knowledge bases and build AI agents in one unified ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://bloom.aidrakon.tech"
              className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-8 py-4 rounded-xl transition text-lg"
            >
              Try Garden Bloom →
            </a>
            <a
              href="/login"
              className="border border-teal-400 text-teal-400 hover:bg-teal-400/10 px-8 py-4 rounded-xl transition text-lg"
            >
              Open AI-DRAKON →
            </a>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-20 px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-100">Choose your toolkit</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Garden Bloom */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-teal-400/30 transition">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-teal-400/20 rounded-xl flex items-center justify-center">
                <Sprout className="text-teal-400" size={24} />
              </div>
              <span className="bg-teal-400/10 text-teal-400 text-sm px-3 py-1 rounded-full">Knowledge Platform</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Garden Bloom</h3>
            <p className="text-gray-400 mb-6">
              Create and organize knowledge bases. Share via time-limited access zones with QR codes and MCP URLs. Each zone gets an AI Archivist agent that answers questions from your notes.
            </p>
            <div className="space-y-3 mb-8">
              {[
                "Notes, tags and graph visualization",
                "Access zones with QR and MCP URL",
                "Archivist AI — chat with your knowledge base",
                "DRAKON flow diagrams editor",
                "Colleagues chat + proposals inbox",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-teal-400 shrink-0" />
                  <span className="text-gray-300">{f}</span>
                </div>
              ))}
            </div>
            <a
              href="https://bloom.aidrakon.tech"
              className="block text-center bg-white/10 hover:bg-white/20 py-3 rounded-xl transition font-semibold"
            >
              Open Bloom →
            </a>
          </div>

          {/* AI-DRAKON */}
          <div className="bg-white/5 border border-teal-400/30 rounded-2xl p-8 hover:border-teal-400/60 transition">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-teal-400/20 rounded-xl flex items-center justify-center">
                <Diamond className="text-teal-400" size={24} />
              </div>
              <span className="bg-teal-400/10 text-teal-400 text-sm px-3 py-1 rounded-full">Agent Builder</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">AI-DRAKON</h3>
            <p className="text-gray-400 mb-6">
              Design and deploy AI agents connected to GitHub repos, knowledge bases and external APIs. From idea to deployment in one interface.
            </p>
            <div className="space-y-3 mb-8">
              {[
                "AI agent creation and management",
                "GitHub repository integration",
                "Visual pipeline editor",
                "Knowledge Agent (Archivist) management",
                "Multi-user with Appwrite auth",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-teal-400 shrink-0" />
                  <span className="text-gray-300">{f}</span>
                </div>
              ))}
            </div>
            <a
              href="/login"
              className="block text-center bg-teal-500 hover:bg-teal-400 text-black py-3 rounded-xl transition font-semibold"
            >
              Open DRAKON →
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT CONNECTS */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="bg-teal-400/10 border border-teal-400/20 text-teal-400 text-sm px-4 py-2 rounded-full">Suite Integration</span>
            <h2 className="text-3xl font-bold mt-6 mb-4">Better together</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Use each service independently or connect them — your Bloom knowledge becomes the brain behind DRAKON agents.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            {[
              {
                icon: <BookOpen size={28} className="text-teal-400" />,
                title: "Garden Bloom",
                desc: "Write notes. Organize with tags and graph. Create a knowledge zone.",
                step: "1",
              },
              {
                icon: <ArrowRight size={24} className="text-teal-400/60" />,
                title: null,
                desc: null,
                step: null,
                arrow: true,
              },
              {
                icon: <Zap size={28} className="text-teal-400" />,
                title: "Connect Zone",
                desc: "Link your Bloom zone to DRAKON. Archivist AI becomes the knowledge source.",
                step: "2",
              },
              {
                icon: <ArrowRight size={24} className="text-teal-400/60" />,
                title: null,
                desc: null,
                step: null,
                arrow: true,
              },
              {
                icon: <Cpu size={28} className="text-teal-400" />,
                title: "AI-DRAKON",
                desc: "Build an agent. It answers questions using your curated Bloom knowledge via MCP.",
                step: "3",
              },
            ].map((item, i) =>
              item.arrow ? (
                <div key={i} className="hidden md:flex items-center">{item.icon}</div>
              ) : (
                <div key={i} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 text-center max-w-xs">
                  <div className="w-10 h-10 bg-teal-400/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <div className="text-xs text-teal-400 font-semibold mb-2">STEP {item.step}</div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              )
            )}
          </div>
          <div className="text-center mt-10">
            <a href="/login" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-8 py-3 rounded-xl transition inline-block">
              Get the Suite →
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-gray-400 text-center mb-12">Pay for what you need. Upgrade or downgrade anytime.</p>
        <div className="grid md:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {[
            {
              name: "Free",
              price: "$0",
              period: "",
              desc: "Try both services",
              features: ["3 knowledge zones", "100 notes in Bloom", "1 AI agent in DRAKON", "10 pipeline runs/mo"],
              cta: "Start Free",
              href: "https://bloom.aidrakon.tech",
              highlight: false,
            },
            {
              name: "Bloom",
              price: "$9",
              period: "/mo",
              desc: "For knowledge workers",
              features: ["Unlimited zones + notes", "Archivist AI chat", "Zone sharing + QR", "DRAKON diagrams", "5 languages"],
              cta: "Start with Bloom",
              href: "https://bloom.aidrakon.tech",
              highlight: false,
            },
            {
              name: "Builder",
              price: "$19",
              period: "/mo",
              desc: "For AI developers",
              features: ["Unlimited AI agents", "GitHub integration", "Visual pipeline editor", "5 zone connections", "MCP endpoints"],
              cta: "Start Building",
              href: "/login",
              highlight: true,
              badge: "Most Popular",
            },
            {
              name: "Suite",
              price: "$29",
              period: "/mo",
              desc: "Everything combined",
              features: ["All Bloom features", "All Builder features", "Unlimited zone connections", "SSO between services", "Priority support"],
              cta: "Get Suite",
              href: "/login",
              highlight: false,
              badge: "Best Value",
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`p-8 rounded-2xl border flex flex-col ${
                tier.highlight
                  ? "bg-teal-500/10 border-teal-400 ring-1 ring-teal-400"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{tier.name}</h3>
                {tier.badge && (
                  <span className="text-xs bg-teal-400/10 text-teal-400 px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                <span className="text-gray-400">{tier.period}</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">{tier.desc}</p>
              <div className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-teal-400 shrink-0" />
                    <span className="text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
              <a
                href={tier.href}
                className={`block text-center py-3 rounded-xl font-semibold transition ${
                  tier.highlight
                    ? "bg-teal-500 hover:bg-teal-400 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          No credit card required for Free tier. Upgrade or downgrade anytime.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div className="w-6 h-6 bg-teal-500 rounded flex items-center justify-center">
                <Diamond size={14} className="text-black" />
              </div>
              DRAKON Suite
            </div>
            <p className="text-gray-500 text-sm">Knowledge management and AI agent building in one ecosystem.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-300 flex items-center gap-2">
              <Sprout size={16} className="text-teal-400" /> Garden Bloom
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {["Notes", "Zones", "Graph", "Chat"].map((l) => (
                <li key={l}><a href="https://bloom.aidrakon.tech" className="hover:text-white transition">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-300 flex items-center gap-2">
              <Diamond size={16} className="text-teal-400" /> AI-DRAKON
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {["Agents", "Pipelines", "GitHub", "Notebooks"].map((l) => (
                <li key={l}><a href="/login" className="hover:text-white transition">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="text-gray-500 text-sm">
            <p>© 2026 DRAKON Suite</p>
            <p className="mt-2">Built with Garden Bloom + AI-DRAKON</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
