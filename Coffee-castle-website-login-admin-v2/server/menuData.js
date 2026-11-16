// Sample menu data (prices in PKR). Later this will come from the database
// and be editable from the admin panel (FR-18).

const categories = [
  { id: "coffee", name: "Hot Coffee" },
  { id: "cold", name: "Cold Drinks" },
  { id: "tea", name: "Tea" },
  { id: "bakery", name: "Bakery" },
  { id: "snacks", name: "Snacks" },
];

// Customization options shared by all customizable drinks (FR-2).
const options = {
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

const items = [
  { id: 1, category: "coffee", name: "Espresso", emoji: "☕", price: 250, customizable: true, description: "A short, intense shot of our house blend." },
  { id: 2, category: "coffee", name: "Americano", emoji: "☕", price: 300, customizable: true, description: "Espresso topped up with hot water. Clean and bold." },
  { id: 3, popular: true, category: "coffee", name: "Cappuccino", emoji: "☕", price: 400, customizable: true, description: "Espresso with steamed milk and a thick foam cap." },
  { id: 4, popular: true, category: "coffee", name: "Latte", emoji: "🥛", price: 450, customizable: true, description: "Smooth espresso with plenty of steamed milk." },
  { id: 5, category: "coffee", name: "Mocha", emoji: "🍫", price: 500, customizable: true, description: "Espresso, chocolate and steamed milk." },
  { id: 6, popular: true, category: "cold", name: "Iced Latte", emoji: "🧊", price: 480, customizable: true, description: "Espresso and cold milk over ice." },
  { id: 7, category: "cold", name: "Iced Mocha", emoji: "🧊", price: 520, customizable: true, description: "Chocolate, espresso and milk over ice." },
  { id: 8, category: "cold", name: "Cold Brew", emoji: "🥤", price: 450, customizable: true, description: "Slow-steeped for 12 hours. Smooth and low in acidity." },
  { id: 9, category: "cold", name: "Caramel Frappe", emoji: "🍨", price: 580, customizable: true, description: "Blended coffee, caramel and ice with whipped cream." },
  { id: 10, popular: true, category: "tea", name: "Kashmiri Chai", emoji: "🍵", price: 300, customizable: false, description: "Pink tea with milk, finished with crushed pistachio." },
  { id: 11, category: "tea", name: "Doodh Patti", emoji: "🍵", price: 150, customizable: false, description: "Classic strong milk tea, brewed on the stove." },
  { id: 12, category: "tea", name: "Green Tea", emoji: "🍃", price: 200, customizable: false, description: "Light and fresh, served hot." },
  { id: 13, popular: true, category: "bakery", name: "Butter Croissant", emoji: "🥐", price: 280, customizable: false, description: "Flaky, golden and baked fresh each morning." },
  { id: 14, category: "bakery", name: "Chocolate Brownie", emoji: "🍫", price: 320, customizable: false, description: "Fudgy brownie with a crisp top." },
  { id: 15, category: "bakery", name: "Blueberry Muffin", emoji: "🧁", price: 300, customizable: false, description: "Soft muffin packed with blueberries." },
  { id: 16, category: "snacks", name: "Chicken Club Sandwich", emoji: "🥪", price: 650, customizable: false, description: "Grilled chicken, egg, lettuce and mayo on toasted bread." },
  { id: 17, category: "snacks", name: "Loaded Fries", emoji: "🍟", price: 450, customizable: false, description: "Crispy fries with cheese sauce and jalapeños." },
  { id: 18, category: "snacks", name: "Veggie Wrap", emoji: "🌯", price: 480, customizable: false, description: "Grilled vegetables and hummus in a toasted wrap.", soldOut: true },
].map((item) => ({ soldOut: false, ...item }));

module.exports = { categories, options, items };
