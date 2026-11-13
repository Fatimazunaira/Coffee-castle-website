// Fixed choices used by the admin form and the customer popup.
// Prices are in Rs. Later these can also come from the database.

export const CATEGORIES = ["Hot Coffee", "Cold Drinks", "Tea", "Bakery", "Snacks"];

// Shown in the popup only for items the admin marks as a drink.
export const DRINK_OPTIONS = {
  sizes: [
    { id: "small", name: "Small", price: -50 },
    { id: "regular", name: "Regular", price: 0 },
    { id: "large", name: "Large", price: 80 },
  ],
  milks: [
    { id: "whole", name: "Whole milk", price: 0 },
    { id: "skim", name: "Skim milk", price: 0 },
    { id: "oat", name: "Oat milk", price: 100 },
    { id: "almond", name: "Almond milk", price: 100 },
  ],
  shotPrice: 100,
  maxShots: 3,
  sugar: [
    { id: "none", name: "No sugar" },
    { id: "low", name: "Low" },
    { id: "normal", name: "Normal" },
    { id: "high", name: "Extra sweet" },
  ],
  addons: [
    { id: "whip", name: "Whipped cream", price: 60 },
    { id: "caramel", name: "Caramel syrup", price: 70 },
    { id: "vanilla", name: "Vanilla syrup", price: 70 },
    { id: "hazelnut", name: "Hazelnut syrup", price: 70 },
  ],
};
