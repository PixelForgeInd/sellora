import type { Field } from "./types";

export const categories = [
  ["yarn-textiles", "Yarn & Textiles", "Textiles"],
  ["clothing", "Clothing & Apparel", "Fashion"],
  ["furniture", "Furniture", "Furniture"],
  ["electronics", "Electronics", "Electronics"],
  ["food-beverage", "Food & Beverage", "Food & Beverage"],
  ["beauty-personal-care", "Beauty & Personal Care", "Beauty & Personal Care"],
  ["automotive", "Automotive & Parts", "Automotive"],
  ["healthcare", "Healthcare & Medical", "Healthcare"],
  ["building-materials", "Building Materials", "Construction"],
  ["agriculture", "Agriculture", "Agriculture"],
  ["other", "Other products", "General"],
] as const;

export const fallbackFields: Record<string, Field[]> = {
  "yarn-textiles": [
    { key: "count", label: "Yarn count", type: "select", required: true, options: ["10s", "18s", "20s OE", "2/20s", "24s", "2/40s"] },
    { key: "yarnType", label: "Yarn type", type: "select", required: true, options: ["Recycled OE", "Kora CP", "Modal", "Excel", "Cotton", "Polyester"] },
    { key: "shade", label: "Shade / colour", type: "text", required: false },
    { key: "composition", label: "Composition", type: "text", required: false },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number", required: false },
  ],
  clothing: [
    { key: "size", label: "Sizes available", type: "text", required: false },
    { key: "colour", label: "Colour", type: "text", required: false },
    { key: "material", label: "Material / fabric", type: "text", required: false },
    { key: "collection", label: "Collection", type: "select", required: false, options: ["Men", "Women", "Unisex", "Kids"] },
  ],
  furniture: [
    { key: "material", label: "Material", type: "text", required: true },
    { key: "dimensions", label: "Dimensions", type: "text", required: false },
    { key: "finish", label: "Finish", type: "text", required: false },
  ],
  electronics: [
    { key: "brand", label: "Brand", type: "text", required: false },
    { key: "model", label: "Model number", type: "text", required: true },
    { key: "warranty", label: "Warranty", type: "text", required: false },
    { key: "specifications", label: "Specifications", type: "textarea", required: false },
  ],
  other: [
    { key: "material", label: "Material", type: "text", required: false },
    { key: "colour", label: "Colour", type: "text", required: false },
    { key: "size", label: "Size / dimensions", type: "text", required: false },
  ],
};

fallbackFields["food-beverage"] = [
  { key: "ingredients", label: "Ingredients / composition", type: "textarea", required: true },
  { key: "netWeight", label: "Net weight / volume", type: "text", required: true },
  { key: "shelfLife", label: "Shelf life", type: "text" },
  { key: "dietary", label: "Dietary information", type: "multiselect", required: false, options: ["Vegetarian", "Vegan", "Gluten-free", "Sugar-free"] },
  { key: "storage", label: "Storage instructions", type: "text" },
];
fallbackFields["beauty-personal-care"] = [
  { key: "skinType", label: "Suitable skin / hair type", type: "text" },
  { key: "ingredients", label: "Ingredients", type: "textarea", required: true },
  { key: "netVolume", label: "Net volume / weight", type: "text" },
  { key: "fragrance", label: "Fragrance", type: "text" },
  { key: "expiry", label: "Shelf life / expiry", type: "text" },
];
fallbackFields.automotive = [
  { key: "makeModel", label: "Compatible make / model", type: "text", required: true },
  { key: "partNumber", label: "Part number", type: "text" },
  { key: "material", label: "Material", type: "text" },
  { key: "warranty", label: "Warranty", type: "text" },
  { key: "condition", label: "Condition", type: "select", options: ["New", "Refurbished", "Used"] },
];
fallbackFields.healthcare = [
  { key: "manufacturer", label: "Manufacturer", type: "text", required: true },
  { key: "model", label: "Model / reference", type: "text" },
  { key: "specifications", label: "Specifications", type: "textarea" },
  { key: "warranty", label: "Warranty", type: "text" },
  { key: "certification", label: "Certification / compliance", type: "text" },
];
fallbackFields["building-materials"] = [
  { key: "material", label: "Material / grade", type: "text", required: true },
  { key: "dimensions", label: "Dimensions", type: "text" },
  { key: "finish", label: "Finish", type: "text" },
  { key: "unit", label: "Selling unit", type: "select", options: ["piece", "bag", "kg", "tonne", "sq ft"] },
  { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" },
];
fallbackFields.agriculture = [
  { key: "variety", label: "Variety / crop", type: "text", required: true },
  { key: "grade", label: "Grade / quality", type: "text" },
  { key: "origin", label: "Origin", type: "text" },
  { key: "packaging", label: "Packaging", type: "text" },
  { key: "season", label: "Season / harvest", type: "text" },
];
