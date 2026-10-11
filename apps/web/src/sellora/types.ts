export type Field = {
  id?: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: unknown;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  productCategory: string;
  businessModel: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  brandColor: string;
  sellingMode: "CATALOG_ONLY" | "ONLINE_PAYMENTS";
  paymentGatewayProvider?: string | null;
  paymentGatewayStatus: "NOT_CONNECTED" | "PENDING" | "ACTIVE" | "DISABLED";
  catalogueFields: Field[];
};

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price?: string | number | null;
  currency: string;
  unit: string;
  imageUrl?: string | null;
  fields: Record<string, string | number | boolean | string[]>;
};

export type Catalogue = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isPublished: boolean;
  items: { product: Product }[];
};

export type PublicData = {
  title: string;
  description?: string | null;
  slug: string;
  business: {
    name: string;
    industry: string;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    brandColor: string;
    email?: string | null;
    logoUrl?: string | null;
    sellingMode: "CATALOG_ONLY" | "ONLINE_PAYMENTS";
    paymentGatewayStatus?: string | null;
  };
  products: Product[];
  checkoutReady?: boolean;
};
