import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import {
  Zap, Mail, Bot, BarChart3, Users, Play, CheckCircle,
  ChevronRight, Menu, X, Loader2, Smartphone,
  TrendingUp, Star, ArrowRight, Shield,
  Rocket
} from 'lucide-react';

const PRICING_PLANS = [
  {
    id: 'lead_pack',
    name: 'Lead Pack',
    price: 18,
    unit: '/day',
    desc: 'Daily distressed seller & wholesaler leads',
    features: [
      '300-600 seller leads/day',
      '50-100 buyer leads/day',
      'Delivered by 9 AM CT',
      'CSV + JSON format',
      'Confidence scores included',
    ],
    popular: false,
    color: 'from-blue-600 to-blue-800',
    icon: Users,
  },
  {
    id: 'ai_email',
    name: 'AI Email Automation',
    price: 297,
    unit: '/month',
    desc: 'Full email outreach automation suite',
    features: [
      'Unlimited email sequences',
      'AI copywriting & personalization',
      'Auto follow-up scheduling',
      'Reply detection & routing',
      'Analytics dashboard',
      'Priority support',
    ],
    popular: true,
    color: 'from-purple-600 to-pink-600',
    icon: Mail,
  },
  {
    id: 'ai_full_stack',
    name: 'Full Stack AI',
    price: 497,
    unit: '/month',
    desc: 'Everything: leads, email, CRM, chatbot',
    features: [
      'Daily lead packs (seller + buyer)',
      'AI email automation suite',
      'Smart CRM pipeline',
      'AI customer support chatbot',
      'AI deal analysis tools',
      'Content factory (videos)',
      'Dedicated account manager',
      'White-label option',
    ],
    popular: false,
    color: 'from-emerald-600 to-teal-600',
    icon: Rocket,
  },
  {
    id: 'ai_enterprise',
    name: 'Enterprise',
    price: 997,
    unit: '/month',
    desc: 'Custom AI solution for your business',
    features: [
      'Everything in Full Stack',
      'Custom AI agent development',
      'API access & integrations',
      'Multi-market coverage',
      'Unlimited users/seats',
      'SLA guarantee',
      'Priority 24/7 support',
      'Monthly strategy call',
    ],
    popular: false,
    color: 'from-amber-600 to-orange-600',
    icon: Shield,
  },
];

const PRODUCTS = [
  {
    id: 'email-automation',
    title: 'AI Email Automation',
    tagline: 'Draft, schedule & send — on autopilot',
    description: 'Personalized email sequences that nurture leads, follow up automatically, and close deals while you sleep.',
    icon: Mail,
    savings: '20+ hrs/week',
    roi: '3x faster response',
    color: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'lead-gen',
    title: 'AI Lead Generation',
    tagline: 'Fresh leads every morning',
    description: 'Daily distressed seller & qualified buyer lists from public records. Delivered to your inbox by 9 AM.',
    icon: Users,
    savings: '15+ hrs/week',
    roi: '300-600 leads/day',
    color: 'from-purple-600 to-pink-500',
  },
  {
    id: 'crm-automation',
    title: 'Smart CRM Pipeline',
    tagline: 'Never drop a deal again',
    description: 'Automated deal matching, pipeline tracking, predictive analytics. Connect sellers to buyers instantly.',
    icon: BarChart3,
    savings: '10+ hrs/week',
    roi: '25% more closed deals',
    color: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'chatbot',
    title: 'AI Customer Support Bot',
    tagline: '24/7 answering, zero overhead',
    description: 'Website chatbot that answers questions, books showings, screens tenants, and qualifies leads around the clock.',
    icon: Bot,
    savings: '30+ hrs/week',
    roi: '40% lower costs',
    color: 'from-amber-600 to-orange-500',
  },
  {
    id: 'content-factory',
    title: 'AI Content Factory',
    tagline: 'Viral videos, auto-published',
    description: 'Autonomous video clipping engine. Finds viral moments, adds captions, publishes to YouTube, TikTok, Instagram, LinkedIn.',
    icon: Smartphone,
    savings: '25+ hrs/week',
    roi: '10x content output',
    color: 'from-rose-600 to-red-500',
  },
  {
    id: 'deal-analysis',
    title: 'AI Deal Analysis',
    tagline: 'Underwrite in seconds, not hours',
    description: 'Automated deal analysis with ARV, repair costs, ROI projections. Make smarter offers faster than your competition.',
    icon: TrendingUp,
    savings: '8+ hrs/week',
    roi: '2x deal velocity',
    color: 'from-indigo-600 to-violet-500',
  },
];

const TESTIMONIALS = [
  {
    quote: "The AI email automation alone saved our team 20 hours a week. Lead response time went from hours to seconds.",
    author: 'Michael T.',
    role: 'Owner, PipHouse LLC',
  },
  {
    quote: "We went from manual data entry to fully automated lead scoring. Our pipeline grew 40% in the first month.",
    author: 'Sarah K.',
    role: 'Operations, Turner & Partners',
  },
  {
    quote: "The AI chatbot handles 80% of our tenant inquiries. We cut our property management admin in half.",
    author: 'David R.',
    role: 'CEO, Homeward Property Management',
  },
];

const FAQS = [
  { q: 'How fast can I get started?', a: 'Most clients are up and running within 48 hours. We handle the setup, integration, and training.' },
  { q: 'Do I need technical skills?', a: 'Zero coding required. We build and manage everything. You just use the results.' },
  { q: 'What payment methods do you accept?', a: 'Bank transfer, cash, and crypto. Card payments coming soon via Stripe. We can invoice you.' },
  { q: 'Can I pay monthly?', a: 'Yes — all plans are monthly. No long-term contracts. Cancel anytime.' },
  { q: 'What if I\'m not satisfied?', a: 'First week free + 30-day money-back guarantee. No risk.' },
  { q: 'Can you work with my existing tools?', a: 'We integrate with virtually any CRM, email provider, and platform you already use.' },
];

function DemoVideo({ productId, title }) {
  const src = `/demos/demo_${productId}.mp4`;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/10">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500 gap-2">
          <Play size={32} className="opacity-30" />
          <span className="text-xs">{title}</span>
        </div>
      ) : (
        <video
          src={src}
          className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
          onLoadedData={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
          controls
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
}

function ProductCard({ product, index }) {
  const Icon = product.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="group bg-[#111125]/80 border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-all duration-300"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${product.color} p-2 mb-3`}>
        <Icon className="w-full h-full text-white" />
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{product.title}</h3>
      <p className="text-xs text-purple-300 mb-2">{product.tagline}</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">{product.description}</p>
      <div className="flex gap-2 text-[10px]">
        <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">{product.savings}</span>
        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{product.roi}</span>
      </div>
    </motion.div>
  );
}

export default function DemoLandingPage() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function handleBuy(plan) {
    setBuying(plan.id);
    try {
      const { error } = await supabase.from('client_orders').insert({
        customer_name: '',
        customer_email: plan.email || 'walkin@demo.com',
        company: plan.company || '',
        plan: plan.id,
        amount: plan.price,
        currency: 'USD',
        status: 'pending',
        payment_method: 'bank_transfer',
        notes: `Order from demo page - ${plan.name}`,
      });
      if (error) throw error;
      window.open(`mailto:abdelshafyclapps@gmail.com?subject=I%20want%20${encodeURIComponent(plan.name)}%20-%20$${plan.price}${plan.unit}&body=Hi%20Mohammed%2C%0A%0AI%20want%20to%20sign%20up%20for%20${encodeURIComponent(plan.name)}%20at%20$${plan.price}${plan.unit}.%0A%0APlease%20send%20payment%20instructions.%0A%0AThanks%2C%0A${encodeURIComponent(plan.company || '[Your Company]')}`, '_blank');
    } catch (err) {
      console.error('Order error:', err);
    }
    setBuying(null);
  }

  async function handleSubscribe(e) {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      const { error: queueError } = await supabase.functions.invoke('add-to-email-queue', {
        body: {
          recipient_email: email,
          subject: `Welcome to MBM AI — Your personalized demo is ready`,
          body: `Hi${name ? ' ' + name : ' there'},

Thanks for your interest in MBM AI Automation${company ? ', ' + company : ''}!

Here's what you get:
• Personalized demo walkthrough video
• Custom ROI analysis for your business
• Free 30-day trial of your chosen AI solution

Book your onboarding call:
https://calendly.com/dawrix/demo

Best,
Mohammed Abdelshafy
+201040404118
abdelshafyclapps@gmail.com`,
        },
      });
      if (queueError) throw queueError;

      const { error: insertError } = await supabase
        .from('email_queue')
        .insert({
          recipient_email: email,
          subject: `Welcome to MBM AI — Your personalized demo is ready`,
          body: `New lead captured from Demo Landing Page`,
          status: 'qued',
        });
      if (insertError) console.error('queue insert error:', insertError);

      setSubscribed(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-purple-400" size={18} />
            <span className="font-bold text-sm">MBM <span className="text-purple-400">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs text-gray-400">
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Results</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#get-started" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
              Buy Now
            </a>
          </div>
          <button className="md:hidden text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 overflow-hidden"
            >
              <div className="px-4 py-3 space-y-3">
                <a href="#products" onClick={() => setMenuOpen(false)} className="block text-xs text-gray-300 hover:text-white">Products</a>
                <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-xs text-gray-300 hover:text-white">Pricing</a>
                <a href="#demo" onClick={() => setMenuOpen(false)} className="block text-xs text-gray-300 hover:text-white">Demo</a>
                <a href="#testimonials" onClick={() => setMenuOpen(false)} className="block text-xs text-gray-300 hover:text-white">Results</a>
                <a href="#faq" onClick={() => setMenuOpen(false)} className="block text-xs text-gray-300 hover:text-white">FAQ</a>
                <a href="#get-started" onClick={() => setMenuOpen(false)} className="block text-center bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-medium">Buy Now</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 md:pt-32 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 mb-6">
              <Star size={10} className="text-purple-400" />
              <span className="text-[10px] text-purple-300 font-medium">AI-Powered Automation for Real Estate</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              Cut Your Operations
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> Time by 60%</span>
            </h1>
            <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Stop wasting hours on manual data entry, email follow-ups, and lead qualification.
              MBM AI automates your entire operations pipeline — from lead gen to deal close.
              First week free. Setup in 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#get-started" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2">
                See the Demo <ChevronRight size={16} />
              </a>
              <a href="#products" className="border border-white/10 hover:border-white/20 text-gray-300 px-6 py-2.5 rounded-xl text-sm font-medium transition-all">
                Explore Products
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-400" /> 48hr Setup</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-400" /> No Coding</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-400" /> 30-Day Guarantee</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-[#111125]/50">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: '60%', label: 'Cost Reduction', color: 'text-green-400' },
              { value: '3x', label: 'Lead Response', color: 'text-blue-400' },
              { value: '40%', label: 'More Closed Deals', color: 'text-purple-400' },
              { value: '48hr', label: 'Setup Time', color: 'text-amber-400' },
            ].map((stat, i) => (
              <div key={i}>
                <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="max-w-5xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-xl md:text-3xl font-bold mb-3">Everything You Need to Scale</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Six integrated AI solutions that work together to automate your entire real estate operations.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      {/* Demo Videos */}
      <section id="demo" className="bg-[#111125]/50 border-y border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-xl md:text-3xl font-bold mb-3">See It in Action</h2>
            <p className="text-sm text-gray-400">Watch short demos of each AI product</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
              <div key={product.id} className="space-y-2">
                <DemoVideo productId={product.id} title={product.title} />
                <p className="text-xs text-gray-400 font-medium">{product.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-5xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-xl md:text-3xl font-bold mb-3">Real Results from Real Clients</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111125]/80 border border-white/5 rounded-xl p-5"
            >
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={12} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">"{t.quote}"</p>
              <div>
                <p className="text-xs font-medium text-white">{t.author}</p>
                <p className="text-[10px] text-gray-500">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-xl md:text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Start with a free demo. Upgrade when you're ready. No hidden fees, no long-term contracts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_PLANS.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-[#111125]/80 border rounded-2xl p-5 flex flex-col ${
                  plan.popular ? 'border-purple-500/40 ring-1 ring-purple-500/20' : 'border-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} p-2 mb-3`}>
                  <Icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-gray-400 mb-3 h-8">{plan.desc}</p>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-white">${plan.price}</span>
                  <span className="text-xs text-gray-500 ml-1">{plan.unit}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-[11px] text-gray-400">
                      <CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleBuy(plan)}
                  disabled={buying === plan.id}
                  className={`w-full py-2 rounded-xl text-xs font-medium transition-all ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'border border-white/10 hover:border-white/20 text-gray-300'
                  } disabled:opacity-50`}
                >
                  {buying === plan.id ? 'Processing...' : plan.id === 'lead_pack' ? 'Buy Now' : 'Start Free Trial'}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-600">
            All plans include free setup · 30-day money-back guarantee · Cancel anytime
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Need a custom plan? <a href="mailto:abdelshafyclapps@gmail.com" className="text-purple-400 hover:text-purple-300">Contact us</a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#111125]/50 border-y border-white/5 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-xl md:text-3xl font-bold mb-3">Frequently Asked</h2>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="bg-[#0a0a1a] border border-white/5 rounded-xl overflow-hidden group">
                <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors flex items-center justify-between list-none">
                  {faq.q}
                  <ChevronRight size={14} className="text-gray-600 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-3 text-xs text-gray-500 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Email Capture */}
      <section id="get-started" className="max-w-3xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-2xl p-6 md:p-8 text-center"
        >
          {subscribed ? (
            <div>
              <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">You're In! 🚀</h3>
              <p className="text-sm text-gray-400 mb-4">
                Check your inbox for your personalized demo link and ROI analysis.
                We'll be in touch within 24 hours.
              </p>
              <a
                href="#products"
                className="inline-flex items-center gap-1.5 text-purple-400 text-sm hover:text-purple-300"
              >
                Browse products <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-bold mb-2">See What MBM AI Can Do for You</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                Get a personalized demo with custom ROI analysis for your business. Free, no obligation.
              </p>

              <form onSubmit={handleSubscribe} className="max-w-sm mx-auto space-y-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  required
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Get My Free Demo
                </button>
                <p className="text-[10px] text-gray-600">No spam. Unsubscribe anytime. First week free.</p>
              </form>
            </>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            <span className="text-xs text-gray-500">MBM AI — Powered by Dawrix</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <a href="mailto:abdelshafyclapps@gmail.com" className="hover:text-gray-400">abdelshafyclapps@gmail.com</a>
            <span>+201040404118</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
