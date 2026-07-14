import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  onClose: () => void;
}

const SECTIONS: { id: string; label: string; body: string }[] = [
  {
    id: 'terms',
    label: 'Terms of Service',
    body: 'DRAFT PLACEHOLDER - this is not real legal text. Before launch, replace this with Terms of Service reviewed by qualified legal counsel, covering at minimum: order/cancellation rights, liability limits, dispute resolution, and acceptable use of the app.'
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    body: 'DRAFT PLACEHOLDER - this is not real legal text. Before launch, replace this with a UK GDPR-compliant Privacy Policy covering: what customer data is collected (name, address, order history, payment metadata), how it is stored and processed, third parties it is shared with (payment processor, delivery partners), retention periods, and how customers can exercise their data-subject rights.'
  },
  {
    id: 'refunds',
    label: 'Refund Policy',
    body: 'DRAFT PLACEHOLDER - this is not real legal text. Before launch, replace this with a Refund/Cancellation Policy covering: the cancellation window before a restaurant accepts an order, missing/incorrect item claims, late delivery compensation, and how refunds are issued back to the original payment method.'
  }
];

export default function LegalModal({ onClose }: LegalModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);
  const active = SECTIONS.find(s => s.id === activeTab) || SECTIONS[0];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-[60]">
      <div className="w-full bg-white rounded-t-2xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-200 text-xs">
        <div className="p-3.5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <h4 className="font-black text-sm text-slate-900">Legal</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 p-3 border-b border-slate-100 flex-shrink-0">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                activeTab === section.id ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-[10px] font-semibold">
            This content is a placeholder and has not been reviewed by a lawyer. Do not launch publicly until real Terms/Privacy/Refund content has been drafted and approved.
          </div>
          <p className="text-slate-600 leading-relaxed">{active.body}</p>
        </div>
      </div>
    </div>
  );
}
