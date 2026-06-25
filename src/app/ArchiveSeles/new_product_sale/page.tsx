'use client';

import ProductPurchaseForm from '@/components/club/products/ProductPurchaseForm';
import { getProcedureDefinition } from '@/lib/procedures/registry';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function NewProductSalePage() {
  const def = getProcedureDefinition(PROCEDURE_TYPE_CODES.PRODUCT_SALE)!;
  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-teal-800 text-white px-6 py-4">
        <h1 className="text-xl font-semibold">{def.form.title}</h1>
        <p className="text-sm text-teal-100 mt-1">{def.form.subtitle}</p>
      </div>
      <ProductPurchaseForm />
    </div>
  );
}
