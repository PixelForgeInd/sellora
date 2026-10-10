import { z } from "zod";

// Default product fields shown when a business creates a catalogue.
export const catalogueFieldTemplates: Record<string, Array<{ key: string; label: string; type: string; required?: boolean; options?: string[] }>> = {
  "yarn-textiles": [
    { key: "count", label: "Yarn count", type: "select", required: true, options: ["10s", "18s", "20s OE", "2/20s", "24s", "2/40s"] },
    { key: "yarnType", label: "Yarn type", type: "select", required: true, options: ["Recycled OE", "Kora CP", "Modal", "Excel", "Cotton", "Polyester"] },
    { key: "shade", label: "Shade / colour", type: "text" },
    { key: "unit", label: "Selling unit", type: "select", required: true, options: ["kg", "cone", "bag"] },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" }
  ],
  clothing: [
    { key: "size", label: "Size", type: "multiselect", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "colour", label: "Colour", type: "text" },
    { key: "material", label: "Material / fabric", type: "text" },
    { key: "gender", label: "Collection", type: "select", options: ["Men", "Women", "Unisex", "Kids"] },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" }
  ],
  furniture: [
    { key: "material", label: "Material", type: "text", required: true },
    { key: "dimensions", label: "Dimensions", type: "text" },
    { key: "finish", label: "Finish", type: "text" },
    { key: "assemblyRequired", label: "Assembly required", type: "boolean" },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" }
  ],
  electronics: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "model", label: "Model number", type: "text", required: true },
    { key: "warranty", label: "Warranty", type: "text" },
    { key: "specifications", label: "Specifications", type: "textarea" },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" }
  ],
  other: [
    { key: "material", label: "Material", type: "text" },
    { key: "colour", label: "Colour", type: "text" },
    { key: "size", label: "Size / dimensions", type: "text" },
    { key: "unit", label: "Selling unit", type: "text" },
    { key: "minOrderQuantity", label: "Minimum order quantity", type: "number" }
  ]
};

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  industry: z.string().trim().min(2).max(100),
  productCategory: z.enum(["yarn-textiles", "clothing", "furniture", "electronics", "other"]),
  businessModel: z.enum(["B2B", "B2C", "B2B2C"]),
  email: z.union([z.string().trim().email().max(160), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  website: z.union([z.string().trim().url().max(200), z.literal("")]).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#599c56")
});
