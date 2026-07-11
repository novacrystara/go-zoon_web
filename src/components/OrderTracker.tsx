import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, Phone, MapPin, Navigation, ShoppingBag, RotateCcw, HelpCircle } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderTrackerProps {
  order: Order;
  onReset: () => void;
  onUpdateStatus?: (status: OrderStatus) => void;
}

export default function OrderTracker({ order, onReset, onUpdateStatus }: OrderTrackerProps): React.JSX.Element {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [eta, setEta] = useState(25);
  const [riderProgress, setRiderProgress] = useState(0); // 0 to 100% path completion
  const animationRef = useRef<number | null>(null);

  // Sync with prop order.status in case it gets changed externally (from the merchant portal)
  useEffect(() => {
    setStatus(order.status);
  }, [order.status]);

  // Simulating the order lifecycle (Order Placed -> Preparing -> Out for Delivery -> Delivered)
  useEffect(() => {
    if (status === 'Delivered' || status === 'Cancelled') {
      setRiderProgress(100);
      return;
    }

    let intervalTime = 8000; // Speed up the simulation for immediate feedback
    const statusCycle: OrderStatus[] = ['Placed', 'Preparing', 'OutForDelivery', 'Delivered'];
    const currentIndex = statusCycle.indexOf(status);

    if (currentIndex !== -1 && currentIndex < statusCycle.length - 1) {
      const timer = setTimeout(() => {
        const nextStatus = statusCycle[currentIndex + 1];
        setStatus(nextStatus);
        if (onUpdateStatus) {
          onUpdateStatus(nextStatus);
        }
      }, intervalTime);

      return () => clearTimeout(timer);
    }
  }, [status, onUpdateStatus]);

  // Smoothly animate rider position along the custom SVG map path when status is 'OutForDelivery'
  useEffect(() => {
    if (status === 'OutForDelivery') {
      const duration = 20000; // 20 seconds to travel on map
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setRiderProgress(progress);

        if (progress < 100) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setStatus('Delivered');
          if (onUpdateStatus) {
            onUpdateStatus('Delivered');
          }
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } else if (status === 'Delivered') {
      setRiderProgress(100);
    } else {
      setRiderProgress(0);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, onUpdateStatus]);

  // Dynamic ETA countdown
  useEffect(() => {
    if (status === 'Delivered') {
      setEta(0);
      return;
    }
    const interval = setInterval(() => {
      setEta(prev => (prev > 1 ? prev - 1 : 1));
    }, 15000); // countdown every 15 seconds

    return () => clearInterval(interval);
  }, [status]);

  // SVG Map calculation helper: get point along a cubic bezier curve to animate the rider
  const getPointAtLength = (t: number) => {
    const p0 = { x: 90, y: 220 };
    const cp1 = { x: 190, y: 150 };
    const cp2 = { x: 260, y: 240 };
    const p3 = { x: 390, y: 80 };

    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * p3.y;

    return { x, y };
  };

  const riderCoords = getPointAtLength(riderProgress / 100);

  // Status visual configurations
  const getStatusStepClass = (stepIndex: number) => {
    const statusCycle: OrderStatus[] = ['Placed', 'Preparing', 'OutForDelivery', 'Delivered'];
    const currentStepIndex = statusCycle.indexOf(status);

    if (currentStepIndex >= stepIndex) {
      return 'bg-brand-blue text-white border-brand-blue';
    }
    return 'bg-gray-100 text-gray-400 border-gray-200';
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'Placed': return 'Awaiting acceptance from Go-Zoon kitchen...';
      case 'Preparing': return 'Our chefs are crafting your food fresh...';
      case 'OutForDelivery': return `${order.driverName || 'Rider'} is weaving through streets with your food!`;
      case 'Delivered': return 'Arrived! Enjoy your delicious meal!';
      default: return 'Processing your order...';
    }
  };

  const getRiderInitials = () => {
    const name = order.driverName || 'Dave Henderson';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="order-tracker-view">
      
      {/* Top Card: Live status and ETA */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full border border-brand-blue/5">
            Live Tracker
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-3 font-display">
            {status === 'Delivered' ? 'Delivered!' : `Arriving in ${eta} mins`}
          </h2>
          <p className="text-sm font-semibold text-brand-orange mt-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-brand-orange rounded-full inline-block animate-ping"></span>
            <span>{getStatusMessage()}</span>
          </p>
        </div>

        {/* Action button */}
        <div className="flex gap-2 self-stretch sm:self-auto">
          <button
            onClick={onReset}
            className="flex-1 sm:flex-initial h-12 px-6 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Order Something Else</span>
          </button>
        </div>
      </div>

      {/* Progress Stepper bar */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
        <div className="relative flex justify-between items-center max-w-2xl mx-auto">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-gray-100 -z-0"></div>
          {/* Active Status Line */}
          <div
            className="absolute top-4 left-4 h-1 bg-brand-blue transition-all duration-500 -z-0"
            style={{
              width: `${
                status === 'Placed' ? '0%' :
                status === 'Preparing' ? '33.3%' :
                status === 'OutForDelivery' ? '66.6%' : '100%'
              }`
            }}
          ></div>

          {/* Step Nodes */}
          {[
            { label: 'Placed', info: 'Ordered' },
            { label: 'Preparing', info: 'Kitchen' },
            { label: 'OutForDelivery', info: 'On the way' },
            { label: 'Delivered', info: 'Enjoy' }
          ].map((step, idx) => (
            <div key={step.label} className="relative z-10 flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-extrabold text-xs transition-colors duration-500 ${getStatusStepClass(idx)}`}>
                {idx + 1}
              </div>
              <span className="text-[10px] font-extrabold text-neutral-900 mt-2 uppercase tracking-wide">{step.info}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map and Courier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Interactive SVG London Street Map (2 Columns) */}
        <div className="lg:col-span-2 bg-neutral-900 rounded-2xl border border-neutral-800 p-4 h-80 sm:h-96 overflow-hidden relative shadow-inner">
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-[10px] text-neutral-300 font-mono z-10 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-brand-orange rounded-full animate-ping"></span>
            <span>SIMULATED LONDON FEED • ZONE 1</span>
          </div>

          {/* SVG Map Canvas */}
          <svg className="w-full h-full text-neutral-700 font-sans" viewBox="0 0 500 300">
            {/* Grid Pattern Background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Simulated River Thames at bottom */}
            <path d="M 0,280 C 150,290 280,260 500,290 L 500,300 L 0,300 Z" fill="#1e293b" opacity="0.3" />

            {/* Street Lines / Paths */}
            <g stroke="#334155" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
              {/* Oxford St */}
              <line x1="20" y1="120" x2="480" y2="120" />
              {/* Regent St */}
              <path d="M 240,60 L 240,120 C 240,170 120,200 120,260" fill="none" />
              {/* Shaftesbury Ave */}
              <line x1="240" y1="120" x2="390" y2="240" />
              {/* Delivery Bezier route (highlighted in orange when OutForDelivery) */}
              <path
                id="delivery-route"
                d="M 90,220 C 190,150 260,240 390,80"
                fill="none"
                stroke={status === 'OutForDelivery' ? '#ff4a14' : '#475569'}
                strokeWidth="4"
                strokeDasharray={status === 'OutForDelivery' ? '8 4' : 'none'}
                className={status === 'OutForDelivery' ? 'animate-[dash_10s_linear_infinite]' : ''}
              />
            </g>

            {/* Street Names */}
            <g fill="#94a3b8" fontSize="8" fontWeight="bold" opacity="0.6">
              <text x="50" y="112" transform="rotate(0 50 112)">OXFORD STREET</text>
              <text x="246" y="80">REGENT ST</text>
              <text x="270" y="170" transform="rotate(35 270 170)">SHAFTESBURY AVE</text>
            </g>

            {/* Restaurant Node (p0) */}
            <g transform="translate(90, 220)">
              <circle r="14" fill="#1e293b" stroke="#073db7" strokeWidth="2.5" />
              <circle r="5" fill="#073db7" />
              {status === 'Preparing' && (
                <circle r="22" fill="none" stroke="#073db7" strokeWidth="1" className="animate-ping" opacity="0.4" />
              )}
              <text x="18" y="3" fill="#073db7" fontSize="8" fontWeight="bold" stroke="#000" strokeWidth="1" paintOrder="stroke">RESTAURANT</text>
            </g>

            {/* Delivery Destination Node (p3) */}
            <g transform="translate(390, 80)">
              <circle r="14" fill="#1e293b" stroke="#ff4a14" strokeWidth="2.5" />
              <circle r="5" fill="#ff4a14" />
              {status === 'OutForDelivery' && (
                <circle r="22" fill="none" stroke="#ff4a14" strokeWidth="1" className="animate-ping" opacity="0.4" />
              )}
              <text x="18" y="3" fill="#ff4a14" fontSize="8" fontWeight="bold" stroke="#000" strokeWidth="1" paintOrder="stroke">YOU ({order.deliveryPostcode})</text>
            </g>

            {/* Animated Delivery Rider Icon */}
            {(status === 'OutForDelivery' || status === 'Delivered') && (
              <g transform={`translate(${riderCoords.x}, ${riderCoords.y})`}>
                <circle r="11" fill="#ff4a14" stroke="#fff" strokeWidth="2" className="shadow-lg" />
                <path d="M -4,-2 L 2,-4 L 4,1 L -1,3 Z" fill="#000" />
                <polygon points="0,0 8,-2 4,4" fill="#000" transform="scale(0.8) rotate(15)" />
                {status === 'OutForDelivery' && (
                  <circle r="18" fill="none" stroke="#ff4a14" strokeWidth="1" className="animate-pulse" />
                )}
              </g>
            )}
          </svg>

          {/* Map Controls / Speed indicator */}
          {status === 'OutForDelivery' && (
            <div className="absolute bottom-4 right-4 bg-black/75 px-3 py-1.5 rounded-lg border border-neutral-800 text-[10px] text-neutral-300 font-semibold flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-brand-orange animate-bounce" />
              <span>Rider traveling streets at 15 mph</span>
            </div>
          )}
        </div>

        {/* Courier Details and Order Breakdown (1 Column) */}
        <div className="space-y-6">
          
          {/* Courier Card */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
            <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-3">Your Delivery Courier</h3>
            <div className="flex items-center gap-4 mt-4">
              <div className="w-12 h-12 bg-brand-blue/5 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-black text-brand-blue border border-brand-blue/20">
                {getRiderInitials()}
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">{order.driverName || 'Dave Henderson'}</h4>
                <p className="text-[11px] text-gray-400 font-semibold">Active Courier • 4.95★ (Go-Zoon fleet)</p>
              </div>
            </div>

            {/* Quick contact / actions */}
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button className="flex items-center justify-center gap-1.5 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                <Phone className="w-3.5 h-3.5 text-brand-blue" />
                <span>Call Courier</span>
              </button>
              <button className="flex items-center justify-center gap-1.5 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                <span>Help Center</span>
              </button>
            </div>
          </div>

          {/* Summary Order Details Card */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Order Summary</h3>
              <span className="text-[10px] font-mono text-gray-400 font-bold">#{order.id}</span>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <div className="flex gap-2">
                    <span className="font-extrabold text-brand-orange">{item.quantity}x</span>
                    <div className="font-semibold text-gray-800">
                      <div>{item.menuItem.name}</div>
                      {item.customizations.map(c => (
                        <div key={c.name} className="text-[10px] text-gray-400 font-medium">
                          {c.name}: {c.selectedOption}
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900">
                    £{((item.menuItem.price + item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0)) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Delivery Fee</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `£${order.deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Service Fee</span>
                <span>£{order.serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-neutral-900 pt-2 border-t border-gray-100">
                <span>Total Paid</span>
                <span>£{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
