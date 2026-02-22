// Centralized Pricing Configuration
// All pricing information should come from this file to maintain consistency across the app

export interface ServicePrice {
  id: 'wash_only' | 'wash_and_dry' | 'dry_only';
  label: string;
  price: number; // Price per load in GHS (₵)
  unit: string;
  description: string;
  features: string[];
  tokens: number;
  featured?: boolean;
}

export const PRICING_CONFIG = {
  // Load weight configuration
  KG_PER_LOAD: 8, // 1 load = 8kg
  OVERFLOW_ALLOWED: 2, // +1-2kg still counts as same load (9-10kg = 1 load)
  
  // Service prices per load
  services: [
    {
      id: 'wash_only',
      label: 'Wash Only',
      price: 25,
      unit: '/load',
      description: 'Professional washing with premium detergents',
      features: ['Quality detergent', 'Color separation', 'Gentle care'],
      tokens: 1,
    },
    {
      id: 'wash_and_dry',
      label: 'Wash & Dry',
      price: 50,
      unit: '/load',
      description: 'Complete service including washing, drying, and folding',
      features: ['Everything in Wash', 'Tumble drying', 'Neatly folded'],
      tokens: 2,
      featured: true,
    },
    {
      id: 'dry_only',
      label: 'Dry Only',
      price: 25,
      unit: '/load',
      description: 'Quick and efficient drying service',
      features: ['Quick dry', 'All fabrics', 'Ready to wear'],
      tokens: 1,
    },
  ] as ServicePrice[],

  // Delivery fees
  deliveryFee: 5, // ₵5 for delivery

  // Tax rate
  taxRate: 0.08, // 8%

  // Service fee
  serviceFee: 1.50, // ₵1.50

  // Loyalty program
  loyalty: {
    washesForFreeWash: 10, // 10 washes = 1 free wash
  },
};

// Helper function to get service by ID
export const getServiceById = (id: string): ServicePrice | undefined => {
  return PRICING_CONFIG.services.find(s => s.id === id);
};

// Helper function to calculate loads from weight
export const calculateLoads = (weight: number): number => {
  const effectiveWeight = weight <= PRICING_CONFIG.KG_PER_LOAD + PRICING_CONFIG.OVERFLOW_ALLOWED 
    ? PRICING_CONFIG.KG_PER_LOAD 
    : weight;
  return Math.ceil(effectiveWeight / PRICING_CONFIG.KG_PER_LOAD);
};

// Helper function to calculate total price
export const calculateTotalPrice = (
  serviceId: string,
  weight: number,
  includeDelivery: boolean = false
): {
  subtotal: number;
  tax: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  loads: number;
} => {
  const service = getServiceById(serviceId);
  const loads = calculateLoads(weight);
  const basePrice = (service?.price || 50) * loads;
  const deliveryFee = includeDelivery ? PRICING_CONFIG.deliveryFee : 0;
  const subtotal = basePrice;
  const tax = subtotal * PRICING_CONFIG.taxRate;
  const serviceFee = PRICING_CONFIG.serviceFee;
  
  return {
    subtotal,
    tax,
    serviceFee,
    deliveryFee,
    total: subtotal + tax + serviceFee + deliveryFee,
    loads,
  };
};

export default PRICING_CONFIG;

