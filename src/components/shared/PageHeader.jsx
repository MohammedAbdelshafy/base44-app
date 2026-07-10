import React from 'react';
import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-navy/10 relative"
    >
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-navy via-cyan to-transparent w-full opacity-50" />
      <div>
        <h1 className="text-3xl font-extrabold text-navy tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </motion.div>
  );
}