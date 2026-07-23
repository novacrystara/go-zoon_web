import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  onClose: () => void;
}

const SECTIONS: { id: string; label: string; body: string }[] = [
  {
    id: 'terms',
    label: 'Terms of Service',
    body: `1. Acceptance of Terms
By creating a Go-Zoon account or placing an order, you agree to these Terms of Service and to our Privacy and Refund Policies.

2. What Go-Zoon Is
Go-Zoon is a marketplace connecting you with independent restaurants ("Merchants") and delivery partners ("Couriers"). Merchants are responsible for the food they prepare; Couriers are responsible for the delivery journey. Go-Zoon facilitates ordering, payment, and delivery coordination between the three.

3. Placing an Order
An order is only confirmed once a Merchant accepts it - Go-Zoon does not guarantee that any Merchant will accept a given order. You may cancel an order free of charge at any point before the Merchant accepts it, from the order tracking screen. Once accepted, cancellation is at the Merchant's discretion, and cancellation may not be possible once preparation has begun.

4. Pricing and Fees
Menu prices are set by each Merchant. Go-Zoon adds a delivery fee (set by the Merchant, adjusted by delivery zone) and a platform service fee to help cover payment processing, courier dispatch, and platform operating costs. All applicable fees are itemised in your basket before you pay.

5. Account Responsibilities
You are responsible for keeping your account (phone number and any saved payment/address details) secure, and for the accuracy of the delivery address and instructions you provide. Go-Zoon is not liable for delivery issues caused by an incorrect or incomplete address.

6. Acceptable Use
You agree not to misuse the platform - this includes submitting fraudulent orders, abusing promo codes outside their stated terms, or harassing Merchants or Couriers.

7. Liability
Go-Zoon facilitates the transaction but does not prepare your food. Food quality, allergen accuracy, and order accuracy are the responsibility of the Merchant; Go-Zoon will assist in resolving disputes but liability for food-related issues rests with the Merchant. To the extent permitted by law, Go-Zoon's liability for platform-related issues is limited to the value of the order in question.

8. Changes to These Terms
We may update these Terms from time to time. Continued use of Go-Zoon after an update constitutes acceptance of the revised Terms.

9. Governing Law
These Terms are governed by the laws of England and Wales.`
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    body: `1. Who We Are
Go-Zoon UK Limited ("Go-Zoon", "we", "us") operates the Go-Zoon food ordering and delivery platform.

2. What We Collect
- Account data: your phone number and, if you provide it, your name.
- Order data: your order history, delivery address, order instructions, and basket contents.
- Location data: the postcode/delivery zone you select, used to calculate delivery fees and times.
- Payment metadata: card details are handled directly by our payment processor (Stripe) - Go-Zoon does not store full card numbers, only a confirmation that payment succeeded.
- Reviews: any rating or comment you submit about a Merchant or Courier.
- Device/technical data: basic diagnostic information (app version, error logs) used to keep the service reliable.

3. How We Use Your Data
We use your data to: process and deliver your orders; communicate order status updates (if you have Order Update notifications enabled); calculate delivery fees and estimated times for your area; resolve support queries and disputes; and, where you've opted in, send you promotional offers.

4. Who We Share It With
- The Merchant preparing your order (name, order contents, delivery address).
- The Courier delivering your order (name, delivery address, contact number).
- Our payment processor, to process your payment securely.
- We do not sell your personal data to third parties.

5. Data Retention
We retain order records for as long as needed for accounting, tax, and dispute-resolution purposes, and account data for as long as your account remains active. You can request deletion of your account data at any time (see Section 7).

6. Your Rights (UK GDPR)
You have the right to access, correct, or request deletion of your personal data, to object to or restrict certain processing, and to withdraw marketing consent at any time via Notification Settings in your account. To exercise these rights, contact us using the details on our support page.

7. Contact
For any privacy questions or data requests, contact our support team through the app's Help section.

8. Changes to This Policy
We may update this Privacy Policy as the service evolves. Material changes will be reflected here with an updated effective date.`
  },
  {
    id: 'refunds',
    label: 'Refund & Cancellation Policy',
    body: `1. Cancelling Before Acceptance
You can cancel any order free of charge, with a full refund, at any time before the Merchant accepts it. Use the "Cancel Order" button on the live tracking screen.

2. Cancelling After Acceptance
Once a Merchant has accepted your order, preparation may already be underway. Cancellations at this stage are handled case-by-case through support and are not guaranteed, since the Merchant may have already incurred the cost of your ingredients.

3. Missing or Incorrect Items
If an item is missing or incorrect, contact support within 24 hours of delivery with your order number. We will work with the Merchant to issue a partial refund or credit for the affected item(s).

4. Food Quality Issues
If food arrives in an unacceptable condition (e.g. spilled, cold when it shouldn't be, or not matching the description), report it with your order number within 24 hours. We will review the report with the Merchant and, where warranted, issue a partial or full refund.

5. Late Delivery
If your order arrives significantly later than the estimated delivery window shown at checkout, contact support - we assess these on a case-by-case basis and may offer a delivery fee refund or credit.

6. How Refunds Are Issued
Approved refunds are returned to the original payment method used at checkout. Processing times depend on your card issuer, typically 3-5 business days.

7. Promo Codes
Discounts applied via promo code are not refundable as cash if an order is later cancelled or partially refunded - the discount is simply removed from the recalculated total.`
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
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{active.body}</p>
          <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-100 mt-3">
            Last updated: effective from your first order. Contact support through the app's Help section with any questions about these policies.
          </p>
        </div>
      </div>
    </div>
  );
}
